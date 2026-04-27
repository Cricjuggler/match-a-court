-- Run in Neon SQL Editor to add the "Find Players" matchmaking feature

CREATE TABLE IF NOT EXISTS group_bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  host_user_id text NOT NULL,
  host_name    text,
  court_id     text NOT NULL REFERENCES courts(id),
  date         date NOT NULL,
  start_hour   int  NOT NULL,
  slots_needed int  NOT NULL CHECK (slots_needed BETWEEN 1 AND 3),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_participants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_booking_id uuid NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
  user_id          text NOT NULL,
  user_name        text,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_booking_id, user_id)
);

CREATE INDEX IF NOT EXISTS gb_court_date_idx ON group_bookings(court_id, date);
CREATE INDEX IF NOT EXISTS gp_group_idx ON group_participants(group_booking_id);
CREATE INDEX IF NOT EXISTS gp_user_idx ON group_participants(user_id);
