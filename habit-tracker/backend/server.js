// server.js
// ─────────────────────────────────────────────────────────────────────────────
// Express + MongoDB + session‑auth backend for a Habit Tracker.
// All logic lives here; extract models/routes later as needed.

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
  .connect('mongodb://localhost:27017/habittracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err))

// ==== 2) Middleware ====
app.use(
  cors({
    origin: 'http://localhost:5173', // your Vite‑powered React app
    credentials: true,
  })
)
app.use(express.json())
app.use(
  session({
    secret: 'replace_with_a_real_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb://localhost:27017/habittracker',
      collectionName: 'sessions',
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 1 week
  })
)

// ==== 3) Models ====
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const habitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  streak: { type: Number, default: 0 },
  lastCompleted: Date,
  createdAt: { type: Date, default: Date.now },
})

const User = mongoose.model('User', userSchema)
const Habit = mongoose.model('Habit', habitSchema)

// ==== 4) Auth Routes ====
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    
    // Validate input
    if (!username || !password) {
      return res.json({ ok: false, error: 'Username and password required' })
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.json({ ok: false, error: 'Username already taken' })
    }
    
    // Create new user
    const hash = await bcrypt.hash(password, 10)
    const user = new User({ username, password: hash })
    await user.save()
    
    // Create session
    req.session.userId = user._id
    res.json({ ok: true })
  } catch (err) {
    console.error('Registration error:', err)
    res.json({ ok: false, error: 'Registration failed' })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    // Find user
    const user = await User.findOne({ username })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ ok: false, error: 'Invalid username or password' })
    }
    
    // Create session
    req.session.userId = user._id
    res.json({ ok: true, username: user.username })
  } catch (err) {
    console.error('Login error:', err)
    res.json({ ok: false, error: 'Login failed' })
  }
})

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// Who am I?
app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ ok: false })
  }
  
  try {
    const user = await User.findById(req.session.userId)
    if (!user) {
      return res.json({ ok: false })
    }
    
    res.json({ ok: true, username: user.username })
  } catch (err) {
    console.error('Auth check error:', err)
    res.json({ ok: false })
  }
})

// ==== 5) Auth Middleware ====
function isAuth(req, res, next) {
  if (req.session.userId) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

// ==== 6) Habit Routes ====
// Get all habits
app.get('/api/habits', isAuth, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.session.userId }).sort('-createdAt')
    res.json(habits)
  } catch (err) {
    console.error('Error fetching habits:', err)
    res.status(500).json({ error: 'Failed to fetch habits' })
  }
})

// Create habit
app.post('/api/habits', isAuth, async (req, res) => {
  try {
    const { name } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Habit name is required' })
    }
    
    const habit = new Habit({
      user: req.session.userId,
      name: name.trim(),
    })
    
    await habit.save()
    res.json(habit)
  } catch (err) {
    console.error('Error creating habit:', err)
    res.status(500).json({ error: 'Failed to create habit' })
  }
})

// Update habit
app.put('/api/habits/:id', isAuth, async (req, res) => {
  try {
    const { name } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Habit name is required' })
    }
    
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      { name: name.trim() },
      { new: true }
    )
    
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }
    
    res.json(habit)
  } catch (err) {
    console.error('Error updating habit:', err)
    res.status(500).json({ error: 'Failed to update habit' })
  }
})

// Delete habit
app.delete('/api/habits/:id', isAuth, async (req, res) => {
  try {
    const result = await Habit.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId,
    })
    
    if (!result) {
      return res.status(404).json({ error: 'Habit not found' })
    }
    
    res.json({ ok: true })
  } catch (err) {
    console.error('Error deleting habit:', err)
    res.status(500).json({ error: 'Failed to delete habit' })
  }
})

// Mark habit as completed
app.post('/api/habits/:id/complete', isAuth, async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.session.userId,
    })
    
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }
    
    // Check if already completed today
    const lastCompleted = habit.lastCompleted ? new Date(habit.lastCompleted) : null
    if (lastCompleted && lastCompleted.setHours(0, 0, 0, 0) >= today) {
      return res.json(habit) // Already completed today
    }
    
    // Update streak logic
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let newStreak = 1
    if (lastCompleted) {
      const lastCompletedDate = new Date(lastCompleted)
      lastCompletedDate.setHours(0, 0, 0, 0)
      
      if (lastCompletedDate.getTime() === yesterday.getTime()) {
        // Completed yesterday, increment streak
        newStreak = habit.streak + 1
      }
    }
    
    // Update habit
    habit.streak = newStreak
    habit.lastCompleted = new Date()
    await habit.save()
    
    res.json(habit)
  } catch (err) {
    console.error('Error completing habit:', err)
    res.status(500).json({ error: 'Failed to complete habit' })
  }
})

// ==== 7) Start Server ====
app.listen(PORT, () =>
  console.log(`🚀 Server listening on http://localhost:${PORT}`)
)