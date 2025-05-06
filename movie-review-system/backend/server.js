// server.js
// ─────────────────────────────────────────────────────────────────────────────
// Express + MongoDB + session-auth backend for Movie Review System

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
  .connect('mongodb://localhost:27017/moviereview', {
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
    secret: 'your_movie_review_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb://localhost:27017/moviereview',
      collectionName: 'sessions',
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
)

// ==== 3) Mongoose Models ====
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false }
})

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  genre: { type: String, required: true },
  director: String,
  releaseYear: Number,
  description: String,
  posterUrl: String,
  createdAt: { type: Date, default: Date.now }
})

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)
const Movie = mongoose.model('Movie', movieSchema)
const Review = mongoose.model('Review', reviewSchema)

// Initialize admin user if it doesn't exist
const initAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' })
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('abc123', 10)
      await User.create({
        username: 'admin',
        password: hashedPassword,
        isAdmin: true
      })
      console.log('✅ Admin user created')
    }
  } catch (error) {
    console.error('Error creating admin user:', error)
  }
}
initAdminUser()

// ==== 4) Auth Routes ====
// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  const user = await User.findOne({ username })
  
  // If user not found or bad password, still return 200
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.json({ ok: false, error: 'Invalid credentials' })
  }
  
  req.session.userId = user._id
  req.session.isAdmin = user.isAdmin
  req.session.username = user.username
  
  res.json({ 
    ok: true, 
    isAdmin: user.isAdmin,
    username: user.username
  })
})

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body
  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.json({ ok: false, error: 'Username taken' })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = new User({ 
      username, 
      password: hash,
      isAdmin: false // Regular users are not admins by default
    })
    await user.save()
    
    req.session.userId = user._id
    req.session.isAdmin = false
    req.session.username = user.username
    
    return res.json({ ok: true, username: user.username })
  } catch (err) {
    console.error("Registration error:", err)
    return res.json({ ok: false, error: 'Registration failed' })
  }
})

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// Who am I? check session
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ ok: false })
  }
  
  res.json({ 
    ok: true, 
    isAdmin: req.session.isAdmin,
    username: req.session.username
  })
})

// ==== 5) Auth Middleware ====
function isAuth(req, res, next) {
  if (req.session.userId) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

function isAdmin(req, res, next) {
  if (req.session.userId && req.session.isAdmin) return next()
  res.status(403).json({ error: 'Forbidden: Admin access required' })
}

// ==== 6) Movie Routes ====
// Get all movies (public)
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await Movie.find().sort('-createdAt')
    res.json(movies)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get single movie (public)
app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }
    res.json(movie)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Create movie (admin only)
app.post('/api/movies', isAdmin, async (req, res) => {
  try {
    const { title, genre, director, releaseYear, description, posterUrl } = req.body
    const movie = new Movie({
      title,
      genre,
      director,
      releaseYear,
      description,
      posterUrl
    })
    await movie.save()
    res.json(movie)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Update movie (admin only)
app.put('/api/movies/:id', isAdmin, async (req, res) => {
  try {
    const { title, genre, director, releaseYear, description, posterUrl } = req.body
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      {
        title,
        genre,
        director,
        releaseYear,
        description,
        posterUrl
      },
      { new: true }
    )
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }
    res.json(movie)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete movie (admin only)
app.delete('/api/movies/:id', isAdmin, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }
    
    // Also delete all reviews for this movie
    await Review.deleteMany({ movie: req.params.id })
    
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ==== 7) Review Routes ====
// Get reviews for a movie
app.get('/api/movies/:movieId/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ movie: req.params.movieId }).sort('-createdAt')
    res.json(reviews)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Add a review (authenticated users only)
app.post('/api/movies/:movieId/reviews', isAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body
    
    // Check if movie exists
    const movie = await Movie.findById(req.params.movieId)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }
    
    // Check if user already reviewed this movie
    const existingReview = await Review.findOne({ 
      user: req.session.userId,
      movie: req.params.movieId
    })
    
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this movie' })
    }
    
    const review = new Review({
      user: req.session.userId,
      username: req.session.username,
      movie: req.params.movieId,
      rating,
      comment
    })
    
    await review.save()
    res.json(review)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Update a review (owner only)
app.put('/api/reviews/:id', isAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body
    
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      { rating, comment },
      { new: true }
    )
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found or not authorized' })
    }
    
    res.json(review)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete a review (owner or admin)
app.delete('/api/reviews/:id', isAuth, async (req, res) => {
  try {
    // Admin can delete any review, users can only delete their own
    const query = req.session.isAdmin 
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.session.userId }
    
    const review = await Review.findOneAndDelete(query)
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found or not authorized' })
    }
    
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ==== 8) Start Server ====
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
)