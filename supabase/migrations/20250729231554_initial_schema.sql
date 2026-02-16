CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "username" varchar,
  "phone" varchar,
  "chat_id" bigint,
  "club_id" integer,
  "subscription_id" integer,
  "subscription_date" timestamp,
  "created_at" timestamp default now()
);

CREATE TABLE IF NOT EXISTS "dim_subscription_types" (
  "id" integer PRIMARY KEY,
  "code" varchar,
  "name" varchar,
  "price" float
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "user_id" uuid,
  "price" float,
  "package_id" varchar,
  "club_id" integer,
  "receipt_url" varchar,
  "status_id" integer,
  "created_at" timestamp default now()
);

CREATE TABLE IF NOT EXISTS "dim_status_types" (
  "id" integer PRIMARY KEY,
  "code" varchar,
  "name" varchar
);

CREATE TABLE IF NOT EXISTS "clubs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "code" varchar,
  "name" varchar
);

ALTER TABLE "users" ADD FOREIGN KEY ("subscription_id") REFERENCES "dim_subscription_types" ("id");

ALTER TABLE "users" ADD FOREIGN KEY ("club_id") REFERENCES "clubs" ("id");

ALTER TABLE "orders" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "orders" ADD FOREIGN KEY ("status_id") REFERENCES "dim_status_types" ("id");

ALTER TABLE "orders" ADD FOREIGN KEY ("club_id") REFERENCES "clubs" ("id");

CREATE TABLE IF NOT EXISTS "invite_links" (
  id          uuid primary key default gen_random_uuid(),
  club_id     bigint references clubs(id) not null,
  role        text default 'reception' not null,
  expires_at  timestamptz default now() + interval '24 h',
  used_at     timestamptz
);