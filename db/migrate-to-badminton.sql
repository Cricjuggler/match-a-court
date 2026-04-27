-- Run this in the Neon SQL editor to switch from tennis to badminton courts.

-- Add photo_url column if it doesn't exist
ALTER TABLE courts ADD COLUMN IF NOT EXISTS photo_url text;

-- Remove old tennis courts and their bookings
DELETE FROM courts WHERE id IN ('riverside-1', 'riverside-2', 'oakwood-clay', 'central-indoor');

-- Insert new badminton courts
INSERT INTO courts (id, name, location, surface, indoor, open_hour, close_hour, photo_url) VALUES
  ('shuttle-zone-1',  'Shuttle Zone Court 1',  'Shuttle Zone Sports Complex', 'Wooden',    true,  6, 22, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&h=400&fit=crop'),
  ('shuttle-zone-2',  'Shuttle Zone Court 2',  'Shuttle Zone Sports Complex', 'Wooden',    true,  6, 22, 'https://images.unsplash.com/photo-1613918431703-aa50889e3be2?w=600&h=400&fit=crop'),
  ('smash-arena',     'Smash Arena',           'Smash Arena Badminton Club',  'Synthetic', true,  7, 21, 'https://images.unsplash.com/photo-1599391398131-cd12dfc6b030?w=600&h=400&fit=crop'),
  ('city-sports-1',   'City Sports Court A',   'City Sports Centre',          'Mat',       true,  8, 20, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&h=400&fit=crop')
ON CONFLICT (id) DO NOTHING;
