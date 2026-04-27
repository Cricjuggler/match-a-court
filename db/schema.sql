-- Run this once in the Neon SQL editor AFTER enabling Neon Auth.
-- Neon Auth creates the neon_auth.users_sync table automatically.

CREATE TABLE IF NOT EXISTS courts (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  location     text NOT NULL,
  surface      text NOT NULL,           -- 'Wooden' | 'Synthetic' | 'Mat' | 'Cement'
  indoor       boolean NOT NULL,
  open_hour    int NOT NULL,
  close_hour   int NOT NULL,
  photo_url    text
);

CREATE TABLE IF NOT EXISTS bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id     text NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  user_id      text NOT NULL,           -- references neon_auth.users_sync.id
  date         date NOT NULL,
  start_hour   int  NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (court_id, date, start_hour)   -- DB-enforced: no double booking
);

CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_lookup_idx ON bookings(court_id, date);

-- Seed badminton courts
INSERT INTO courts (id, name, location, surface, indoor, open_hour, close_hour, photo_url) VALUES
  ('shuttle-zone-1',  'Shuttle Zone Court 1',  'Shuttle Zone Sports Complex', 'Wooden',    true,  6, 22, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&h=400&fit=crop'),
  ('shuttle-zone-2',  'Shuttle Zone Court 2',  'Shuttle Zone Sports Complex', 'Wooden',    true,  6, 22, 'https://images.unsplash.com/photo-1613918431703-aa50889e3be2?w=600&h=400&fit=crop'),
  ('smash-arena',     'Smash Arena',           'Smash Arena Badminton Club',  'Synthetic', true,  7, 21, 'https://images.unsplash.com/photo-1599391398131-cd12dfc6b030?w=600&h=400&fit=crop'),
  ('city-sports-1',   'City Sports Court A',   'City Sports Centre',          'Mat',       true,  8, 20, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&h=400&fit=crop')
ON CONFLICT (id) DO NOTHING;
