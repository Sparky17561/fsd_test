// server.js
// ─────────────────────────────────────────────────────────────────────────────
// Express + MongoDB + session‑auth backend for a Voting Management System.
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
  .connect('mongodb://localhost:27017/votingsystem', {
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
      mongoUrl: 'mongodb://localhost:27017/votingsystem',
      collectionName: 'sessions',
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 1 week
  })
)

// ==== 3) Models ====
// User model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

// Party model
const partySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  logoUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
})

// Vote model
const voteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const User = mongoose.model('User', userSchema)
const Party = mongoose.model('Party', partySchema)
const Vote = mongoose.model('Vote', voteSchema)

// Initialize admin user if not exists
async function initializeAdmin() {
  try {
    const adminExists = await User.findOne({ username: 'admin' })
    
    if (!adminExists) {
      const hash = await bcrypt.hash('abc123', 10)
      const admin = new User({
        username: 'admin',
        password: hash,
        isAdmin: true
      })
      await admin.save()
      console.log('✅ Admin user created')
    }
  } catch (err) {
    console.error('Admin initialization error:', err)
  }
}

initializeAdmin()

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
    res.json({ ok: true, username: user.username, isAdmin: user.isAdmin })
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
    res.json({ ok: true, username: user.username, isAdmin: user.isAdmin })
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
    
    res.json({ ok: true, username: user.username, isAdmin: user.isAdmin })
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

function isAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  User.findById(req.session.userId)
    .then(user => {
      if (user && user.isAdmin) {
        return next()
      }
      res.status(403).json({ error: 'Access denied' })
    })
    .catch(err => {
      console.error('Admin check error:', err)
      res.status(500).json({ error: 'Server error' })
    })
}

// ==== 6) Party Routes ====
// Get all parties
app.get('/api/parties', async (req, res) => {
  try {
    const parties = await Party.find().sort('name')
    res.json(parties)
  } catch (err) {
    console.error('Error fetching parties:', err)
    res.status(500).json({ error: 'Failed to fetch parties' })
  }
})

// Get single party
app.get('/api/parties/:id', async (req, res) => {
  try {
    const party = await Party.findById(req.params.id)
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' })
    }
    
    res.json(party)
  } catch (err) {
    console.error('Error fetching party:', err)
    res.status(500).json({ error: 'Failed to fetch party' })
  }
})

// Create party (admin only)
app.post('/api/parties', isAdmin, async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Party name is required' })
    }
    
    const existingParty = await Party.findOne({ name: name.trim() })
    if (existingParty) {
      return res.status(400).json({ error: 'Party with this name already exists' })
    }
    
    const party = new Party({
      name: name.trim(),
      description: description?.trim(),
      logoUrl: logoUrl?.trim()
    })
    
    await party.save()
    res.json(party)
  } catch (err) {
    console.error('Error creating party:', err)
    res.status(500).json({ error: 'Failed to create party' })
  }
})

// Update party (admin only)
app.put('/api/parties/:id', isAdmin, async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Party name is required' })
    }
    
    // Check if another party with the same name exists
    const existingParty = await Party.findOne({ 
      name: name.trim(), 
      _id: { $ne: req.params.id } 
    })
    
    if (existingParty) {
      return res.status(400).json({ error: 'Party with this name already exists' })
    }
    
    const party = await Party.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description: description?.trim(),
        logoUrl: logoUrl?.trim()
      },
      { new: true }
    )
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' })
    }
    
    res.json(party)
  } catch (err) {
    console.error('Error updating party:', err)
    res.status(500).json({ error: 'Failed to update party' })
  }
})

// Delete party (admin only)
app.delete('/api/parties/:id', isAdmin, async (req, res) => {
  try {
    const party = await Party.findByIdAndDelete(req.params.id)
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' })
    }
    
    // Delete all votes for this party
    await Vote.deleteMany({ party: req.params.id })
    
    res.json({ ok: true })
  } catch (err) {
    console.error('Error deleting party:', err)
    res.status(500).json({ error: 'Failed to delete party' })
  }
})

// ==== 7) Vote Routes ====
// Get vote counts for all parties
app.get('/api/votes/count', async (req, res) => {
  try {
    const voteCount = await Vote.aggregate([
      {
        $group: {
          _id: "$party",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "parties",
          localField: "_id",
          foreignField: "_id",
          as: "partyDetails"
        }
      },
      {
        $unwind: {
          path: "$partyDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          name: "$partyDetails.name"
        }
      }
    ])
    
    res.json(voteCount)
  } catch (err) {
    console.error('Error fetching vote count:', err)
    res.status(500).json({ error: 'Failed to fetch vote count' })
  }
})

// Get current user's vote
app.get('/api/votes/mine', isAuth, async (req, res) => {
  try {
    const vote = await Vote.findOne({ user: req.session.userId }).populate('party')
    res.json(vote || null)
  } catch (err) {
    console.error('Error fetching user vote:', err)
    res.status(500).json({ error: 'Failed to fetch vote' })
  }
})

// Cast or update vote
app.post('/api/votes', isAuth, async (req, res) => {
  try {
    const { partyId } = req.body
    
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' })
    }
    
    // Check if party exists
    const party = await Party.findById(partyId)
    if (!party) {
      return res.status(404).json({ error: 'Party not found' })
    }
    
    // Check if user already voted
    let vote = await Vote.findOne({ user: req.session.userId })
    
    if (vote) {
      // Update existing vote
      vote.party = partyId
      vote.updatedAt = new Date()
    } else {
      // Create new vote
      vote = new Vote({
        user: req.session.userId,
        party: partyId
      })
    }
    
    await vote.save()
    
    const populatedVote = await Vote.findById(vote._id).populate('party')
    res.json(populatedVote)
  } catch (err) {
    console.error('Error casting vote:', err)
    res.status(500).json({ error: 'Failed to cast vote' })
  }
})

// Revoke vote
app.delete('/api/votes', isAuth, async (req, res) => {
  try {
    const result = await Vote.findOneAndDelete({ user: req.session.userId })
    
    if (!result) {
      return res.status(404).json({ error: 'No vote found to revoke' })
    }
    
    res.json({ ok: true })
  } catch (err) {
    console.error('Error revoking vote:', err)
    res.status(500).json({ error: 'Failed to revoke vote' })
  }
})

// Admin: get all votes with user details
app.get('/api/votes', isAdmin, async (req, res) => {
  try {
    const votes = await Vote.find()
      .populate('user', 'username')
      .populate('party', 'name')
      .sort('-updatedAt')
    
    res.json(votes)
  } catch (err) {
    console.error('Error fetching votes:', err)
    res.status(500).json({ error: 'Failed to fetch votes' })
  }
})

// ==== 8) Start Server ====
app.listen(PORT, () =>
  console.log(`🚀 Server listening on http://localhost:${PORT}`))