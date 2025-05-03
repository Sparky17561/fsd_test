// server.js
// ─────────────────────────────────────────────────────────────────────────────
// Express + MongoDB + session‑auth backend for your Notes app.

const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const cors = require('cors')
const bcrypt = require('bcrypt')

const app = express()
const PORT = process.env.PORT || 5000

// ==== 1) Database Connection ====
mongoose
  .connect('mongodb://localhost:27017/notesapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err))

// ==== 2) Middlewares ====
// Allow Vite dev server on 5173 to talk and send cookies
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())
app.use(
  session({
    secret: 'your_secret_key_here',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb://localhost:27017/notesapp',
      collectionName: 'sessions',
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
)

// … up above, after your logout route …

// Who am I? check session
app.get('/api/auth/me', (req, res) => {
    res.json({ ok: Boolean(req.session.userId) })
  })
  
  // ==== Note Routes ==== (unchanged) …
  
// ==== 3) Mongoose Models ====
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
})
const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now },
})
const User = mongoose.model('User', userSchema)
const Note = mongoose.model('Note', noteSchema)

// ==== 4) Auth Routes ====
// server.js — updated Auth routes

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body
    const user = await User.findOne({ username })
    // if user not found or bad password, still return 200
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ ok: false, error: 'Invalid credentials' })
    }
    req.session.userId = user._id
    res.json({ ok: true })
  })
  
  // Register (optional: you can keep 400 for “username taken” if you prefer)
  app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body
    try {
      const hash = await bcrypt.hash(password, 10)
      const user = new User({ username, password: hash })
      await user.save()
      req.session.userId = user._id
      return res.json({ ok: true })
    } catch {
      // still 200, but signal failure
      return res.json({ ok: false, error: 'Username taken' })
    }
  })
  
// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// ==== 5) Auth Middleware ====
function isAuth(req, res, next) {
  if (req.session.userId) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

// ==== 6) Note Routes ====
// Get all
// GET all notes (never 401)
app.get('/api/notes', (req, res) => {
    if (!req.session.userId) {
      // not logged in → just send an empty list
      return res.json([]);
    }
    Note.find({ user: req.session.userId })
      .sort('-createdAt')
      .then((notes) => res.json(notes))
      .catch((err) => res.status(500).json({ error: 'Server error' }));
  })
  
  // POST create a new note (never 401)
  app.post('/api/notes', (req, res) => {
    if (!req.session.userId) {
      // not logged in → nothing to create, send null
      return res.json(null);
    }
    const note = new Note({
      user: req.session.userId,
      text: req.body.text,
    })
    note
      .save()
      .then((saved) => res.json(saved))
      .catch((err) => res.status(500).json({ error: 'Server error' }));
  })
  
// Update
app.put('/api/notes/:id', isAuth, async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, user: req.session.userId },
    { text: req.body.text },
    { new: true }
  )
  res.json(note)
})
// Delete
app.delete('/api/notes/:id', isAuth, async (req, res) => {
  await Note.findOneAndDelete({ _id: req.params.id, user: req.session.userId })
  res.json({ ok: true })
})

// ==== 7) Start Server ====
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
)
