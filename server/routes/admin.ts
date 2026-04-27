import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../db';
import { signToken, requireAdmin } from '../jwt';

export const adminRouter = Router();

// ────── Setup (first admin only) ──────

adminRouter.post('/api/admin/auth/setup', async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name required' });
  }
  try {
    const existing = await sql`SELECT COUNT(*) AS cnt FROM admin_users`;
    if (Number((existing[0] as any).cnt) > 0) {
      return res.status(403).json({ error: 'Admin already exists. Use login.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO admin_users (email, password_hash, name)
      VALUES (${email.toLowerCase()}, ${hash}, ${name})
      RETURNING id, email, name
    `;
    const u = rows[0] as any;
    const token = await signToken({ sub: u.id, role: 'admin', email: u.email });
    res.status(201).json({ token, user: { id: u.id, email: u.email, name: u.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

adminRouter.post('/api/admin/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  try {
    const rows = await sql`
      SELECT id, email, password_hash, name FROM admin_users
      WHERE email = ${email.toLowerCase()} LIMIT 1
    `;
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const u = rows[0] as any;
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = await signToken({ sub: u.id, role: 'admin', email: u.email });
    res.json({ token, user: { id: u.id, email: u.email, name: u.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

adminRouter.get('/api/admin/me', requireAdmin, async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, email, name, created_at FROM admin_users WHERE id = ${req.adminId!} LIMIT 1
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    const u = rows[0] as any;
    res.json({ id: u.id, email: u.email, name: u.name, createdAt: u.created_at });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ────── Courts — review + listing ──────

adminRouter.get('/api/admin/courts', requireAdmin, async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  try {
    let rows;
    if (status) {
      rows = await sql`
        SELECT c.*, bu.email AS owner_email, bu.business_name AS owner_business,
               (SELECT COUNT(*) FROM bookings b WHERE b.court_id = c.id) AS booking_count
        FROM courts c
        LEFT JOIN business_users bu ON bu.id = c.owner_id
        WHERE c.status = ${status}
        ORDER BY c.submitted_at DESC
      `;
    } else {
      rows = await sql`
        SELECT c.*, bu.email AS owner_email, bu.business_name AS owner_business,
               (SELECT COUNT(*) FROM bookings b WHERE b.court_id = c.id) AS booking_count
        FROM courts c
        LEFT JOIN business_users bu ON bu.id = c.owner_id
        ORDER BY c.submitted_at DESC
      `;
    }
    res.json(rows.map((r: any) => ({
      id: r.id, name: r.name, location: r.location, surface: r.surface,
      indoor: r.indoor, openHour: r.open_hour, closeHour: r.close_hour,
      photoUrl: r.photo_url ?? null, status: r.status,
      ownerId: r.owner_id, ownerEmail: r.owner_email, ownerBusiness: r.owner_business,
      bookingCount: Number(r.booking_count ?? 0),
      submittedAt: r.submitted_at ? String(r.submitted_at) : null,
      reviewedAt: r.reviewed_at ? String(r.reviewed_at) : null,
      reviewNote: r.review_note ?? null,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

adminRouter.patch('/api/admin/courts/:id/review', requireAdmin, async (req, res) => {
  const { status, note } = req.body ?? {};
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
  }
  try {
    const rows = await sql`
      UPDATE courts SET status = ${status}, reviewed_at = now(), review_note = ${note ?? null}
      WHERE id = ${req.params.id}
      RETURNING id, status
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ────── Businesses ──────

adminRouter.get('/api/admin/businesses', requireAdmin, async (_req, res) => {
  try {
    const rows = await sql`
      SELECT bu.*,
        (SELECT COUNT(*) FROM courts c WHERE c.owner_id = bu.id) AS court_count
      FROM business_users bu ORDER BY bu.created_at DESC
    `;
    res.json(rows.map((r: any) => ({
      id: r.id, email: r.email, businessName: r.business_name,
      phone: r.phone, createdAt: r.created_at,
      courtCount: Number(r.court_count ?? 0),
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});
