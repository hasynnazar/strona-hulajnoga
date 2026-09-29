require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key-123',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // In production with HTTPS set to true
}));

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const defaultHash = bcrypt.hashSync('admin123', 10);
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || defaultHash;

// Authentication Middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// API: Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && bcrypt.compareSync(password, ADMIN_PASS_HASH)) {
    req.session.loggedIn = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// API: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// API: Get available slots (public)
app.get('/api/slots', (req, res) => {
  try {
    const slots = db.prepare("SELECT id, date, time FROM slots WHERE is_available = 1 AND date >= date('now') ORDER BY date, time").all();
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Book a slot
app.post('/api/bookings', (req, res) => {
  const { name, phone, model, issue, delivery_type, slot_id, address } = req.body;
  
  if (!name || !phone || !model || !issue || !delivery_type || !slot_id) {
    return res.status(400).json({ error: 'Wszystkie pola są wymagane.' });
  }

  const checkSlot = db.prepare('SELECT is_available FROM slots WHERE id = ?').get(slot_id);
  if (!checkSlot || checkSlot.is_available === 0) {
    return res.status(400).json({ error: 'Wybrany termin jest już niedostępny.' });
  }

  const stmt = db.prepare(`
    INSERT INTO bookings (name, phone, model, issue, delivery_type, address, slot_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    db.transaction(() => {
      stmt.run(name, phone, model, issue, delivery_type, address || '', slot_id);
      db.prepare('UPDATE slots SET is_available = 0 WHERE id = ?').run(slot_id);
    })();
    
    // Webhook or WhatsApp notification can go here
    console.log(`Nowa rezerwacja: ${name} (${phone}) na model ${model}`);
    
    res.json({ success: true, message: 'Rezerwacja zakończona sukcesem.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd podczas rezerwacji.' });
  }
});

// ADMIN API: Get all slots
app.get('/api/admin/slots', requireAuth, (req, res) => {
  try {
    const slots = db.prepare('SELECT * FROM slots ORDER BY date DESC, time DESC').all();
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN API: Add slot
app.post('/api/admin/slots', requireAuth, (req, res) => {
  const { date, time } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO slots (date, time) VALUES (?, ?)');
    const info = stmt.run(date, time);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Slot may already exist' });
  }
});

// ADMIN API: Delete/Toggle slot
app.delete('/api/admin/slots/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM slots WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN API: Get bookings
app.get('/api/admin/bookings', requireAuth, (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, s.date, s.time 
      FROM bookings b
      LEFT JOIN slots s ON b.slot_id = s.id
      ORDER BY b.created_at DESC
    `).all();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN API: Update booking status
app.patch('/api/admin/bookings/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve admin page statically behind auth
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
