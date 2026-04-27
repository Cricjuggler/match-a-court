import { Router } from 'express';
import { sql } from '../db';
import { requireAuth } from '../auth';

export const groupBookingsRouter = Router();

// ── Create group booking (also creates the underlying court booking) ─────────

groupBookingsRouter.post('/api/group-bookings', requireAuth, async (req, res) => {
  const { courtId, date, startHour, slotsNeeded, hostName } = req.body ?? {};

  if (!courtId || !date || typeof startHour !== 'number' || !slotsNeeded) {
    return res.status(400).json({ error: 'courtId, date, startHour, slotsNeeded required' });
  }
  if (![1, 2, 3].includes(Number(slotsNeeded))) {
    return res.status(400).json({ error: 'slotsNeeded must be 1, 2, or 3' });
  }

  try {
    // Validate court + hours
    const courtRows = await sql`
      SELECT open_hour, close_hour FROM courts
      WHERE id = ${courtId} AND status = 'approved' LIMIT 1
    `;
    if (courtRows.length === 0) return res.status(404).json({ error: 'court not found' });
    const c = courtRows[0] as any;
    if (startHour < c.open_hour || startHour >= c.close_hour) {
      return res.status(400).json({ error: 'slot outside opening hours' });
    }

    // Create the bookings row (host holds the slot)
    let bookingId: string;
    try {
      const bRows = await sql`
        INSERT INTO bookings (court_id, user_id, date, start_hour)
        VALUES (${courtId}, ${req.userId!}, ${date}, ${startHour})
        RETURNING id
      `;
      bookingId = (bRows[0] as any).id;
    } catch (e: any) {
      if (e?.code === '23505') return res.status(409).json({ error: 'That slot is already booked' });
      throw e;
    }

    // Create group booking
    const gbRows = await sql`
      INSERT INTO group_bookings (booking_id, host_user_id, host_name, court_id, date, start_hour, slots_needed)
      VALUES (${bookingId}, ${req.userId!}, ${hostName ?? 'Anonymous'}, ${courtId}, ${date}, ${startHour}, ${Number(slotsNeeded)})
      RETURNING id
    `;

    res.status(201).json({ bookingId, groupBookingId: (gbRows[0] as any).id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ── Get open group bookings (swipe feed) ─────────────────────────────────────

groupBookingsRouter.get('/api/group-bookings', requireAuth, async (req, res) => {
  const userId = req.userId!;
  try {
    const rows = await sql`
      SELECT
        gb.id,
        gb.host_name,
        gb.date,
        gb.start_hour,
        gb.slots_needed,
        gb.created_at,
        c.id   AS court_id,
        c.name AS court_name,
        c.location AS court_location,
        c.surface  AS court_surface,
        c.indoor   AS court_indoor,
        c.photo_url AS court_photo,
        (SELECT COUNT(*) FROM group_participants gp WHERE gp.group_booking_id = gb.id)::int AS joined_count
      FROM group_bookings gb
      JOIN courts c ON c.id = gb.court_id
      WHERE
        gb.host_user_id != ${userId}
        AND gb.date >= CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM group_participants gp
          WHERE gp.group_booking_id = gb.id AND gp.user_id = ${userId}
        )
        AND (SELECT COUNT(*) FROM group_participants gp WHERE gp.group_booking_id = gb.id) < gb.slots_needed
      ORDER BY gb.date ASC, gb.start_hour ASC
    `;

    res.json(rows.map((r: any) => ({
      id: r.id,
      hostName: r.host_name,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      startHour: r.start_hour,
      slotsNeeded: r.slots_needed,
      joinedCount: r.joined_count,
      spotsLeft: r.slots_needed - r.joined_count,
      courtId: r.court_id,
      courtName: r.court_name,
      courtLocation: r.court_location,
      courtSurface: r.court_surface,
      courtIndoor: r.court_indoor,
      courtPhoto: r.court_photo ?? null,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ── Join a group booking (swipe right) ───────────────────────────────────────

groupBookingsRouter.post('/api/group-bookings/:id/join', requireAuth, async (req, res) => {
  const userId = req.userId!;
  const gbId = req.params.id;
  const { userName } = req.body ?? {};

  try {
    // Fetch group booking
    const gbRows = await sql`
      SELECT gb.*,
        (SELECT COUNT(*) FROM group_participants gp WHERE gp.group_booking_id = gb.id)::int AS joined_count
      FROM group_bookings gb
      WHERE gb.id = ${gbId}
    `;
    if (gbRows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const gb = gbRows[0] as any;

    if (gb.host_user_id === userId) {
      return res.status(400).json({ error: 'You are the host of this game' });
    }
    if (gb.joined_count >= gb.slots_needed) {
      return res.status(409).json({ error: 'This game is already full' });
    }
    if (new Date(gb.date) < new Date(new Date().toISOString().slice(0, 10))) {
      return res.status(400).json({ error: 'This game has already passed' });
    }

    // Add participant
    try {
      await sql`
        INSERT INTO group_participants (group_booking_id, user_id, user_name)
        VALUES (${gbId}, ${userId}, ${userName ?? 'Anonymous'})
      `;
    } catch (e: any) {
      if (e?.code === '23505') return res.status(409).json({ error: 'Already joined' });
      throw e;
    }

    // Notify the host
    try {
      const playerName = userName ?? 'A player';
      await sql`
        INSERT INTO notifications (user_id, type, title, body, data)
        SELECT
          gb.host_user_id,
          'player_joined',
          'New player joined your game!',
          ${playerName} || ' joined your game at ' || c.name || ' on ' ||
            TO_CHAR(gb.date::date, 'Dy, Mon DD') || ' at ' ||
            LPAD(gb.start_hour::text, 2, '0') || ':00',
          jsonb_build_object(
            'groupBookingId', ${gbId},
            'courtName', c.name,
            'date', gb.date::text,
            'startHour', gb.start_hour,
            'playerName', ${playerName}
          )
        FROM group_bookings gb
        JOIN courts c ON c.id = gb.court_id
        WHERE gb.id = ${gbId}
      `;
    } catch (_) { /* non-fatal */ }

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ── Leave a group booking ─────────────────────────────────────────────────────

groupBookingsRouter.delete('/api/group-bookings/:id/join', requireAuth, async (req, res) => {
  const userId = req.userId!;
  const gbId = req.params.id;
  try {
    const rows = await sql`
      DELETE FROM group_participants
      WHERE group_booking_id = ${gbId} AND user_id = ${userId}
      RETURNING id
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Not joined' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ── My group games (hosting + joined) ────────────────────────────────────────

groupBookingsRouter.get('/api/my-group-games', requireAuth, async (req, res) => {
  const userId = req.userId!;
  try {
    const [hosting, joined] = await Promise.all([
      sql`
        SELECT gb.*, c.name AS court_name, c.location AS court_location, c.photo_url AS court_photo,
          (SELECT COUNT(*) FROM group_participants gp WHERE gp.group_booking_id = gb.id)::int AS joined_count
        FROM group_bookings gb
        JOIN courts c ON c.id = gb.court_id
        WHERE gb.host_user_id = ${userId}
        ORDER BY gb.date ASC, gb.start_hour ASC
      `,
      sql`
        SELECT gb.*, c.name AS court_name, c.location AS court_location, c.photo_url AS court_photo,
          gp2.joined_at,
          (SELECT COUNT(*) FROM group_participants gp WHERE gp.group_booking_id = gb.id)::int AS joined_count
        FROM group_participants gp2
        JOIN group_bookings gb ON gb.id = gp2.group_booking_id
        JOIN courts c ON c.id = gb.court_id
        WHERE gp2.user_id = ${userId}
        ORDER BY gb.date ASC, gb.start_hour ASC
      `,
    ]);

    const mapGb = (r: any, role: 'host' | 'player') => ({
      id: r.id,
      role,
      hostName: r.host_name,
      courtName: r.court_name,
      courtLocation: r.court_location,
      courtPhoto: r.court_photo ?? null,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      startHour: r.start_hour,
      slotsNeeded: r.slots_needed,
      joinedCount: r.joined_count,
      spotsLeft: r.slots_needed - r.joined_count,
    });

    res.json({
      hosting: hosting.map((r: any) => mapGb(r, 'host')),
      joined: joined.map((r: any) => mapGb(r, 'player')),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});
