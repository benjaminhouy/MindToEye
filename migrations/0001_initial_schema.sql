-- Migration 0001: Initial Schema

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "client_name" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "user_id" INTEGER NOT NULL,
  CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Brand concepts table
CREATE TABLE IF NOT EXISTS "brand_concepts" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "brand_inputs" JSONB NOT NULL,
  "brand_output" JSONB NOT NULL,
  "is_active" BOOLEAN DEFAULT FALSE,
  CONSTRAINT "fk_project" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);

-- Create demo user
INSERT INTO "users" ("username", "password")
VALUES ('demo', 'demo123')
ON CONFLICT ("username") DO NOTHING;