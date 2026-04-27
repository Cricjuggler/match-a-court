import { Router } from 'express';
import { sql } from '../db';
import { requireAuth } from '../auth';

export const notificationsRouter = Router();

const mapNotif = (r: any) => ({
  id: r.id,
  type: r.type,
  title: r.title,
  body: r.body,
  data: r.data ?? {},
  read: r.read,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
});

// GET /api/notifications — fetch all for current user (newest first)
notificationsRouter.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM notifications
      WHERE user_id = ${req.userId!}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    res.json(rows.map(mapNotif));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/notifications/unread-count
notificationsRouter.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT COUNT(*)::int AS count FROM notifications
      WHERE user_id = ${req.userId!} AND read = false
    `;
    res.json({ count: (rows[0] as any).count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
notificationsRouter.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await sql`
      UPDATE notifications SET read = true
      WHERE id = ${req.params.id} AND user_id = ${req.userId!}
    `;
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
notificationsRouter.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await sql`
      UPDATE notifications SET read = true
      WHERE user_id = ${req.userId!} AND read = false
    `;
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});
