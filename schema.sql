-- FoodieHub Database Schema (PostgreSQL / Supabase)
-- Run this in the Supabase SQL editor to initialize all tables.

CREATE TABLE IF NOT EXISTS users (
  user_id     TEXT        NOT NULL PRIMARY KEY,
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL UNIQUE,
  password    TEXT        NOT NULL DEFAULT '',
  profile_pic TEXT,
  bio         TEXT,
  is_admin    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content (
  content_id TEXT NOT NULL PRIMARY KEY,
  mealname   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  post_id    TEXT NOT NULL PRIMARY KEY,
  title      TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
  createdate DATE,
  image_url  TEXT,
  visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (visibility IN ('friends', 'everyone'))
);

CREATE TABLE IF NOT EXISTS nutrition (
  nutrition_id  TEXT         NOT NULL PRIMARY KEY,
  content_id    TEXT         NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
  calories      NUMERIC(10,2),
  protein       NUMERIC(10,2),
  carbohydrates NUMERIC(10,2),
  fats          NUMERIC(10,2),
  fiber         NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS ingredients (
  ingredients_id TEXT NOT NULL PRIMARY KEY,
  content_id     TEXT NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  quantity       TEXT,
  units          TEXT CHECK (units IN (
    'g', 'kg', 'oz', 'lb',
    'ml', 'l', 'cup', 'tbsp', 'tsp', 'teaspoons',
    'pcs', 'piece', 'slice', 'scoop', 'cubes',
    'pinch', 'handful', 'bunch', 'can', 'bottle'
  ))
);

CREATE TABLE IF NOT EXISTS instructions (
  instructions_id TEXT    NOT NULL PRIMARY KEY,
  content_id      TEXT    NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
  steps           INTEGER NOT NULL,
  description     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS mealtype (
  mealtype_id  TEXT NOT NULL PRIMARY KEY,
  content_id   TEXT NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
  mealcategory TEXT NOT NULL CHECK (mealcategory IN ('Smoothie', 'breakfast', 'lunch', 'dinner'))
);

CREATE TABLE IF NOT EXISTS mealcontentjunction (
  content_id  TEXT NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
  mealtype_id TEXT NOT NULL REFERENCES mealtype(mealtype_id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, mealtype_id)
);

CREATE TABLE IF NOT EXISTS friend_request (
  request_id  TEXT        NOT NULL PRIMARY KEY,
  sender_id   TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  receiver_id TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status      SMALLINT    NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  like_id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id   TEXT        NOT NULL PRIMARY KEY,
  user_id      TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id      TEXT        NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  comment_text TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  message_id   TEXT        NOT NULL PRIMARY KEY,
  sender_id    TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  receiver_id  TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  message_text TEXT        NOT NULL,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id TEXT        NOT NULL PRIMARY KEY,
  user_id         TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  from_user_id    TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type            TEXT        NOT NULL,
  post_id         TEXT        REFERENCES posts(post_id) ON DELETE SET NULL,
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id  TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        REFERENCES users(user_id) ON DELETE SET NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_credits (
  user_id TEXT    NOT NULL PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0
);
