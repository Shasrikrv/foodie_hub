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
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres

NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<unused>

GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>

ANTHROPIC_API_KEY=<claude-api-key>

ADMIN_EMAIL=<admin-email>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<gmail-address>
EMAIL_PASS=<gmail-app-password>
```

`JWT_SECRET` is unused — NextAuth handles JWT internally via `NEXTAUTH_SECRET`. `DATABASE_URL` is the Supabase connection string (found in Supabase → Project Settings → Database → Connection string → URI). Run `schema.sql` in the Supabase SQL editor to initialize all tables.

Email vars are optional in development — `src/app/lib/email.js` auto-creates an [Ethereal](https://ethereal.email) test account and logs preview URLs to the console when `EMAIL_USER`/`EMAIL_PASS` are absent.

## Architecture Overview

FoodieHub is a **Next.js 15 App Router** social food-sharing platform where users register, connect with friends, and share meal recipes with nutritional data.

**Stack:** Next.js 15 (App Router) + React 19, MySQL via `mysql2/promise` connection pool, NextAuth.js v4 (JWT strategy, Credentials + Google OAuth providers), Tailwind CSS v4, Zod (registration validation), bcryptjs for passwords, uuid for all primary keys, Anthropic Claude Haiku for AI features, Nodemailer for email, Cloudinary for image hosting.

**Path alias:** `@/*` maps to `src/*`.

## Auth Flow

NextAuth is configured in `src/app/api/auth/[...nextauth]/options.js` with two providers:
- **Credentials** — email/password login; verifies with `bcryptjs.compare()`
- **Google OAuth** — auto-creates a new `users` row on first sign-in (no password set)

The JWT token embeds `user_id`, `email`, `name`, `isAdmin`, and `profilePic`. Session updates (e.g., after profile pic change) are propagated by calling `update("refresh")` from `useSession()`, which re-syncs from the DB via the `jwt()` callback.

Protected routes are gated in `src/middleware.js` (project root) using `withAuth()` from NextAuth — it redirects authenticated users away from `/` to `/auth/home` and enforces token presence for all `/auth/*` routes.

To read the current user in a Route Handler:
```js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
const session = await getServerSession(authOptions);
// session.user.id — UUID from the DB
// session.user.isAdmin — boolean
// session.user.profilePic — URL or null
```

All pages under `src/app/auth/` are wrapped by `src/app/auth/layout.js`, which renders `src/app/auth/providers.js` (a `"use client"` component providing `SessionProvider`). Do not add a second `SessionProvider` wrapper in any child component.

**Registration:** `POST /api/user/login/registration` — `{ firstName, lastName, email, password }`. Validates with Zod (min 8 chars, requires uppercase/lowercase/number/special char), hashes with bcryptjs (salt 12), inserts with UUID.

**Password Reset Flow:**
1. `POST /api/auth/forgot-password` — generates a reset token stored in `password_reset_tokens`, emails a link
2. `POST /api/auth/reset-password` — validates token (1-hour expiry, single-use), updates password

## Database Layer

All DB access goes through the pool exported from `src/app/lib/db.js`:
```js
import pool from "@/app/lib/db";
const [rows] = await pool.query("SELECT ...", [params]);
```

Always use parameterized queries (`?` placeholders) — never string interpolation. Pool is configured with `connectionLimit: 20`, keep-alive, and 60s idle timeout.

**Key tables and columns:**
- `users` — `user_id` (UUID PK), `first_name`, `last_name`, `email` (UNIQUE), `password` (bcrypt, nullable for OAuth), `profile_pic`, `bio`, `is_admin`
- `posts` — `post_id`, `title`, `user_id` (FK), `content_id` (FK), `createDate`, `image_url`, `visibility` (enum)
- `content` — `content_id`, `mealName`
- `nutrition` — `nutrition_id`, `content_id` (FK), `calories`, `protein`, `carbohydrates`, `fats`, `fiber`
- `ingredients` — `ingredients_id`, `content_id` (FK), `name`, `quantity`, `units` (enum: `g`/`ml`/`cup`/`tbsp`/`teaspoons`/`pcs`)
- `instructions` — `instructions_id`, `content_id` (FK), `steps` (int), `description`
- `mealType` — `mealType_id`, `content_id` (FK), `mealCategory` (enum: `Smoothie`/`breakfast`/`lunch`/`dinner`)
- `mealContentJunction` — `content_id` (FK), `mealType_id` (FK) — junction table
- `friend_request` — `request_id`, `sender_id`, `receiver_id`, `status` (1=pending, 2=accepted, 3=declined)
- `comments` — `comment_id`, `user_id` (FK), `post_id` (FK), `comment_text`, `created_at`
- `likes` — `like_id`, `user_id` (FK), `post_id` (FK) — unique constraint on `(user_id, post_id)`
- `messages` — `message_id`, `sender_id`, `receiver_id`, `message_text`, `created_at`, `is_read`
- `notifications` — `notification_id`, `user_id` (FK), `type`, `content`, `is_read`, `post_id` (nullable FK), `from_user_id` (nullable FK)
- `support_tickets` — `support_id`, `user_id` (nullable FK — nullified on account deletion), `subject`, `message`, `status` (open/resolved), `created_at`
- `password_reset_tokens` — `token`, `user_id` (FK), `expires_at`, `used` (boolean)
- `ai_credits` — `user_id` (FK), `credits` (int)

## Helper / Utility Files

**`src/app/api/post/postDetalis.js`** — Centralized post-creation logic. Exports: `mealName()`, `createPost()`, `commentOnPost()`, `likeThePost()`, `nutritionDeteils()` (typo — do not rename without updating all imports), `mealType()`, `mealContentJunction()`, `ingredientsList()`, `instructions()`. Some older functions do not use parameterized queries — verify before adding new queries.

**`src/app/api/connections/friendrequest/requestedStatus.js`** — Social graph helpers. Exports: `authorizeStatus()` (updates request status, checks receiver authorization), `getFriends()` (returns accepted friends), `getFriendRequests()` (returns pending requests).

**`src/app/lib/email.js`** — Nodemailer wrapper with auto-Ethereal fallback for development. Exports:
- `sendPasswordResetEmail(to, resetUrl)` — user-initiated reset link
- `sendAdminReply(to, subject, message)` — admin reply to support tickets
- `sendAdminResetLink(to, resetUrl)` — admin-generated reset link
- `sendTestEmail(to)` — SMTP configuration verification

**`src/app/components/EmojiPicker.js`** — Reusable emoji picker with food-focused categories. Used in post creation, comments, and chat. Closes on click-outside.

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

Edit (`/api/post/edit`) and delete (`/api/post/delete`) endpoints also exist.

## Feed & Social APIs

- `GET /api/post/feed` — Returns all posts with joined nutrition, ingredients, instructions, meal type, author info. Prioritizes friends' posts and own posts (`is_priority` flag), ordered by priority DESC then date DESC. Includes `like_count`, `comment_count`, `user_liked`. Supports `?post=<id>` deep-link — the home page scrolls to and highlights the target post for 3 seconds.
- `GET /api/post/myPosts` — returns only the current user's posts
- `POST /api/post/likes` — `{ postId }` — toggles like
- `GET /api/post/comments?postId={id}` — returns comments with author details; home page polls this every 7 seconds when a comment section is open
- `POST /api/post/comments` — `{ postId, commentText }` — adds comment, auto-notifies post owner
- `PATCH /api/post/comments` — `{ commentId, commentText }` — edit own comment only
- `DELETE /api/post/comments?commentId={id}` — delete: comment owner or post author can delete

## Connections / Social Graph

Friend requests live in the `friend_request` table. Status codes: `1` = pending, `2` = accepted, `3` = declined.

- `POST /api/connections/friendrequest` — send request (prevents duplicates and self-requests)
- `GET /api/connections/friendrequest` — fetch incoming pending requests with sender details
- `POST /api/connections/authorize` — `{ requestId, status }` — accept (2) or decline (3); only the receiver can update
- `GET /api/connections/friendsData` — accepted friends joined with user data
- `GET /api/connections/search?q={query}` — LIKE search on name/email, excludes current user
- `POST /api/connections/unfollow` — `{ friendId }` — removes accepted friendship (deletes the `friend_request` row)

## Chat System

Chat (`src/app/auth/chat/page.js`) is friends-only messaging implemented via polling every 4 seconds.

- `GET /api/chat` — returns accepted friends list with last message and unread count, sorted by last message DESC
- `GET /api/chat?friendId=<id>` — returns full message history; marks incoming messages as read
- `POST /api/chat` — `{ receiverId, text }` — sends a message; validates friendship (status=2) before inserting

Polling pauses when tab is hidden (`document.visibilitychange`). A `?friend=<userId>` URL param auto-selects a conversation on mount. `activeFriendRef` and `handledFriendIdRef` prevent race conditions between polling and URL-param handling.

## Admin Panel

`src/app/auth/admin/page.js` is gated behind `session.user.isAdmin`. The `/api/admin` route handler supports the following operations via `?action=` query param or POST body:

**User Management:**
- View all users with post count, friend count, AI credit balance
- Toggle admin privileges (`toggleAdmin`)
- Grant AI credits (`grantCredits`)
- Delete user accounts (`deleteUser`) — transaction-based cascade across 12 tables; `support_tickets.user_id` is nullified (not deleted) to preserve ticket history

**Support Ticket System:**
- View all tickets filtered by status (open/resolved)
- Auto-categorizes ticket type (password, account, bug, general) from subject keywords
- Reply to users via email (`replyTicket`) using `sendAdminReply()`
- Generate password reset links (`generateResetLink`) — 1-hour expiry, emailed or displayed for manual sharing

**Email / SMTP Testing:**
- Send a test email to verify SMTP configuration (`sendTestEmail`)
- In-app setup guide for Gmail App Passwords
- Falls back to Ethereal preview URL in development when SMTP is unconfigured

**AI Recipe Suggestion (Admin-Only):**
`POST /api/ai/suggest` uses **Claude Haiku** (`claude-haiku-4-5-20251001`) to generate structured recipe data.

Request formats:
- Multipart form-data with field `image` (JPG/PNG/WebP/GIF) — converts to base64
- JSON body with `imageUrl` (fetches and converts to base64) or `prompt` (text-only fallback)

Response: `{ suggestion: { title, mealName, mealCategory, calories, protein, carbs, fats, fiber, ingredients: [{name, quantity, unit}], instructions: [{step, description}] } }`

Strips markdown code fences from Claude's output. On JSON parse failure returns `{ suggestion: { raw: <text> } }`. No rate limiting implemented; AI credits tracked in `ai_credits` table but not yet enforced server-side.

## Account Management

- `GET /api/user/profile` — fetch current user profile
- `POST /api/user/profile` — update profile fields (name, bio, profile pic upload)
- `DELETE /api/user/account` — self-service account deletion; same cascading cleanup as admin deletion (transaction across 12 tables, nullifies support ticket `user_id`)

## Notifications

- `GET /api/notifications` — returns all notifications for current user, ordered by date DESC
- Notification types: `comment`, `like`, `friend_request`, `friend_accepted`
- `notifications` table includes `post_id` and `from_user_id` for deep-linking
- The notifications page auto-marks all as read on load; unread count badge shown in nav

## PWA

Configured in `public/manifest.json` (display: standalone, theme: orange `#f97316`) and wired up in `src/app/layout.js` via Next.js metadata. Icons: `public/icon-192.png` and `public/icon-512.png`.

## Known Issues

- **`src/app/middleware.js`** — unused file with `url.pathname.startswith()` (should be `startsWith()`). The active middleware is `src/middleware.js` at the project root. Delete this file to avoid confusion.
- **`src/app/api/connections/friendsData/route.js`** — References undefined variable `userId`; should be `session.user.id`.
- **`postDetalis.js`** — `nutritionDeteils` is a persistent typo; used consistently as-is — do not rename without updating all imports.
- **SQL injection risk** — Some older functions in `postDetalis.js` do not use parameterized queries. Always verify before adding new queries in these files.
- **Duplicate dependency** — `uui` (v1.0.7) is installed alongside `uuid` (v11.1.0); `uui` appears unused and can be removed.
- **AI credits not enforced** — `ai_credits` table exists and admins can grant credits, but the `/api/ai/suggest` route does not deduct or check credit balance before calling the Anthropic API.
