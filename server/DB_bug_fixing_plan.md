# DB Bug Fixing Plan

**Goal:** fix the business-logic bug surfaced in the frontend (relegated teams and non-PL players appearing in the API) by adjusting the materialized views in `server/create_views.py` and one integration-layer query in `server/integration/search.py`. Source tables (`team`, `player`, `player_season`, `player_injury`, `match`) keep all rows untouched — the filtering is layered on in the views so the API endpoints return only Premier-League-relevant rows. `mv_teams_overview` becomes the single source of truth for "which teams are in the league this season"; every player-level view and the team search endpoint consume it.

**Phasing:**
- **Phase 1** — restrict `mv_teams_overview` to current-season Premier League teams (drops relegated teams from the `/teams` endpoint) and fix `GET /search/teams` to read from `mv_teams_overview` instead of the raw `Team` table. This view also becomes the canonical league-membership reference used by all dependent views.
- **Phase 2** — restrict `mv_reported_injuries` to current-season PL players, returning their full all-time injury history. Reads `mv_teams_overview` to determine PL teams.
- **Phase 3** — propagate the same PL-team filter to `mv_high_risk_players`, `mv_trending_risk_players`, `mv_search_players`, and `mv_team_player_list` so players linked to non-PL teams are excluded from those endpoints. Each consumes `mv_teams_overview`.
- **Phase 4** — adjust view creation order in `server/create_views.py` and drop order in `server/ingest_predictions.py` to respect the new MV-on-MV dependency on `mv_teams_overview`.

---

## 1. The problem today (where the gaps are)

```
team table           ──► holds every team ever ingested (incl. relegated)
player table         ──► holds every player ever ingested (incl. transfers out, retired)
player_season table  ──► one row per player per season they appeared in
match table          ──► already constrained to this season's PL fixtures
                          (regenerated each ingest run)

mv_teams_overview        ──► JOIN team t ─ no league filter         ← shows relegated teams
mv_reported_injuries     ──► JOIN player p ─ no league filter       ← shows non-PL players
                              (filters latest player_season only — does not check league)
mv_high_risk_players     ──► JOIN team t ─ no league filter         ← shows non-PL players
mv_trending_risk_players ──► JOIN team t ─ no league filter         ← shows non-PL players
                              no active-player filter either
mv_search_players        ──► JOIN team t ─ no league filter         ← shows non-PL players
mv_team_player_list      ──► FROM player p ─ no league filter       ← shows non-PL players
```

**The gap:** the database is league-agnostic by design (so historical players/teams are preserved), but the API layer must present only the *current* PL universe. Five views skipped that filter — the teams-overview shows relegated teams, and four player-level views still surface players whose `team_id` points at a relegated/transferred-out / non-PL club. After this plan, only `mv_teams_overview` is responsible for deciding "what is a PL team this season"; every other view inherits that decision by joining to it.

**Constraint:** all data must remain in the source tables. The fix lives in the materialized views (`server/create_views.py`) so the views are manipulated to fit business logic without losing history.

---

## 2. All affected locations

| # | File | View | What it returns | Status |
|---|---|---|---|---|
| **B-1** | `server/create_views.py` | `mv_teams_overview` (line 109) | Teams overview — currently includes relegated teams | ⬜ To do |
| **B-2** | `server/create_views.py` | `mv_reported_injuries` (line 296) | Reported injuries list — currently includes non-PL players | ⬜ To do |
| **B-3** | `server/create_views.py` | `mv_high_risk_players` (line 41) | High-risk player list — currently includes non-PL players | ⬜ To do |
| **B-4** | `server/create_views.py` | `mv_trending_risk_players` (line 78) | Trending-risk player list — no active-player filter and no league filter | ⬜ To do |
| **B-5** | `server/create_views.py` | `mv_search_players` (line 148) | Search index — currently includes non-PL players | ⬜ To do |
| **B-6** | `server/create_views.py` | `mv_team_player_list` (line 170) | Per-team player roster — currently includes non-PL players | ⬜ To do |
| **B-7** | `server/create_views.py` | `create_all_views` call order (line 6) | `mv_high_risk_players` and `mv_trending_risk_players` created before `mv_teams_overview` — will break once they depend on it | ⬜ To do |
| **B-8** | `server/ingest_predictions.py` | drop list (line 114) | `mv_search_players`, `mv_team_player_list`, `mv_reported_injuries` dropped after `mv_teams_overview` — Postgres will reject the drop once they depend on it | ⬜ To do |
| **B-9** | `server/integration/search.py` | `get_search_teams` (line 37) | Queries raw `Team` ORM table — returns all teams ever ingested, bypasses `mv_teams_overview` entirely | ⬜ To do |

Downstream readers (no code change needed — they `SELECT * FROM` the view):
- `server/integration/teams.py` → `get_teams_overview` → `GET /teams`
- `server/integration/reported_injuries.py` → `get_reported_injuries` → `GET /reported-injuries`
- `server/integration/dashboard.py` → `get_high_risk_players` → `GET /dashboard/high-risk`
- `server/integration/search.py` → `get_search_players` → `GET /search/players`
- `server/integration/player_page.py` → `get_team_player_list` → `GET /teams/{id}/players`

---

## 3. Phase 1 — Restrict `mv_teams_overview` to current-season PL teams

### 3.1 The two candidate filters

**Suggestion A (yours) — distinct `team_id`s from `match`**

```sql
JOIN (
    SELECT DISTINCT home_team_id AS team_id FROM match
    UNION
    SELECT DISTINCT away_team_id AS team_id FROM match
) pl_teams ON pl_teams.team_id = t.team_id
```

The `match` table is already regenerated each ingest run with only the current PL season's fixtures (per `DB_design_changes.md`). Any team that appears as either home or away in any row of `match` is, by definition, in this season's PL.

**Suggestion B (alternative) — teams that have ≥1 player with a current-season `player_season` row**

```sql
JOIN (
    SELECT DISTINCT p.team_id
    FROM player p
    JOIN player_season ps ON ps.player_id = p.player_id
    WHERE ps.player_season_year = (SELECT current_season_year FROM season_meta)
) pl_teams ON pl_teams.team_id = t.team_id
```

Reuses the same "active player" pattern that `mv_high_risk_players`, `mv_search_players`, and `mv_team_player_list` already use — a team counts as "in the league" if any of its players has a `player_season` row for the current season year.

### 3.2 Comparison

| Dimension | A — `match` table | B — current-season `player_season` |
|---|---|---|
| Source of truth | "Who is scheduled to play a PL fixture this season" — the canonical definition of a PL team | "Who has a player with a current-season stats row" — proxy, not direct |
| Robustness to data quirks | Strong: a relegated team has zero rows in `match`, full stop | Weaker: if any past player still has a current-season `player_season` row mistakenly attached to the relegated team, the team leaks back in |
| Edge cases | Pre-season window where `match` may be empty → all teams disappear | A newly-promoted team with no season stats yet → falsely excluded |
| Consistency with other views | New pattern (no other MV joins to `match` for filtering) | Matches the existing `active_players` subquery pattern |
| Cost | Cheap — `match` has ~380 rows | Cheap — same shape as existing subqueries |

**Recommendation: go with Suggestion A.** The `match` table is the most direct expression of "is this team in the Premier League right now?" and is regenerated authoritatively by the ingestor every run. B is reasonable but introduces a transitive dependency (team → player → player_season) for what is fundamentally a team-level fact.

**Coverage guarantee:** the ML team is extending the ingest pipeline so that `match` will hold **every fixture for the current PL season** (all 380 rows once a season is complete, plus any not-yet-played upcoming fixtures), not just a rolling window. Once that change lands, every PL team is guaranteed to appear in `match` at all times during an active season — no postponement, cup conflict, or window-edge can drop a team. Combined with the existing fact that one gameweek already covers all 20 teams, the `pl_teams` UNION subquery is a strictly safe expression of "teams in this season's Premier League."

**Off-season caveat:** the only remaining state in which the `match` join collapses to zero teams is between full seasons — i.e., after the prior season's data has been wiped and before the new season's first ingest writes any fixtures. In that window `/teams` returns an empty list, but so does most of the rest of the dashboard (`season_meta` is also stale), and the frontend already tolerates empty arrays. This is not a regression introduced by the plan; it is a pre-existing assumption that the ingestor runs at least once per active season.

### 3.3 The change (`server/create_views.py` — `_create_mv_teams_overview`)

**Before** (line 109):
```sql
CREATE MATERIALIZED VIEW mv_teams_overview AS
SELECT
    t.team_id,
    t.team_name,
    t.team_logo,
    COALESCE(ps.amount_of_players, 0)  AS amount_of_players,
    ps.average_risk_of_injury,
    COALESCE(inj.active_injuries, 0)   AS active_injuries
FROM team t
LEFT JOIN ( ... ) ps ON ps.team_id = t.team_id
LEFT JOIN ( ... ) inj ON inj.team_id = t.team_id
ORDER BY t.team_name
```

**After:**
```sql
CREATE MATERIALIZED VIEW mv_teams_overview AS
SELECT
    t.team_id,
    t.team_name,
    t.team_logo,
    COALESCE(ps.amount_of_players, 0)  AS amount_of_players,
    ps.average_risk_of_injury,
    COALESCE(inj.active_injuries, 0)   AS active_injuries
FROM team t
JOIN (
    SELECT home_team_id AS team_id FROM match
    UNION
    SELECT away_team_id AS team_id FROM match
) pl_teams ON pl_teams.team_id = t.team_id
LEFT JOIN ( ... ) ps ON ps.team_id = t.team_id
LEFT JOIN ( ... ) inj ON inj.team_id = t.team_id
ORDER BY t.team_name
```

The two `LEFT JOIN` subqueries (`ps` for player counts/risk and `inj` for active injuries) stay exactly as they are. Only the `team` join is tightened from "every team ever" to "every team in this season's PL fixtures."

### 3.4 Fix `get_search_teams` (`server/integration/search.py`)

`GET /search/teams` is the team search dropdown in the frontend. Today `get_search_teams` builds its list by querying the raw `Team` table via the ORM:

```python
# Before (line 37)
sa_select(Team.team_id, Team.team_name, Team.team_logo).order_by(Team.team_name)
```

This bypasses `mv_teams_overview` and returns every team ever ingested. After Phase 1, `mv_teams_overview` already holds exactly the 20 current PL teams with the matching columns (`team_id`, `team_name`, `team_logo`). The fix is to read from it directly:

```python
# After
rows = session.execute(
    text("SELECT team_id, team_name, team_logo FROM mv_teams_overview ORDER BY team_name")
).mappings().all()
return [{"team_id": row["team_id"], "team_name": row["team_name"], "team_logo": row["team_logo"]} for row in rows]
```

The `SearchTeam` TypedDict (`team_id`, `team_name`, `team_logo`) maps directly to the three columns — no shape change for the caller. The ORM import of `Team` in `search.py` can be removed if it is no longer used elsewhere in that file.

---

## 4. Phase 2 — Restrict `mv_reported_injuries` to current-season PL players

### 4.1 The two candidate filters

**Suggestion A (yours) — current-season `player_season` AND team is a PL team**

```sql
JOIN player_season ps_curr
  ON ps_curr.player_id = p.player_id
 AND ps_curr.player_season_year = (SELECT current_season_year FROM season_meta)
JOIN mv_teams_overview tov ON tov.team_id = p.team_id
```

Two checks AND'd together: the player has stats this season **and** the player's `team_id` resolves to a team in `mv_teams_overview` (the canonical PL-team set defined in Phase 1). Reusing `mv_teams_overview` directly instead of re-deriving the UNION from `match` means the PL-membership definition is defined in exactly one place.

**Suggestion B (alternative) — single check via the existing "active_players" subquery**

```sql
JOIN (
    SELECT ps.player_id
    FROM player_season ps
    GROUP BY ps.player_id
    HAVING MAX(ps.player_season_year) = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

The pattern already used in `mv_high_risk_players`, `mv_search_players`, and `mv_team_player_list` today: a player is "active" iff their *latest* `player_season` row is the current season year. One join, no team filter. Note: after Phase 3, those three views will also be updated to join `mv_teams_overview`, so this pattern will no longer be the norm.

### 4.2 Comparison

| Dimension | A — current-season stats + PL team | B — latest `player_season` is current season |
|---|---|---|
| Catches transferred-out player who had early-season PL stats but is now at a non-PL club | ✅ — `p.team_id` no longer in `pl_teams` | ❌ — they still have a current-season row, so they pass |
| Catches loan-out player whose `team_id` was updated to the loan club | ✅ — same reasoning | ❌ |
| Catches player who never played this season | ✅ | ✅ |
| Catches player whose latest season is current but stats were recorded for a non-PL team (e.g. a stats provider quirk) | ✅ | ❌ |
| Consistency with existing MVs | New (two-step) pattern for this view | Same as the other player-level MVs |
| Cost | Two extra joins (one of them already cached by Phase 1's subquery) | One extra join |
| Failure mode if Phase 1 ships incomplete | Reported injuries also empty for the affected teams (acceptable — they were the wrong teams anyway) | No coupling to Phase 1 |

**Recommendation: go with Suggestion A.** The whole point of this bug is that "latest player_season year = current" is *not* sufficient — a player can satisfy that and still belong to a non-PL team. The two-check version directly enforces the league boundary that the bug report describes. B is simpler but does not fix the transferred-out / loaned-out cases. Using `mv_teams_overview` directly (rather than re-deriving the UNION from `match`) also keeps the PL-membership definition in one place — Phase 1 is the single authority.

### 4.2.1 Important scope clarification — this is a deliberate behaviour change vs. today

The current view shows only injuries that happened during each player's *latest* `player_season` year. That filter is dropped on purpose. The new view's intent is:

> For every player who (a) has a `player_season` row in the current season **and** (b) belongs to a team currently in the PL, return that player's **complete injury history across all seasons**.

So an active 2025-season Manchester United player's 2022 hamstring injury **will** show up in the new view, even though it doesn't today. That is the desired result — the endpoint is meant to be a full injury record for every current PL player, not a current-season changelog. Reviewers should not "restore" the old `latest`-year join thinking it was accidentally lost; it was removed intentionally.

The two filters work as follows:
- **Player filter** (`ps_curr` join): "has any `player_season` row for `current_season_year`" — gates *which players* appear. Once uniqueness of `(player_id, player_season_year)` is enforced upstream by ML output, this join produces exactly one row per qualifying player and cannot duplicate injuries.
- **Team filter** (`pl_teams` join): "player's `team_id` is one of this season's PL teams" — kicks out transferred-out / loaned-out / relegated-with-team players whose `p.team_id` no longer points at a PL club.
- **No filter on `ps.player_season_year`**: the `ps` join (driven by `pi.player_season_id`) is used only to resolve each injury to its owning player. Its year is intentionally unconstrained so that prior-season injuries flow through.

### 4.3 The change (`server/create_views.py` — `_create_mv_reported_injuries`)

**Before** (line 296):
```sql
CREATE MATERIALIZED VIEW mv_reported_injuries AS
SELECT
    pi.player_injury_start,
    pi.player_injury_end,
    p.player_first_name,
    p.player_last_name,
    p.player_position,
    t.team_name,
    pi.player_injury_type,
    pi.player_injury_region,
    pi.player_injury_severity,
    pi.player_injury_days_out
FROM player_injury pi
JOIN player_season ps ON ps.player_season_id = pi.player_season_id
JOIN (
    SELECT player_id, MAX(player_season_year) AS latest_year
    FROM player_season
    GROUP BY player_id
) latest ON latest.player_id = ps.player_id
        AND latest.latest_year = ps.player_season_year
JOIN player p ON p.player_id = ps.player_id
JOIN team t   ON t.team_id = p.team_id
ORDER BY pi.player_injury_start DESC
```

**After:**
```sql
CREATE MATERIALIZED VIEW mv_reported_injuries AS
SELECT
    pi.player_injury_start,
    pi.player_injury_end,
    p.player_first_name,
    p.player_last_name,
    p.player_position,
    tov.team_name,
    pi.player_injury_type,
    pi.player_injury_region,
    pi.player_injury_severity,
    pi.player_injury_days_out
FROM player_injury pi
JOIN player_season ps ON ps.player_season_id = pi.player_season_id
JOIN player p ON p.player_id = ps.player_id
JOIN mv_teams_overview tov ON tov.team_id = p.team_id
JOIN player_season ps_curr
  ON ps_curr.player_id = p.player_id
 AND ps_curr.player_season_year = (SELECT current_season_year FROM season_meta)
ORDER BY pi.player_injury_start DESC
```

Notes:
- `JOIN team t` is removed. `mv_teams_overview` already exposes `team_name` so `tov.team_name` replaces `t.team_name` in the SELECT — no redundant table join.
- The previous `latest`-year subquery is replaced by the explicit `ps_curr` join. Old behaviour: "latest stats row is current." New behaviour: "has any stats row for current season AND team is in `mv_teams_overview`."
- The `pi → ps` join is preserved so each injury row traces back to the player correctly. `ps.player_season_year` is intentionally unconstrained — prior-season injuries flow through, which is the desired all-time history behaviour.
- `DISTINCT` is not needed: each `player_injury` row joins to exactly one `ps`, one `p`, one `tov` row (effectively unique on `team_id` — `team_id` is the PK of the source `team` table and each team produces exactly one row in `mv_teams_overview`), and one `ps_curr` (upstream uniqueness on `(player_id, player_season_year)` guaranteed by ML).
- This view now depends on `mv_teams_overview` and must be created after it and dropped before it (covered in Phase 4).

---

## 5. Phase 3 — Propagate PL-team filter to `mv_high_risk_players`, `mv_trending_risk_players`, `mv_search_players`, `mv_team_player_list`

All four views share the same fix pattern: two joins are added (or adjusted):
1. `JOIN mv_teams_overview tov ON tov.team_id = p.team_id` — ensures only PL teams appear.
2. `JOIN (SELECT player_id FROM player_season WHERE player_season_year = (SELECT current_season_year FROM season_meta)) active ON active.player_id = p.player_id` — ensures the player has season statistics for the current season.

Both checks are required together: a player must be on a PL team **and** have current-season stats. The team check alone could still include a player whose registration was recently transferred to a PL club but whose stats haven't yet been ingested. The stats check alone is insufficient (as established in Phase 2 analysis). Where `mv_high_risk_players` already has an `active` subquery, its implementation is simplified to the plain `WHERE` form (no need for `GROUP BY / HAVING MAX` since ML enforces `(player_id, player_season_year)` uniqueness).

### 5.1 `mv_high_risk_players`

**Before** (line 41 — abbreviated):
```sql
FROM player p
JOIN team t ON t.team_id = p.team_id
JOIN (
    SELECT ps.player_id
    FROM player_season ps
    GROUP BY ps.player_id
    HAVING MAX(ps.player_season_year) = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

**After:**
```sql
FROM player p
JOIN team t ON t.team_id = p.team_id
JOIN mv_teams_overview tov ON tov.team_id = p.team_id
JOIN (
    SELECT player_id FROM player_season
    WHERE player_season_year = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

The `GROUP BY / HAVING MAX` form is replaced with the simpler `WHERE` form — same result given upstream uniqueness guarantee. The `WHERE p.player_injury_risk < 0.99` clause and all `LEFT JOIN` subqueries below it are unchanged.

### 5.2 `mv_trending_risk_players`

**Before** (line 78 — abbreviated):
```sql
FROM player p
JOIN team t ON t.team_id = p.team_id
JOIN graph_data gd ON gd.player_id = p.player_id
```

No `active` subquery exists today. Both filters are added:

**After:**
```sql
FROM player p
JOIN team t ON t.team_id = p.team_id
JOIN graph_data gd ON gd.player_id = p.player_id
JOIN mv_teams_overview tov ON tov.team_id = p.team_id
JOIN (
    SELECT player_id FROM player_season
    WHERE player_season_year = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

The `LEFT JOIN si` subquery below is unchanged.

### 5.3 `mv_search_players`

**Before** (line 148 — abbreviated):
```sql
FROM player p
JOIN team t ON t.team_id = p.team_id
JOIN (
    SELECT ps.player_id
    FROM player_season ps
    GROUP BY ps.player_id
    HAVING MAX(ps.player_season_year) = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

**After:**
```sql
FROM player p
JOIN team t ON t.team_id = p.team_id
JOIN mv_teams_overview tov ON tov.team_id = p.team_id
JOIN (
    SELECT player_id FROM player_season
    WHERE player_season_year = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

### 5.4 `mv_team_player_list`

**Before** (line 170 — abbreviated):
```sql
FROM player p
JOIN (
    SELECT ps.player_id
    FROM player_season ps
    GROUP BY ps.player_id
    HAVING MAX(ps.player_season_year) = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

**After:**
```sql
FROM player p
JOIN mv_teams_overview tov ON tov.team_id = p.team_id
JOIN (
    SELECT player_id FROM player_season
    WHERE player_season_year = (SELECT current_season_year FROM season_meta)
) active ON active.player_id = p.player_id
```

This view does not join `team` today — `tov` acts as both a filter and the source of `team_id` membership. No columns from `tov` are selected (they are not in the output). The `active` subquery is simplified to the `WHERE` form.

---

## 6. Phase 4 — Fix view creation order and drop order

### 6.1 Why the ordering matters

Once `mv_high_risk_players`, `mv_search_players`, `mv_team_player_list`, and `mv_reported_injuries` join `mv_teams_overview`, PostgreSQL tracks a dependency: it will refuse to drop `mv_teams_overview` while any of those views still exists. The current code drops `mv_teams_overview` before several of its new dependents — that will fail at runtime.

Similarly, `mv_high_risk_players` is currently created before `mv_teams_overview`. PostgreSQL will refuse to create it if it references a view that does not yet exist.

### 6.2 Creation order — `server/create_views.py`

**Before:**
```
1. mv_game_week_matches
2. mv_high_risk_players       ← will reference mv_teams_overview, must come after it
3. mv_trending_risk_players   ← will reference mv_teams_overview, must come after it
4. mv_teams_overview          ← depended upon by #2 and #3 — created too late
5. mv_search_players
6. mv_team_player_list
7. mv_player_card
8. mv_injury_analysis
9. mv_reported_injuries
```

**After** (move `mv_teams_overview` to position 2):
```
1. mv_game_week_matches
2. mv_teams_overview          ← created first so all dependents can reference it
3. mv_high_risk_players
4. mv_trending_risk_players
5. mv_search_players
6. mv_team_player_list
7. mv_player_card
8. mv_injury_analysis
9. mv_reported_injuries
```

Change in `create_all_views`:
```python
# Before
_create_mv_game_week_matches(conn)
_create_mv_high_risk_players(conn)
_create_mv_trending_risk_players(conn)
_create_mv_teams_overview(conn)
...

# After
_create_mv_game_week_matches(conn)
_create_mv_teams_overview(conn)
_create_mv_high_risk_players(conn)
_create_mv_trending_risk_players(conn)
...
```

### 6.3 Drop order — `server/ingest_predictions.py`

Dependents must be dropped before the view they depend on. Current drop list:

**Before:**
```python
"mv_high_risk_players",     # ← dependent — OK (before teams_overview)
"mv_trending_risk_players",
"mv_teams_overview",        # ← depended upon — too early; search/team_list/reported still exist
"mv_search_players",        # ← dependent — must be before teams_overview
"mv_team_player_list",      # ← dependent — must be before teams_overview
"mv_player_card",
"mv_injury_analysis",
"mv_reported_injuries",     # ← dependent — must be before teams_overview
"mv_game_week_matches",
```

**After** (all dependents before `mv_teams_overview`):
```python
"mv_high_risk_players",
"mv_trending_risk_players",
"mv_search_players",
"mv_team_player_list",
"mv_reported_injuries",
"mv_teams_overview",        # ← now safe to drop — all dependents already gone
"mv_player_card",
"mv_injury_analysis",
"mv_game_week_matches",
```

### 6.4 Deep-link behaviour for non-PL teams and players

After Phases 1–3, non-PL teams and their players are filtered from `/teams`, `/dashboard/high-risk`, `/search/players`, and `/teams/{id}/players`. However, two per-entity views are **not** changed by this plan:

- `mv_player_card` — keyed by `player_id`, no team filter. A direct URL like `/player/<relegated_player_id>` will still load and render that player's card with their historical data.
- `mv_injury_analysis` — also keyed by `player_id`, no team filter. The player's injury analysis page will still be reachable via a direct link.

This is acceptable for now: users can no longer navigate *to* a non-PL player through any list or search in the UI (those entry points are fixed), but a stale bookmark or manually typed URL will still return data rather than a 404. This is not a regression — those pages existed before — and adding team filters to `mv_player_card` / `mv_injury_analysis` is a separate decision for the frontend team.

---

## 7. Rebuild

After all edits to `create_views.py` and `ingest_predictions.py`:

```bash
python server/ingest_predictions.py
```

The ingestor drops all views (in the new safe order), wipes and repopulates source tables, then recreates all views (in the new correct order) — no separate migration needed.

Smoke-tests:
- `GET /teams` → exactly 20 PL teams; no relegated teams.
- `GET /reported-injuries` → no players whose `team_id` points at a relegated or non-PL club.
- `GET /dashboard/high-risk` → no players from non-PL teams.
- `GET /search/players` → no players from non-PL teams.
- `GET /teams/{pl_team_id}/players` → returns players; a non-PL team ID returns an empty list.

---

## 8. TL;DR checklist

**Phase 1 — `mv_teams_overview` + `get_search_teams`:**
- [ ] Add `JOIN (SELECT home_team_id AS team_id FROM match UNION SELECT away_team_id FROM match) pl_teams ON pl_teams.team_id = t.team_id` to `_create_mv_teams_overview` in `server/create_views.py`
- [ ] Replace ORM query in `get_search_teams` (`server/integration/search.py`) with `SELECT team_id, team_name, team_logo FROM mv_teams_overview ORDER BY team_name`

**Phase 2 — `mv_reported_injuries`:**
- [ ] Remove `JOIN team t` and replace `t.team_name` with `tov.team_name` in SELECT
- [ ] Replace `latest`-year subquery with `JOIN player_season ps_curr ON ps_curr.player_id = p.player_id AND ps_curr.player_season_year = (SELECT current_season_year FROM season_meta)`
- [ ] Replace inline match UNION with `JOIN mv_teams_overview tov ON tov.team_id = p.team_id`

**Phase 3 — player views (4 views, same two-join pattern each):**
- [ ] `mv_high_risk_players` — replace `GROUP BY / HAVING MAX` active subquery with `WHERE player_season_year = current_season_year` form; add `JOIN mv_teams_overview tov ON tov.team_id = p.team_id`
- [ ] `mv_trending_risk_players` — add `JOIN mv_teams_overview tov ON tov.team_id = p.team_id`; add `JOIN (SELECT player_id FROM player_season WHERE player_season_year = ...) active ON active.player_id = p.player_id`
- [ ] `mv_search_players` — replace `GROUP BY / HAVING MAX` active subquery with `WHERE` form; add `JOIN mv_teams_overview tov ON tov.team_id = p.team_id`
- [ ] `mv_team_player_list` — replace `GROUP BY / HAVING MAX` active subquery with `WHERE` form; add `JOIN mv_teams_overview tov ON tov.team_id = p.team_id`

**Phase 4 — ordering fixes in `server/create_views.py` and `server/ingest_predictions.py`:**
- [ ] Move `_create_mv_teams_overview(conn)` to position 2 in `create_all_views` (before `_create_mv_high_risk_players` and `_create_mv_trending_risk_players`)
- [ ] Reorder drop list in `ingest_predictions.py`: move `mv_search_players`, `mv_team_player_list`, `mv_reported_injuries` to before `mv_teams_overview`

**Rebuild & smoke-test:**
- [ ] Re-run `python server/ingest_predictions.py`
- [ ] Verify `GET /teams` returns exactly 20 teams
- [ ] Verify `GET /reported-injuries`, `GET /dashboard/high-risk`, `GET /dashboard/trending`, `GET /search/players` contain no non-PL players
