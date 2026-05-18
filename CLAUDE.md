# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with Turbopack at http://localhost:3000
npm run build      # Production build
npm start          # Run production build
npm run lint       # ESLint check
```

There is no test suite configured in this project.

## Environment Setup

Create `.env.local` in the project root with:

```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=<password>
DB_NAME=foodie_hub
DB_PORT=3306
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<secret>
```

A MySQL database named `foodie_hub` must be running locally.

## Architecture Overview

FoodieHub is a **Next.js 15 App Router** social food-sharing platform. Users register, connect with friends, and share meal recipes with nutritional data.

**Stack:** Next.js 15 (App Router) + React 19, MySQL via `mysql2/promise` connection pool, NextAuth.js v4 (JWT strategy, Credentials provider), Tailwind CSS v4, Zod for validation, bcryptjs for passwords.

**Path alias:** `@/*` maps to `src/*`.

### Auth Flow

NextAuth is configured in `src/app/api/auth/[...nextauth]/options.js` with a Credentials provider. On login, it queries the `users` table, verifies the password with `bcryptjs.compare()`, then embeds `user_id` into the JWT. The session exposes `session.user.id` throughout the app. Protected routes are gated in `src/middleware.js`.

To read the current user in a Server Component or Route Handler:
```js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
const session = await getServerSession(authOptions);
// session.user.id is the user_id from the DB
```

### Database Layer

All DB access goes through the pool exported from `src/app/lib/db.js`:
```js
import pool from "@/app/lib/db";
const [rows] = await pool.execute("SELECT ...", [params]);
```

Always use `pool.execute()` with parameterized queries (`?` placeholders), never string interpolation.

**Key tables:** `users` (user_id, first_name, last_name, email, password), `friend_request` (sender_id, receiver_id, status: 1=pending, 2=accepted, 3=rejected), `posts` (post_id, title, user_id, content_id), `content` (content_id, mealName), `nutrition`, `ingredients`, `instructions`, `mealType`, `mealContentJunction`, `comments`, `likes`.

### Post Creation Flow

Creating a full post requires calling multiple API routes in sequence:

1. `POST /api/post/content` → returns `content_id`
2. `POST /api/post/userPost` — links `{ title, userId, contentId }`
3. `POST /api/post/nutritions` — `{ contentId, calories, protein, carbs, fats, fiber }`
4. `POST /api/post/ingredients` (one per ingredient) — units must be one of: `g`, `ml`, `cup`, `tbsp`, `teaspoons`, `pcs`
5. `POST /api/post/instructions` (one per step)
6. `POST /api/post/mealType` + `POST /api/post/mealContentJunction` — category must be one of: `Smoothie`, `breakfast`, `lunch`, `dinner`

This orchestration is handled client-side in `src/app/auth/post/page.js`.

### Connections / Social Graph

Friend requests live in the `friend_request` table. Status codes: `1` = pending, `2` = accepted, `3` = rejected. The relevant routes:

- `POST /api/connections/friendrequest` — send request (prevents duplicates and self-requests)
- `POST /api/connections/authorize` — accept or reject (only the receiver can update)
- `GET /api/connections/friendsData` — accepted friends joined with user data
- `GET /api/connections/search` — LIKE search on name/email, excludes current user

### Known Issues

- `src/middleware.js` has a bug: `startswith` should be `startsWith` (camelCase) — route protection for unauthenticated users is broken.
- `src/app/api/connections/friendsData/route.js` references an undefined `userId` variable; it should use `session.user.id`.
- Some older route files use string interpolation in SQL queries instead of parameterized `?` placeholders — fix these before adding new queries in the same files.
