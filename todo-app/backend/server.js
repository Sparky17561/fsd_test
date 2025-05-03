// server.js
// ─────────────────────────────────────────────────────────────────────────────
// Express + MongoDB + session‑auth backend for your To-Do app.

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
  .connect('mongodb://localhost:27017/todoapp', {
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
      mongoUrl: 'mongodb://localhost:27017/todoapp',
      collectionName: 'sessions',
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
)

// ==== 3) Mongoose Models ====
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
})

const todoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  task: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

const User = mongoose.model('User', userSchema)
const Todo = mongoose.model('Todo', todoSchema)

// ==== 4) Auth Routes ====
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

// Register
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

// Who am I? check session
app.get('/api/auth/me', (req, res) => {
  res.json({ ok: Boolean(req.session.userId) })
})

// ==== 5) Auth Middleware ====
function isAuth(req, res, next) {
  if (req.session.userId) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

// ==== 6) Todo Routes ====
// Get all todos
app.get('/api/todos', (req, res) => {
  if (!req.session.userId) {
    // not logged in → just send an empty list
    return res.json([])
  }
  Todo.find({ user: req.session.userId })
    .sort('-createdAt')
    .then((todos) => res.json(todos))
    .catch((err) => res.status(500).json({ error: 'Server error' }))
})

// Update a todo
app.put('/api/todos/:id', isAuth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      { 
        task: req.body.task,
        priority: req.body.priority,
        completed: req.body.completed
      },
      { new: true }
    )
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' })
    }
    res.json(todo)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete a todo
app.delete('/api/todos/:id', isAuth, async (req, res) => {
    try {
      const result = await Todo.findOneAndDelete({ 
        _id: req.params.id, 
        user: req.session.userId 
      })
      if (!result) {
        return res.status(404).json({ error: 'Todo not found' })
      }
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Server error' })
    }
  })
  
  // Mark all todos as completed
  app.post('/api/todos/complete-all', isAuth, async (req, res) => {
    try {
      await Todo.updateMany(
        { user: req.session.userId, completed: false },
        { completed: true }
      )
      const todos = await Todo.find({ user: req.session.userId }).sort('-createdAt')
      res.json(todos)
    } catch (err) {
      res.status(500).json({ error: 'Server error' })
    }
  })
  
  // Clear completed todos
  app.delete('/api/todos/clear-completed', isAuth, async (req, res) => {
    try {
      await Todo.deleteMany({
        user: req.session.userId,
        completed: true
      })
      const todos = await Todo.find({ user: req.session.userId }).sort('-createdAt')
      res.json(todos)
    } catch (err) {
      res.status(500).json({ error: 'Server error' })
    }
  })
  
  // Create a new todo
  app.post('/api/todos', (req, res) => {
    if (!req.session.userId) {
      // not logged in → nothing to create, send null
      return res.json(null)
    }
    const todo = new Todo({
      user: req.session.userId,
      task: req.body.task,
      priority: req.body.priority || 'medium',
      completed: req.body.completed || false
    })
    
    todo
      .save()
      .then((saved) => res.json(saved))
      .catch((err) => res.status(500).json({ error: 'Server error' }))
  })
  
// ==== 7) Start Server ====
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
)

