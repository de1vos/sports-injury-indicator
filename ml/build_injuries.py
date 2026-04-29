"""
Step 2.4 — Build injuries.csv

Sources:
  1. sidelined.json     — career sidelined history per player (often lags behind)
  2. injuries_season_{year}.json — per-fixture injury reports from /injuries endpoint
                                   (more up-to-date, especially for current season)

The two sources are merged and deduplicated.
For source 2, consecutive match absences are clustered into injury events.

Output: data/injuries.csv
"""

import json
import pandas as pd
from datetime import datetime
from config import (
    RAW_DIR, SIDELINED_FILE, INJURIES_CSV,
    SEVERITY_THRESHOLDS, BODY_REGION_MAP, ALL_SEASONS,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def compute_days_out(start, end) -> int | None:
    try:
        s = pd.Timestamp(start)
        e = pd.Timestamp(end)
        return max(0, (e - s).days)
    except Exception:
        return None


def get_severity(days: int | None) -> str | None:
    if days is None:
        return None
    for label, (low, high) in SEVERITY_THRESHOLDS.items():
        if low <= days <= high:
            return label
    return "Long-term"


def get_body_region(injury_type: str) -> str:
    if not injury_type:
        return "Other"
    lower = injury_type.lower()
    for keyword, region in BODY_REGION_MAP.items():
        if keyword in lower:
            return region
    return "Other"


def finalise(df: pd.DataFrame) -> pd.DataFrame:
    """Add computed columns and sort."""
    df["days_out"]    = df.apply(
        lambda r: compute_days_out(r["start_date"], r["end_date"])
        if pd.notna(r.get("end_date")) else None, axis=1
    )
    df["severity"]    = df["days_out"].apply(get_severity)
    df["body_region"] = df["injury_type"].apply(get_body_region)
    df["start_date"]  = pd.to_datetime(df["start_date"], errors="coerce")
    df["end_date"]    = pd.to_datetime(df["end_date"],   errors="coerce")
    return df.sort_values(["player_id", "start_date"]).reset_index(drop=True)


# ── Source 1: sidelined.json ──────────────────────────────────────────────────

def load_sidelined() -> pd.DataFrame:
    if not SIDELINED_FILE.exists():
        print("sidelined.json not found — skipping (using season injuries only)")
        return pd.DataFrame(columns=["player_id", "injury_type", "start_date", "end_date", "source"])
    print("Loading sidelined.json...")
    with open(SIDELINED_FILE) as f:
        raw = json.load(f)
    print(f"  {len(raw)} players")

    rows = []
    for player_id, records in raw.items():
        for rec in records:
            rows.append({
                "player_id":   int(player_id),
                "injury_type": rec.get("type", ""),
                "start_date":  rec.get("start"),
                "end_date":    rec.get("end"),
                "source":      "sidelined",
            })
    return pd.DataFrame(rows)


# ── Source 2: injuries_season_{year}.json ─────────────────────────────────────

def load_season_injuries() -> pd.DataFrame:
    """
    Convert per-fixture injury reports into injury events.

    Strategy: for each player, cluster consecutive 'Missing Fixture' entries
    (fixtures within 45 days of each other) into a single injury event.
    start_date = first fixture date, end_date = last fixture date + 14 days.
    If the player is still missing at the latest fixture we have → end_date = None.
    """
    all_rows = []

    for season in ALL_SEASONS:
        path = RAW_DIR / f"injuries_season_{season}.json"
        if not path.exists():
            continue

        with open(path) as f:
            records = json.load(f)

        print(f"  injuries_season_{season}.json: {len(records)} fixture-reports")

        for rec in records:
            ptype = rec.get("player", {}).get("type", "")
            if ptype != "Missing Fixture":
                continue  # skip Questionable / Doubtful

            pid    = rec.get("player", {}).get("id")
            reason = rec.get("player", {}).get("reason") or ""
            date   = rec.get("fixture", {}).get("date", "")[:10]

            if not pid or not date:
                continue

            # Skip suspensions
            if "suspen" in reason.lower() or "red card" in reason.lower():
                continue

            all_rows.append({
                "player_id":   int(pid),
                "injury_type": reason,
                "fixture_date": pd.Timestamp(date),
            })

    if not all_rows:
        return pd.DataFrame(columns=["player_id", "injury_type", "start_date", "end_date", "source"])

    df = pd.DataFrame(all_rows).sort_values(["player_id", "fixture_date"])

    # Determine the very latest fixture date across all seasons (for ongoing check)
    latest_fixture = df["fixture_date"].max()

    injury_events = []

    for player_id, pgroup in df.groupby("player_id"):
        pgroup = pgroup.sort_values("fixture_date")
        dates  = pgroup["fixture_date"].tolist()
        types  = pgroup["injury_type"].tolist()

        cluster_start = dates[0]
        cluster_type  = types[0]
        prev_date     = dates[0]

        for i in range(1, len(dates)):
            gap = (dates[i] - prev_date).days
            if gap > 45:
                # Close previous cluster
                ongoing = (prev_date == latest_fixture)
                injury_events.append({
                    "player_id":   player_id,
                    "injury_type": cluster_type,
                    "start_date":  cluster_start,
                    "end_date":    None if ongoing else prev_date + pd.Timedelta(days=14),
                    "source":      "season_injuries",
                })
                cluster_start = dates[i]
                cluster_type  = types[i]

            prev_date = dates[i]

        # Final cluster
        ongoing = (prev_date == latest_fixture)
        injury_events.append({
            "player_id":   player_id,
            "injury_type": cluster_type,
            "start_date":  cluster_start,
            "end_date":    None if ongoing else prev_date + pd.Timedelta(days=14),
            "source":      "season_injuries",
        })

    return pd.DataFrame(injury_events)


# ── Deduplication ─────────────────────────────────────────────────────────────

# Vague injury type strings from the /injuries endpoint that add no value
VAGUE_TYPES = {"other", "fitness", "injured", "injury", "unknown", "ill", "doubtful", ""}


def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove season_injuries rows already covered by a sidelined record.

    Uses temporal overlap (with a 14-day buffer) rather than type matching —
    the two sources use different terminology so type matching causes misses.
    Also drops season_injuries rows with vague/uninformative injury types.
    """
    df["start_date"] = pd.to_datetime(df["start_date"], errors="coerce")
    df["end_date"]   = pd.to_datetime(df["end_date"],   errors="coerce")

    sidelined = df[df["source"] == "sidelined"].copy()
    season    = df[df["source"] == "season_injuries"].copy()

    BUFFER = pd.Timedelta(days=14)

    keep = []
    for _, row in season.iterrows():
        # Drop vague types
        itype = str(row.get("injury_type", "")).lower().strip()
        if itype in VAGUE_TYPES:
            continue

        pid         = row["player_id"]
        row_start   = row["start_date"]
        row_end     = row["end_date"] if pd.notna(row.get("end_date")) else row_start + pd.Timedelta(days=30)

        if pd.isna(row_start):
            continue

        # Check temporal overlap with any sidelined record for this player
        sl_player  = sidelined[sidelined["player_id"] == pid]
        duplicate  = False
        for _, sl in sl_player.iterrows():
            if pd.isna(sl["start_date"]):
                continue
            sl_end = sl["end_date"] if pd.notna(sl.get("end_date")) else sl["start_date"] + pd.Timedelta(days=30)

            # Overlapping if: row starts before sl ends (+ buffer) AND row ends after sl starts (- buffer)
            if row_start <= sl_end + BUFFER and row_end >= sl["start_date"] - BUFFER:
                duplicate = True
                break

        if not duplicate:
            keep.append(row)

    new_rows = pd.DataFrame(keep) if keep else pd.DataFrame(columns=season.columns)
    return pd.concat([sidelined, new_rows], ignore_index=True)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    sidelined_df = load_sidelined()

    print("\nLoading season injury reports...")
    season_df = load_season_injuries()
    print(f"  Clustered into {len(season_df)} injury events")

    combined = deduplicate(pd.concat([sidelined_df, season_df], ignore_index=True))
    print(f"\nAfter dedup: {len(combined)} total records "
          f"({len(sidelined_df)} sidelined + {len(season_df) - (len(season_df) - (len(combined) - len(sidelined_df)))} new from season reports)")

    df = finalise(combined.drop(columns=["source"], errors="ignore"))

    INJURIES_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(INJURIES_CSV, index=False)

    print(f"\n{'─'*50}")
    print(f"Total records:          {len(df)}")
    print(f"Unique players:         {df['player_id'].nunique()}")
    print(f"Ongoing (no end date):  {df['end_date'].isna().sum()}")
    print(f"Max start date:         {df['start_date'].max().date()}")
    print(f"Avg days out:           {df['days_out'].mean():.1f}")
    print(f"Max days out:           {df['days_out'].max():.0f}")

    print(f"\nSeverity breakdown:")
    print(df["severity"].value_counts().to_string())

    print(f"\nTop 10 injury types:")
    print(df["injury_type"].value_counts().head(10).to_string())

    print(f"\nSaved: {INJURIES_CSV}")


if __name__ == "__main__":
    main()
