import './loadEnv';
import path from 'path';
import cors from 'cors';
import express from 'express';
import { sql } from './db';
import { requireAuth, resolveUser } from './auth';
import { businessRouter } from './routes/business';
import { adminRouter } from './routes/admin';
import { groupBookingsRouter } from './routes/groupBookings';
import { notificationsRouter } from './routes/notifications';
import { uploadRouter } from './upload';

const app = express();
app.use(express.json());
const ALLOWED_ORIGINS = [
  'https://match-a-court.vercel.app',
  'https://match-a-court-business.vercel.app',
  'https://match-a-court-admin.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Neon Auth middleware (player app)
app.use(resolveUser);

// Mount routers
app.use(businessRouter);
app.use(adminRouter);
app.use(groupBookingsRouter);
app.use(notificationsRouter);
app.use(uploadRouter);

// ---------- Courts (public) ----------

app.get('/api/courts', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id, name, location, surface, indoor, open_hour, close_hour, photo_url, photo_urls
      FROM courts WHERE status = 'approved' ORDER BY location, name
    `;
    res.json(
      rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        location: r.location,
        surface: r.surface,
        indoor: r.indoor,
        openHour: r.open_hour,
        closeHour: r.close_hour,
        photoUrl: r.photo_url ?? null,
        photoUrls: r.photo_urls ?? [],
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/courts/:id', async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, name, location, surface, indoor, open_hour, close_hour, photo_url, photo_urls
      FROM courts WHERE id = ${req.params.id} AND status = 'approved' LIMIT 1
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    const r: any = rows[0];
    res.json({
      id: r.id, name: r.name, location: r.location, surface: r.surface,
      indoor: r.indoor, openHour: r.open_hour, closeHour: r.close_hour,
      photoUrl: r.photo_url ?? null,
      photoUrls: r.photo_urls ?? [],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/courts/:id/bookings', async (req, res) => {
  const date = String(req.query.date ?? '');
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    const rows = await sql`
      SELECT start_hour FROM bookings
      WHERE court_id = ${req.params.id} AND date = ${date}
    `;
    res.json(rows.map((r: any) => ({ startHour: r.start_hour })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ---------- Bookings (auth required) ----------

app.post('/api/bookings', requireAuth, async (req, res) => {
  const { courtId, date, startHour } = req.body ?? {};
  if (!courtId || !date || typeof startHour !== 'number') {
    return res.status(400).json({ error: 'missing fields' });
  }

  try {
    const courtRows = await sql`
      SELECT open_hour, close_hour FROM courts WHERE id = ${courtId} LIMIT 1
    `;
    if (courtRows.length === 0) return res.status(404).json({ error: 'court not found' });
    const c: any = courtRows[0];
    if (startHour < c.open_hour || startHour >= c.close_hour) {
      return res.status(400).json({ error: 'slot outside opening hours' });
    }

    const rows = await sql`
      INSERT INTO bookings (court_id, user_id, date, start_hour)
      VALUES (${courtId}, ${req.userId!}, ${date}, ${startHour})
      RETURNING id
    `;
    res.status(201).json({ id: rows[0].id });
  } catch (e: any) {
    if (e?.code === '23505') return res.status(409).json({ error: 'slot taken' });
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      DELETE FROM bookings WHERE id = ${req.params.id} AND user_id = ${req.userId!}
      RETURNING id
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/my-bookings', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT b.id, b.court_id, b.user_id, b.date, b.start_hour, b.created_at,
             c.name AS court_name, c.location AS court_location
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      WHERE b.user_id = ${req.userId!}
        AND NOT EXISTS (
          SELECT 1 FROM group_bookings gb WHERE gb.booking_id = b.id
        )
      ORDER BY b.date ASC, b.start_hour ASC
    `;
    res.json(
      rows.map((r: any) => ({
        id: r.id,
        courtId: r.court_id,
        userId: r.user_id,
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        startHour: r.start_hour,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        courtName: r.court_name,
        courtLocation: r.court_location,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
