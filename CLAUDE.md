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

`JWT_SECRET` is unused — NextAuth handles JWT internally via `NEXTAUTH_SECRET`. A MySQL database named `foodie_hub` must be running locally.

## Architecture Overview

FoodieHub is a **Next.js 15 App Router** social food-sharing platform where users register, connect with friends, and share meal recipes with nutritional data.

**Stack:** Next.js 15 (App Router) + React 19, MySQL via `mysql2/promise` connection pool, NextAuth.js v4 (JWT strategy, Credentials provider), Tailwind CSS v4, Zod (installed but minimally used), bcryptjs for passwords, uuid for all primary keys.

**Path alias:** `@/*` maps to `src/*`.

## Auth Flow

NextAuth is configured in `src/app/api/auth/[...nextauth]/options.js` with a Credentials provider. On login, it queries the `users` table, verifies the password with `bcryptjs.compare()`, then embeds `user_id` into the JWT. The session exposes `session.user.id` throughout the app.

Protected routes are gated in `src/middleware.js` (project root) using `withAuth()` from NextAuth — it redirects authenticated users away from `/` to `/auth/home` and enforces token presence for all `/auth/*` routes.

To read the current user in a Server Component or Route Handler:
```js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
const session = await getServerSession(authOptions);
// session.user.id is the UUID from the DB
```

All pages under `src/app/auth/` are wrapped by `src/app/auth/layout.js`, which renders `src/app/auth/providers.js` (a `"use client"` component providing `SessionProvider`). Client Components under `/auth/` that need `useSession()` rely on this layout-level provider — do not add a second `SessionProvider` wrapper.

**Registration:** `POST /api/user/login/registration` — `{ firstName, lastName, email, password }`. Hashes password with bcryptjs and inserts into `users` with a UUID.

## Database Layer

All DB access goes through the pool exported from `src/app/lib/db.js`:
```js
import pool from "@/app/lib/db";
const [rows] = await pool.execute("SELECT ...", [params]);
```

Always use `pool.execute()` with parameterized queries (`?` placeholders), never string interpolation.

**Key tables and columns:**
- `users` — `user_id` (UUID PK), `first_name`, `last_name`, `email` (UNIQUE), `password` (bcrypt)
- `posts` — `post_id`, `title`, `user_id` (FK), `content_id` (FK), `createDate`, `image_url`
- `content` — `content_id`, `mealName`
- `nutrition` — `nutrition_id`, `content_id` (FK), `calories`, `protein`, `carbohydrates`, `fats`, `fiber`
- `ingredients` — `ingredients_id`, `content_id` (FK), `name`, `quantity`, `units` (enum: `g`/`ml`/`cup`/`tbsp`/`teaspoons`/`pcs`)
- `instructions` — `instructions_id`, `content_id` (FK), `steps` (int), `description`
- `mealType` — `mealType_id`, `content_id` (FK), `mealCategory` (enum: `Smoothie`/`breakfast`/`lunch`/`dinner`)
- `mealContentJunction` — `content_id` (FK), `mealType_id` (FK) — junction table
- `friend_request` — `request_id`, `sender_id`, `receiver_id`, `status` (1=pending, 2=accepted, 3=declined)
- `comments` — `comment_id`, `user_id` (FK), `post_id` (FK), `comment_text`
- `likes` — `like_id`, `user_id` (FK), `post_id` (FK)

## Helper / Utility Files

**`src/app/api/post/postDetalis.js`** — Centralized post-creation logic. Exports: `mealName()`, `createPost()`, `commentOnPost()`, `likeThePost()`, `nutritionDeteils()` (typo — do not rename without updating all imports), `mealType()`, `mealContentJunction()`, `ingredientsList()`, `instructions()`. All functions generate UUIDs and perform basic field validation. Most use parameterized queries, but some older functions do not — verify before adding new queries.

**`src/app/api/connections/friendrequest/requestedStatus.js`** — Social graph helpers. Exports: `authorizeStatus()` (updates request status, checks receiver authorization), `getFriends()` (returns accepted friends), `getFriendRequests()` (returns pending requests).

## Post Creation Flow

Creating a full post requires calling multiple API routes in sequence (orchestrated client-side in `src/app/auth/post/page.js`):

1. `POST /api/post/upload` — upload image (FormData, field `image`; JPG/PNG/WebP/GIF, max 5 MB) → returns `{ url }`
2. `POST /api/post/content` — `{ mealName }` → returns `{ content_id }`
3. `POST /api/post/userPost` — `{ title, userId, contentId, imageUrl }`
4. `POST /api/post/nutritions` — `{ contentId, calories, protein, carbs, fats, fiber }`
5. `POST /api/post/mealType` — `{ contentId, mealCategory }` → returns `{ mealTypeId }`
6. `POST /api/post/mealContentJunction` — `{ contentId, mealTypeId }`
7. `POST /api/post/ingredients` — `{ contentId, ingredientName, quantity, unit }` (one call per ingredient)
8. `POST /api/post/instructions` — `{ contentId, step, description }` (one call per step)

Uploaded images are saved to `/public/uploads/` and served as static files.

## Feed & Social APIs

- `GET /api/post/feed` — Returns all posts with joined nutrition, ingredients, instructions, meal type, author info. Prioritizes friends' posts and own posts (`is_priority` flag), ordered by priority DESC then date DESC. Includes `like_count`, `comment_count`, `user_liked`.
- `POST /api/post/likes` — `{ postId }` — toggles like (adds if not liked, removes if already liked)
- `POST /api/post/comments` — `{ postId, commentText }` — adds comment
- `GET /api/post/comments?postId={id}` — returns comments with author details

## Connections / Social Graph

Friend requests live in the `friend_request` table. Status codes: `1` = pending, `2` = accepted, `3` = declined.

- `POST /api/connections/friendrequest` — send request (prevents duplicates and self-requests)
- `GET /api/connections/friendrequest` — fetch incoming pending requests with sender details
- `POST /api/connections/authorize` — `{ requestId, status }` — accept (2) or decline (3); only the receiver can update
- `GET /api/connections/friendsData` — accepted friends joined with user data
- `GET /api/connections/search?q={query}` — LIKE search on name/email, excludes current user

## Known Issues

- **`src/app/middleware.js`** — unused file with `url.pathname.startswith()` (should be `startsWith()`). The active middleware is `src/middleware.js` at the project root. This broken file should be deleted to avoid confusion.
- **`src/app/api/connections/friendsData/route.js`** — References undefined variable `userId`; should be `session.user.id`.
- **`postDetalis.js`** — The function name `nutritionDeteils` is a typo (`Details` misspelled); it is used consistently as-is — do not rename without updating all imports.
- **SQL injection risk** — Some older functions in `postDetalis.js` do not use parameterized queries. Always verify before adding new queries in these files.
- **Duplicate dependency** — `uui` (v1.0.7) is installed alongside `uuid` (v11.1.0); `uui` appears unused and can be removed.
