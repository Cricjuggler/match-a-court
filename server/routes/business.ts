import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../db';
import { signToken, requireBusiness } from '../jwt';

export const businessRouter = Router();

// ────── Auth ──────

businessRouter.post('/api/business/auth/register', async (req, res) => {
  const { email, password, businessName, phone } = req.body ?? {};
  if (!email || !password || !businessName) {
    return res.status(400).json({ error: 'email, password, businessName required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO business_users (email, password_hash, business_name, phone)
      VALUES (${email.toLowerCase()}, ${hash}, ${businessName}, ${phone ?? null})
      RETURNING id, email
    `;
    const user = rows[0] as any;
    const token = await signToken({ sub: user.id, role: 'business', email: user.email });
    res.status(201).json({ token, user: { id: user.id, email: user.email, businessName } });
  } catch (e: any) {
    if (e?.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

businessRouter.post('/api/business/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  try {
    const rows = await sql`
      SELECT id, email, password_hash, business_name FROM business_users
      WHERE email = ${email.toLowerCase()} LIMIT 1
    `;
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0] as any;
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = await signToken({ sub: user.id, role: 'business', email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, businessName: user.business_name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

businessRouter.get('/api/business/me', requireBusiness, async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, email, business_name, phone, created_at FROM business_users
      WHERE id = ${req.businessId!} LIMIT 1
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    const u = rows[0] as any;
    res.json({
      id: u.id, email: u.email, businessName: u.business_name,
      phone: u.phone, createdAt: u.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ────── Courts CRUD ──────

businessRouter.get('/api/business/courts', requireBusiness, async (req, res) => {
  try {
    const rows = await sql`
      SELECT c.*, (SELECT COUNT(*) FROM bookings b WHERE b.court_id = c.id) AS booking_count
      FROM courts c WHERE c.owner_id = ${req.businessId!}
      ORDER BY c.submitted_at DESC
    `;
    res.json(rows.map(mapCourt));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

businessRouter.post('/api/business/courts', requireBusiness, async (req, res) => {
  const { name, location, surface, indoor, openHour, closeHour, photoUrls } = req.body ?? {};
  if (!name || !location || !surface || typeof indoor !== 'boolean' || !openHour || !closeHour) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!Array.isArray(photoUrls) || photoUrls.length < 3) {
    return res.status(400).json({ error: 'Please upload at least 3 photos' });
  }
  if (photoUrls.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 photos allowed' });
  }
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'');
  const mainPhoto = photoUrls[0];
  try {
    const rows = await sql`
      INSERT INTO courts (id, name, location, surface, indoor, open_hour, close_hour, photo_url, photo_urls, owner_id, status, submitted_at)
      VALUES (${id + '-' + Date.now()}, ${name}, ${location}, ${surface}, ${indoor}, ${openHour}, ${closeHour}, ${mainPhoto}, ${photoUrls}, ${req.businessId!}, 'pending', now())
      RETURNING *
    `;
    res.status(201).json(mapCourt(rows[0] as any));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

businessRouter.put('/api/business/courts/:id', requireBusiness, async (req, res) => {
  const { name, location, surface, indoor, openHour, closeHour, photoUrls } = req.body ?? {};
  const mainPhoto = Array.isArray(photoUrls) && photoUrls.length ? photoUrls[0] : null;
  try {
    const rows = await sql`
      UPDATE courts SET
        name = COALESCE(${name ?? null}, name),
        location = COALESCE(${location ?? null}, location),
        surface = COALESCE(${surface ?? null}, surface),
        indoor = COALESCE(${typeof indoor === 'boolean' ? indoor : null}, indoor),
        open_hour = COALESCE(${openHour ?? null}, open_hour),
        close_hour = COALESCE(${closeHour ?? null}, close_hour),
        photo_url = COALESCE(${mainPhoto}, photo_url),
        photo_urls = COALESCE(${photoUrls ?? null}, photo_urls)
      WHERE id = ${req.params.id} AND owner_id = ${req.businessId!}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(mapCourt(rows[0] as any));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

businessRouter.delete('/api/business/courts/:id', requireBusiness, async (req, res) => {
  try {
    const rows = await sql`
      DELETE FROM courts WHERE id = ${req.params.id} AND owner_id = ${req.businessId!}
      RETURNING id
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ────── Bookings for owner's courts ──────

businessRouter.get('/api/business/courts/:id/bookings', requireBusiness, async (req, res) => {
  const dateFilter = req.query.date ? String(req.query.date) : null;
  try {
    // Verify ownership
    const court = await sql`SELECT id FROM courts WHERE id = ${req.params.id} AND owner_id = ${req.businessId!}`;
    if (court.length === 0) return res.status(404).json({ error: 'not found' });

    let rows;
    if (dateFilter) {
      rows = await sql`
        SELECT b.id, b.date, b.start_hour, b.created_at, b.user_id
        FROM bookings b WHERE b.court_id = ${req.params.id} AND b.date = ${dateFilter}
        ORDER BY b.start_hour ASC
      `;
    } else {
      rows = await sql`
        SELECT b.id, b.date, b.start_hour, b.created_at, b.user_id
        FROM bookings b WHERE b.court_id = ${req.params.id}
        ORDER BY b.date DESC, b.start_hour ASC
        LIMIT 200
      `;
    }
    res.json(rows.map((r: any) => ({
      id: r.id,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      startHour: r.start_hour,
      userId: r.user_id,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

businessRouter.delete('/api/business/bookings/:id', requireBusiness, async (req, res) => {
  try {
    const rows = await sql`
      DELETE FROM bookings b USING courts c
      WHERE b.id = ${req.params.id} AND b.court_id = c.id AND c.owner_id = ${req.businessId!}
      RETURNING b.id
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

function mapCourt(r: any) {
  return {
    id: r.id, name: r.name, location: r.location, surface: r.surface,
    indoor: r.indoor, openHour: r.open_hour, closeHour: r.close_hour,
    photoUrl: r.photo_url ?? null,
    photoUrls: r.photo_urls ?? [],
    status: r.status,
    bookingCount: Number(r.booking_count ?? 0),
    submittedAt: r.submitted_at ? String(r.submitted_at) : null,
    reviewNote: r.review_note ?? null,
  };
}
