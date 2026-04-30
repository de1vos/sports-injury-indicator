# Auth Plan — Google OAuth via Supabase

**Prerequisite:** `DeploymentPlan.md` is complete (Supabase DB + Render backend + Vercel frontend all live).

**Goal:** users sign in with Google. Favourites are stored per authenticated user in the database. The star/unfavourite action and the My Players page require login. Nothing else is gated.

**Decision:** drop `app_user` entirely. `user_favourite.user_id` is a UUID directly referencing `auth.users.id` (Supabase's built-in auth table). Favourites are no longer stored in `localStorage` — they live in the database and are fetched from the backend.

**Status legend:** ✅ done · 🟡 in progress · ❌ not started

---

## Phase 1 — Google OAuth credentials (manual)

- [ ] **A1.1** Open [Google Cloud Console](https://console.cloud.google.com) → create a new project (or pick existing).
- [ ] **A1.2** APIs & Services → OAuth consent screen → set up (External, app name, your email).
- [ ] **A1.3** Credentials → Create Credentials → OAuth Client ID → Web application.
- [ ] **A1.4** Authorized redirect URIs: paste the URL Supabase gives you (Authentication → Providers → Google → "Callback URL").
- [ ] **A1.5** Save the Client ID and Client Secret.

---

## Phase 2 — Supabase auth config (manual)

- [ ] **A2.1** Supabase dashboard → Authentication → Providers → Google → enable.
- [ ] **A2.2** Paste Google Client ID + Secret. Save.
- [ ] **A2.3** Authentication → URL Configuration → Site URL = `https://2to3weeks.com`.
- [ ] **A2.4** Add to Redirect URLs:
  - `https://2to3weeks.com/**`
  - `https://www.2to3weeks.com/**`
  - `http://localhost:5173/**`
- [ ] **A2.5** Project Settings → API → copy the **JWT Secret**. Save it for the backend env var `SUPABASE_JWT_SECRET`.
- [ ] **A2.6** Project Settings → API → copy **Project URL** and **anon/public key**. Save for frontend env vars.

---

## Phase 3 — Database schema migration

Goal: replace the `app_user` int-based user system with UUID FKs directly to `auth.users.id`. Drop `app_user` since no profile fields are needed.

- [ ] **A3.1** Run this SQL once in the Supabase SQL Editor to drop the old tables and recreate `user_favourite` with a UUID PK:
    ```sql
    DROP TABLE IF EXISTS user_favourite CASCADE;
    DROP TABLE IF EXISTS app_user CASCADE;

    CREATE TABLE user_favourite (
        user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES player(player_id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, player_id)
    );
    ```
    Using a composite PK (user_id + player_id) removes the need for a surrogate `user_favourite_id` and prevents duplicate rows naturally.

- [ ] **A3.2** In `server/database_init.py`:
  - Delete the `AppUser` class entirely.
  - Replace `UserFavourite` with:
    ```python
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    from uuid import UUID

    class UserFavourite(SQLModel, table=True):
        __tablename__: ClassVar[str] = "user_favourite"
        user_id: UUID = Field(
            sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, nullable=False)
        )
        player_id: int = Field(foreign_key="player.player_id", primary_key=True)

        player: Optional["Player"] = Relationship(back_populates="favourited_by")
    ```
  - Remove `favourites` relationship from `AppUser` (class is deleted).
  - Remove `user` relationship from `UserFavourite` (no AppUser to relate to).
  - **Note:** The FK to `auth.users(id)` is defined in the SQL above, not in SQLModel — SQLModel cannot reference a different schema.

- [ ] **A3.3** Update `server/ingest_predictions.py`:
  - Remove `AppUser` from the import line.
  - The docstring says "Preserves: app_user, user_favourite" — update it to just "Preserves: user_favourite".
  - `user_favourite` must NOT be in the clear-tables list (it never was — confirm this is still true).

---

## Phase 4 — Backend: auth + favourite endpoints

### 4a — JWT middleware

- [ ] **A4.1** Add `PyJWT` to `requirements.txt`.
- [ ] **A4.2** Add Render env var: `SUPABASE_JWT_SECRET`.
- [ ] **A4.3** Create `server/auth.py`:
    ```python
    import os
    import jwt
    from uuid import UUID
    from fastapi import Header, HTTPException

    _JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]

    def current_user_id(authorization: str = Header(...)) -> UUID:
        if not authorization.startswith("Bearer "):
            raise HTTPException(401, "Missing bearer token")
        token = authorization[7:]
        try:
            payload = jwt.decode(
                token, _JWT_SECRET,
                algorithms=["HS256"], audience="authenticated",
            )
        except jwt.PyJWTError as e:
            raise HTTPException(401, str(e))
        return UUID(payload["sub"])
    ```

### 4b — Favourite endpoints

The current `GET /my-players/{user_id}` takes an int from the URL — that needs to go. Replace with three endpoints that read the identity from the JWT:

- [ ] **A4.4** Rewrite `server/routers/my_players.py`:
    ```python
    from uuid import UUID
    from fastapi import APIRouter, Depends
    from sqlmodel import Session
    from database import get_session
    from auth import current_user_id
    import integration.my_players as svc

    router = APIRouter(prefix="/favourites", tags=["favourites"])

    @router.get("")
    def list_favourites(user_id: UUID = Depends(current_user_id),
                        session: Session = Depends(get_session)):
        return svc.get_favourite_players(user_id, session)

    @router.post("/{player_id}", status_code=204)
    def add_favourite(player_id: int,
                      user_id: UUID = Depends(current_user_id),
                      session: Session = Depends(get_session)):
        svc.add_favourite(user_id, player_id, session)

    @router.delete("/{player_id}", status_code=204)
    def remove_favourite(player_id: int,
                         user_id: UUID = Depends(current_user_id),
                         session: Session = Depends(get_session)):
        svc.remove_favourite(user_id, player_id, session)
    ```

- [ ] **A4.5** Update `server/integration/my_players.py`:
  - Change `get_favourite_players(user_id: int, ...)` → `get_favourite_players(user_id: UUID, ...)`.
  - Add `add_favourite(user_id: UUID, player_id: int, session)` — upsert into `user_favourite`.
  - Add `remove_favourite(user_id: UUID, player_id: int, session)` — delete from `user_favourite`.

- [ ] **A4.6** Update `server/main.py` — the router is already included as `my_players`; just make sure the prefix matches `/favourites` (not `/my-players`).

- [ ] **A4.7** Smoke-test: `curl -H "Authorization: Bearer bad" http://localhost:8000/favourites` → 401.

---

## Phase 5 — Frontend integration

### 5a — Supabase client

- [ ] **A5.1** `cd frontendUpdatedSoccer2 && npm install @supabase/supabase-js`.
- [ ] **A5.2** Add to `.env.local` (local dev) and Vercel env vars (production):
  - `VITE_SUPABASE_URL` = Supabase project URL (from A2.6)
  - `VITE_SUPABASE_ANON_KEY` = anon/public key (from A2.6)
- [ ] **A5.3** Create `src/lib/supabase.ts`:
    ```ts
    import { createClient } from '@supabase/supabase-js'
    export const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
    ```

### 5b — Auth context

- [ ] **A5.4** Create `src/app/context/AuthContext.tsx`:
    ```tsx
    import { createContext, useContext, useEffect, useState } from 'react'
    import type { Session } from '@supabase/supabase-js'
    import { supabase } from '../../lib/supabase'

    interface AuthCtx { session: Session | null; loading: boolean }
    const AuthContext = createContext<AuthCtx>({ session: null, loading: true })

    export function AuthProvider({ children }: { children: React.ReactNode }) {
      const [session, setSession] = useState<Session | null>(null)
      const [loading, setLoading] = useState(true)

      useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
          setSession(data.session)
          setLoading(false)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
        return () => subscription.unsubscribe()
      }, [])

      return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
    }

    export const useAuth = () => useContext(AuthContext)
    ```
- [ ] **A5.5** Wrap the app in `AuthProvider` in `src/app/routes.tsx` (outside `FavoritesProvider`).

### 5c — API client with auth header

- [ ] **A5.6** Update `src/app/api/client.ts` — add an `authFetch` variant that attaches the Supabase JWT:
    ```ts
    import { supabase } from '../../lib/supabase'

    export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new ApiError(401, 'Not authenticated')
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!res.ok) throw new ApiError(res.status, `API error ${res.status}: ${path}`)
      return res.status === 204 ? (undefined as T) : res.json()
    }
    ```

### 5d — Favourites hook rewrite

The current `useFavorites.ts` stores favourites in `localStorage`. This must be replaced with backend calls so that favourites are per-user and persist across devices/sessions.

- [ ] **A5.7** Rewrite `src/app/hooks/useFavorites.ts`:
  - On mount (when session is available): call `GET /favourites` to load the user's favourite player IDs.
  - `toggleFavorite(playerId)`: call `POST /favourites/{id}` or `DELETE /favourites/{id}` depending on current state.
  - When session is null: `favorites` is an empty Set, `toggleFavorite` redirects to `/login`.
  - Remove all `localStorage` reads/writes.
  - The `CachedPlayer` data (photo, name, etc.) still comes from the backend response of `GET /favourites`, which already returns full player objects. Store the player list in state; derive `favoriteCount` and `isFavorite` from it.

### 5e — LoginPage: replace form with Google OAuth

- [ ] **A5.8** Rewrite `src/app/pages/LoginPage.tsx`:
  - Keep the existing gradient card visual design.
  - Remove the username/password form, the `isCreatingAccount` toggle, and the email/password state.
  - Replace the form with a single "Sign in with Google" button that calls:
    ```ts
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    ```
  - If the user is already logged in (`session !== null`), redirect them away from `/login` (e.g. to `/`).

### 5f — Navigation: auth-aware user icon

- [ ] **A5.9** Update `src/app/components/Navigation.tsx`:
  - Import `useAuth`.
  - When `session === null`: the user icon links to `/login` (current behaviour).
  - When `session !== null`: show the user's Google avatar (from `session.user.user_metadata.avatar_url`) or initials. Clicking it shows a small dropdown with a "Sign out" button (`supabase.auth.signOut()`).

### 5g — Route guard for My Players

- [ ] **A5.10** In `src/app/routes.tsx`, add a `RequireAuth` wrapper component:
    ```tsx
    function RequireAuth({ children }: { children: React.ReactNode }) {
      const { session, loading } = useAuth()
      if (loading) return null
      if (!session) return <Navigate to="/login" replace />
      return <>{children}</>
    }
    ```
  - Wrap the `my-players` route with `RequireAuth`.

---

## Phase 6 — End-to-end smoke test

- [ ] **A6.1** Open `https://2to3weeks.com/login` → click "Sign in with Google".
- [ ] **A6.2** Complete OAuth flow — should redirect back to the site.
- [ ] **A6.3** Supabase dashboard → Authentication → Users → your account appears.
- [ ] **A6.4** Star a player. Supabase Table Editor → `user_favourite` → row exists with your UUID.
- [ ] **A6.5** Reload the page — star is still shown (data comes from backend, not localStorage).
- [ ] **A6.6** Remove the favourite. Row is deleted from `user_favourite`.
- [ ] **A6.7** Sign out → navigate to `/my-players` → redirected to `/login`.
- [ ] **A6.8** Call `GET /favourites` without a token → 401.
- [ ] **A6.9** Sign in as a different Google account → favourites list is empty (isolated per user).

---

## Phase 7 — Hardening (optional, after demo works)

- [ ] **A7.1** Add a `/me` endpoint that returns the authenticated user's UUID for debugging.
- [ ] **A7.2** Consider Row Level Security on `user_favourite` as a defence-in-depth measure:
    ```sql
    ALTER TABLE user_favourite ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users see own favourites" ON user_favourite
      FOR ALL USING (auth.uid() = user_id);
    ```

---

## Why no `app_user` table

You only need `user_id` — no display name, no favourite team, no profile fields. With nothing to store beyond the user's identity, `app_user` would just duplicate `auth.users.id` in another table. Drop it.

If later you want per-user fields (theme, settings, custom display name), recreate `app_user` with `user_id UUID PK REFERENCES auth.users(id)` and a trigger to auto-create rows on signup.

---

## What changes for the daily ML refresh

Nothing. The workflow only touches ML-derived tables (`player`, `team`, `match`, `graph_data`, etc.) which are wiped and rebuilt. `user_favourite` is never touched by the ingestor, so users keep their favourites across daily refreshes.

---

## Estimated time

| Phase | Time |
|---|---|
| A1 — Google credentials | 20 min |
| A2 — Supabase config | 10 min |
| A3 — Schema migration | 20 min |
| A4 — Backend JWT + endpoints | 45 min |
| A5 — Frontend integration | 1.5 h |
| A6 — Smoke test | 30 min |
| **Total** | **~3.5 hours** |

## Cost

$0 — Supabase Auth is included in the free tier, unlimited users.
