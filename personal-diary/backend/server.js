// server.js
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;

// ==== Database Connection ====
mongoose
  .connect('mongodb://localhost:27017/personal-diary', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ==== Middlewares ====
app.use(
  cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true
  })
);
app.use(express.json());
app.use(
  session({
    secret: 'personal_diary_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb://localhost:27017/personal-diary',
      collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
  })
);

// ==== Models ====
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const entrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  mood: { 
    type: String, 
    enum: ['happy', 'sad', 'excited', 'angry', 'neutral'],
    default: 'neutral'
  },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
entrySchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

const User = mongoose.model('User', userSchema);
const Entry = mongoose.model('Entry', entrySchema);

// ==== Auth Middleware ====
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// ==== Auth Routes ====
// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ ok: false, error: 'Invalid username or password' });
    }
    
    req.session.userId = user._id;
    res.json({ ok: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({ ok: false, error: 'Username already taken' });
    }
    
    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      password: hashedPassword 
    });
    
    await user.save();
    req.session.userId = user._id;
    res.json({ ok: true });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Check authentication status
app.get('/api/auth/me', (req, res) => {
  res.json({ ok: Boolean(req.session.userId) });
});

// ==== Entry Routes ====
// Get all entries for the current user
app.get('/api/entries', isAuthenticated, async (req, res) => {
  try {
    const entries = await Entry.find({ user: req.session.userId })
      .sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Get a specific entry
app.get('/api/entries/:id', isAuthenticated, async (req, res) => {
  try {
    const entry = await Entry.findOne({
      _id: req.params.id,
      user: req.session.userId
    });
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(entry);
  } catch (err) {
    console.error('Error fetching entry:', err);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// Create a new entry
app.post('/api/entries', isAuthenticated, async (req, res) => {
  try {
    const { title, content, mood, date } = req.body;
    
    const entry = new Entry({
      user: req.session.userId,
      title,
      content,
      mood,
      date: date || new Date()
    });
    
    await entry.save();
    res.json(entry);
  } catch (err) {
    console.error('Error creating entry:', err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update an entry
app.put('/api/entries/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, content, mood } = req.body;
    
    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      { title, content, mood },
      { new: true }
    );
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(entry);
  } catch (err) {
    console.error('Error updating entry:', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete an entry
app.delete('/api/entries/:id', isAuthenticated, async (req, res) => {
  try {
    const result = await Entry.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting entry:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Get entries by mood
app.get('/api/entries/mood/:mood', isAuthenticated, async (req, res) => {
  try {
    const { mood } = req.params;
    
    const entries = await Entry.find({
      user: req.session.userId,
      mood
    }).sort({ date: -1 });
    
    res.json(entries);
  } catch (err) {
    console.error('Error fetching entries by mood:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Search entries
app.get('/api/entries/search', isAuthenticated, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const entries = await Entry.find({
      user: req.session.userId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    }).sort({ date: -1 });
    
    res.json(entries);
  } catch (err) {
    console.error('Error searching entries:', err);
    res.status(500).json({ error: 'Failed to search entries' });
  }
});

// Statistics for dashboard
app.get('/api/stats', isAuthenticated, async (req, res) => {
  try {
    const totalEntries = await Entry.countDocuments({ user: req.session.userId });
    
    // Count entries by mood
    const moodCounts = await Entry.aggregate([
      { $match: { user: mongoose.Types.ObjectId(req.session.userId) } },
      { $group: { _id: '$mood', count: { $sum: 1 } } }
    ]);
    
    // Format mood counts
    const moodStats = {};
    moodCounts.forEach(item => {
      moodStats[item._id] = item.count;
    });
    
    // Get month-wise entry counts
    const monthlyEntries = await Entry.aggregate([
      { $match: { user: mongoose.Types.ObjectId(req.session.userId) } },
      {
        $group: {
          _id: { 
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      totalEntries,
      moodStats,
      monthlyEntries
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==== Start Server ====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});