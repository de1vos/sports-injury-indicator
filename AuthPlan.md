# Auth Plan — Google OAuth via Supabase

**Prerequisite:** `DeploymentPlan.md` is complete (Supabase DB + Render backend + Vercel frontend all live).

**Goal:** users sign in with Google. Backend identifies them by their Supabase user ID. Favourites belong to that user. Nothing else stored — no display name, no profile fields.

**Decision:** drop `app_user` entirely. `user_favourite.user_id` is a UUID directly referencing `auth.users.id` (Supabase's built-in auth table).

**Status legend:** ✅ done · 🟡 in progress · ❌ not started

---

## Phase 1 — Google OAuth credentials

- [ ] **A1.1** Open [Google Cloud Console](https://console.cloud.google.com) → create a new project (or pick existing).
- [ ] **A1.2** APIs & Services → OAuth consent screen → set up (External, app name, your email).
- [ ] **A1.3** Credentials → Create Credentials → OAuth Client ID → Web application.
- [ ] **A1.4** Authorized redirect URIs: paste the URL Supabase gives you (Authentication → Providers → Google → "Callback URL").
- [ ] **A1.5** Save the Client ID and Client Secret.

---

## Phase 2 — Supabase auth config

- [ ] **A2.1** Supabase dashboard → Authentication → Providers → Google → enable.
- [ ] **A2.2** Paste Google Client ID + Secret. Save.
- [ ] **A2.3** Authentication → URL Configuration → Site URL = `https://yourdomain.com`.
- [ ] **A2.4** Add to Redirect URLs:
  - `https://yourdomain.com/**`
  - `http://localhost:5173/**`
- [ ] **A2.5** Authentication → Settings → copy the **JWT Secret** (Project Settings → API → JWT Secret). Save it for backend env var.

---

## Phase 3 — Database schema migration

Goal: replace `app_user.user_id` (int) and `user_favourite.user_id` (int) with UUID FKs to `auth.users.id`. Drop `app_user` since no profile fields are needed.

- [ ] **A3.1** In `server/database_init.py`:
  - Delete the `AppUser` model entirely.
  - Update `UserFavourite`:
    ```python
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    from uuid import UUID

    class UserFavourite(SQLModel, table=True):
        __tablename__ = "user_favourite"
        user_id:   UUID = Field(sa_type=PG_UUID, primary_key=True)
        player_id: int  = Field(foreign_key="player.player_id", primary_key=True)
    ```
  - **Note:** the `user_id` FK to `auth.users(id)` cannot be expressed in SQLModel (different schema). Add it as a raw constraint instead — see A3.3.
- [ ] **A3.2** Update `server/ingest_predictions.py` clear-tables list to drop the `app_user` reference (the table no longer exists).
- [ ] **A3.3** Run this SQL once in Supabase SQL Editor to add the cross-schema FK:
    ```sql
    ALTER TABLE user_favourite
      ADD CONSTRAINT fk_user_favourite_auth_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ```
- [ ] **A3.4** Drop existing `app_user` table + reset favourites (school project — no real users to migrate):
    ```sql
    DROP TABLE IF EXISTS user_favourite CASCADE;
    DROP TABLE IF EXISTS app_user CASCADE;
    ```
    Then re-run `seed_db.py` (or just `database_init.py`) to recreate `user_favourite` with the new schema.

---

## Phase 4 — Backend JWT verification

- [ ] **A4.1** Add `pyjwt` to `requirements.txt`.
- [ ] **A4.2** Add Render env var: `SUPABASE_JWT_SECRET` (from Phase 2.5).
- [ ] **A4.3** Create `server/auth.py`:
    ```python
    import os
    import jwt
    from uuid import UUID
    from fastapi import Header, HTTPException

    JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]

    def current_user_id(authorization: str = Header(...)) -> UUID:
        if not authorization.startswith("Bearer "):
            raise HTTPException(401, "Missing bearer token")
        token = authorization[7:]
        try:
            payload = jwt.decode(
                token, JWT_SECRET,
                algorithms=["HS256"], audience="authenticated",
            )
        except jwt.PyJWTError as e:
            raise HTTPException(401, f"Invalid token: {e}")
        return UUID(payload["sub"])
    ```
- [ ] **A4.4** Update favourite endpoints in `server/main.py` (or wherever they live) to require auth:
    ```python
    from auth import current_user_id

    @app.post("/favourites/{player_id}")
    def add_favourite(player_id: int, user_id: UUID = Depends(current_user_id)):
        # INSERT INTO user_favourite (user_id, player_id) ...

    @app.delete("/favourites/{player_id}")
    def remove_favourite(player_id: int, user_id: UUID = Depends(current_user_id)):
        # DELETE FROM user_favourite WHERE user_id = ... AND player_id = ...

    @app.get("/favourites")
    def list_favourites(user_id: UUID = Depends(current_user_id)):
        # SELECT player_id FROM user_favourite WHERE user_id = ...
    ```
- [ ] **A4.5** Smoke-test locally with a dummy token, confirm 401 on missing/invalid auth.

---

## Phase 5 — Frontend integration

- [ ] **A5.1** `cd frontendUpdatedSoccer2 && npm install @supabase/supabase-js`.
- [ ] **A5.2** Add Vercel env vars (Project → Settings → Environment Variables):
  - `VITE_SUPABASE_URL` = your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` = anon/public key (Supabase Settings → API)
- [ ] **A5.3** Create `src/lib/supabase.ts`:
    ```ts
    import { createClient } from '@supabase/supabase-js'
    export const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
    ```
- [ ] **A5.4** Add login button somewhere (header / login page):
    ```ts
    async function login() {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
    }
    ```
- [ ] **A5.5** Add logout button:
    ```ts
    async function logout() { await supabase.auth.signOut() }
    ```
- [ ] **A5.6** Wire auth state into the UI — show login button when logged out, user info + logout when logged in:
    ```ts
    const [session, setSession] = useState(null)
    useEffect(() => {
      supabase.auth.getSession().then(({ data }) => setSession(data.session))
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
      return () => sub.subscription.unsubscribe()
    }, [])
    ```
- [ ] **A5.7** Update fetch wrapper to send the JWT on every API call:
    ```ts
    async function api(path: string, init: RequestInit = {}) {
      const { data: { session } } = await supabase.auth.getSession()
      return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
      })
    }
    ```
- [ ] **A5.8** Replace direct `fetch` calls to favourite endpoints with `api(...)`.

---

## Phase 6 — End-to-end smoke test

- [ ] **A6.1** Open `https://yourdomain.com`.
- [ ] **A6.2** Click "Sign in with Google" → complete OAuth flow.
- [ ] **A6.3** Verify in Supabase dashboard → Authentication → Users → your account appears with the Google avatar.
- [ ] **A6.4** Add a favourite player. Verify in Supabase Table Editor → `user_favourite` → row exists with your `auth.users.id` as `user_id`.
- [ ] **A6.5** Remove the favourite. Confirm row deleted.
- [ ] **A6.6** Sign out. Try to call `/favourites` directly — should return 401.
- [ ] **A6.7** Sign in as a different Google account, confirm favourites are isolated per user.

---

## Phase 7 — Hardening (optional, after demo works)

- [ ] **A7.1** Cache the `get_jwks` call in backend (currently re-decodes per request — fine for low traffic, slow at scale).
- [ ] **A7.2** Add a `/me` endpoint that returns the authenticated user's UUID for debugging.
- [ ] **A7.3** Consider Row Level Security on `user_favourite` if you ever want to query Supabase directly from the frontend without going through FastAPI:
    ```sql
    ALTER TABLE user_favourite ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users see own favourites" ON user_favourite
      FOR ALL USING (auth.uid() = user_id);
    ```

---

## Why no `app_user` table

You said you only need `user_id` — no display name, no favorite team, no profile fields. With nothing to store beyond the user's identity, `app_user` would just duplicate `auth.users.id` in another table. Drop it.

If later you want to add per-user fields (theme, settings, custom display name), recreate `app_user` then with `user_id UUID PK REFERENCES auth.users(id)` and a trigger to auto-create rows on signup. Cheap to add later.

---

## What changes for the daily ML refresh

Nothing. The GitHub Actions workflow only touches ML-derived tables (`player`, `team`, `match`, `graph_data`, etc.) which are wiped and rebuilt. `user_favourite` is preserved across ingestions because the ingestor never touches it. Users keep their favourites across daily refreshes — same as before.

---

## Estimated time

| Phase | Time |
|---|---|
| A1 — Google credentials | 20 min |
| A2 — Supabase config | 10 min |
| A3 — Schema migration | 30 min |
| A4 — Backend JWT | 45 min |
| A5 — Frontend integration | 1.5 h |
| A6 — Smoke test | 30 min |
| **Total** | **~3.5 hours** |

## Cost

$0 — Supabase Auth is included in the free tier, unlimited users.
