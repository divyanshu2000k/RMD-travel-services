/**
 * RMD TRAVELS — backend/server.js
 * Node.js + Express backend for bus search
 *
 * Run:  node backend/server.js
 * API:  GET /api/search?from=Samastipur&to=Muzaffarpur&date=2025-08-10
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the whole RMD site statically (index.html, css/, java/, data/, pictures/)
app.use(express.static(path.join(__dirname, '..')));

// ── Load schedule database ──────────────────────────────────
const DB_PATH = path.join(__dirname, '..', 'data', 'schedule.json');
const DB      = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// ── Helpers ─────────────────────────────────────────────────

/**
 * Convert "HH:MM" string to total minutes from midnight.
 */
function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Add `offsetMinutes` to a "HH:MM" string, return new "HH:MM".
 */
function addMinutes(timeStr, offsetMinutes) {
  if (!timeStr) return null;
  const total = toMinutes(timeStr) + offsetMinutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

/**
 * Normalise a stop name for comparison (lowercase, trim, collapse spaces).
 */
function norm(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Return the depart time of `stopName` in the given trip stop list.
 * Falls back to arrive time if depart is null.
 */
function getStopTime(stops, stopName) {
  const s = stops.find(s => norm(s.stop) === norm(stopName));
  if (!s) return null;
  return s.depart ?? s.arrive ?? null;
}

/**
 * Return the arrive time of `stopName` in the given trip stop list.
 * Falls back to depart time if arrive is null.
 */
function getArriveTime(stops, stopName) {
  const s = stops.find(s => norm(s.stop) === norm(stopName));
  if (!s) return null;
  return s.arrive ?? s.depart ?? null;
}

/**
 * Check whether `from` stop appears before `to` stop in a trip's stop list.
 */
function fromBeforeTo(stops, fromName, toName) {
  const idxFrom = stops.findIndex(s => norm(s.stop) === norm(fromName));
  const idxTo   = stops.findIndex(s => norm(s.stop) === norm(toName));
  return idxFrom !== -1 && idxTo !== -1 && idxFrom < idxTo;
}

/**
 * Build every result row: one per (bus × trip) that serves the requested
 * from→to pair.  Each subsequent bus is shifted +15 minutes.
 */
function findBuses(from, to) {
  const results = [];

  DB.buses.forEach((bus, busIndex) => {
    const offsetMin = busIndex * DB.meta.busIntervalMinutes; // 0, 15, 30, 45, 60

    DB.baseTimetable.trips.forEach(trip => {
      if (!fromBeforeTo(trip.stops, from, to)) return;

      const rawDepart = getStopTime(trip.stops, from);
      const rawArrive = getArriveTime(trip.stops, to);

      if (!rawDepart || !rawArrive) return;

      const depart = addMinutes(rawDepart, offsetMin);
      const arrive = addMinutes(rawArrive, offsetMin);

      // Duration in minutes
      const depMin = toMinutes(depart);
      const arrMin = toMinutes(arrive);
      const durMin = arrMin >= depMin ? arrMin - depMin : 0;
      const hours  = Math.floor(durMin / 60);
      const mins   = durMin % 60;
      const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      results.push({
        busId:     bus.id,
        tripNo:    trip.tripNo,
        direction: trip.direction,
        from,
        to,
        depart,
        arrive,
        duration,
        seats:     bus.seats,
        status:    'Available'
      });
    });
  });

  // Sort by departure time
  results.sort((a, b) => toMinutes(a.depart) - toMinutes(b.depart));

  return results;
}

// ── API Routes ───────────────────────────────────────────────

/**
 * GET /api/stops
 * Returns the list of all stops (for the dropdown).
 */
app.get('/api/stops', (req, res) => {
  res.json({ stops: DB.stops });
});

/**
 * GET /api/search?from=...&to=...&date=...
 *
 * Query params:
 *   from  — origin stop name  (required)
 *   to    — destination stop  (required)
 *   date  — YYYY-MM-DD        (required, validated but schedule is same every day)
 *
 * Response 200:
 * {
 *   from, to, date,
 *   totalBuses: <number>,
 *   buses: [ { busId, regNo, tripNo, from, to, depart, arrive, duration, seats, status }, … ]
 * }
 *
 * Response 400:  { error: "message" }
 */
app.get('/api/search', (req, res) => {
  const { from, to, date } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({ error: 'from, to, and date are required parameters.' });
  }

  // Validate stops exist
  const validStops = DB.stops.map(norm);
  if (!validStops.includes(norm(from))) {
    return res.status(400).json({ error: `Unknown origin stop: "${from}"` });
  }
  if (!validStops.includes(norm(to))) {
    return res.status(400).json({ error: `Unknown destination stop: "${to}"` });
  }
  if (norm(from) === norm(to)) {
    return res.status(400).json({ error: 'Origin and destination cannot be the same.' });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
  }
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) {
    return res.status(400).json({ error: 'Invalid date.' });
  }

  const buses = findBuses(from, to);

  return res.json({
    from,
    to,
    date,
    dayOfWeek: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    totalBuses: buses.length,
    buses
  });
});

/**
 * GET /api/health  — quick health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'RMD Travels Bus API' });
});

// ── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  RMD Travels API running at http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   • GET http://localhost:${PORT}/api/stops`);
  console.log(`   • GET http://localhost:${PORT}/api/search?from=Samastipur&to=Muzaffarpur&date=2025-08-10\n`);
});
