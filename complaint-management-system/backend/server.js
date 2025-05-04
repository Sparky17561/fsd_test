// server.js
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Fix 1: Improved session configuration for persistence
app.use(session({
  secret: 'your_super_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: 'mongodb://localhost:27017/complaints',
    // Improving session store configuration
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native'
  }),
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

mongoose.connect('mongodb://localhost:27017/complaints', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Updated user schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user', 'admin'] }
});
const User = mongoose.model('User', userSchema);

// Updated complaint schema with user reference and isAnnouncement flag
const complaintSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_name: String,
  text: String,
  isAnnouncement: { type: Boolean, default: false },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Complaint = mongoose.model('Complaint', complaintSchema);

// Middleware
function isAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function isAdmin(req, res, next) {
  if (req.session.user?.role === 'admin') return next();
  res.status(403).json({ error: 'Forbidden' });
}

function isOwnerOrAdmin(req, res, next) {
  const { id } = req.params;
  
  // Admin can edit any complaint
  if (req.session.user?.role === 'admin') return next();
  
  // For normal users, check if they own the complaint
  Complaint.findById(id)
    .then(complaint => {
      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      
      if (complaint.user_name === req.session.user.username) {
        return next();
      }
      
      res.status(403).json({ error: 'You can only modify your own complaints' });
    })
    .catch(err => {
      res.status(500).json({ error: 'Server error' });
    });
}

// — REGISTER (only normal users)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin') {
    return res.status(400).json({ error: 'Cannot register admin' });
  }
  try {
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await new User({ username, passwordHash, role: 'user' }).save();
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// — LOGIN (admin is hard‑coded, normal from DB)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  // fixed admin account
  if (username === 'admin' && password === 'abc123') {
    req.session.user = { username: 'admin', role: 'admin' };
    return res.json({ username: 'admin', role: 'admin' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    req.session.user = { 
      id: user._id,
      username: user.username, 
      role: user.role || 'user' 
    };
    
    res.json({ 
      username: user.username, 
      role: user.role || 'user' 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// — CHECK SESSION (new endpoint)
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    return res.json({ 
      username: req.session.user.username, 
      role: req.session.user.role 
    });
  }
  res.status(401).json({ error: 'Not logged in' });
});

// — LOGOUT
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// — PUBLIC list & filter
app.get('/api/complaints', async (req, res) => {
  try {
    const { sort } = req.query;
    let sortObj = {};
    if (sort === 'upvotes') sortObj = { upvotes: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };
    // Sort announcements to top by default
    else sortObj = { isAnnouncement: -1, createdAt: -1 };

    const complaints = await Complaint.find().sort(sortObj).lean();
    
    // Add hasUpvoted flag and canEdit flag
    const withFlags = complaints.map(c => {
      const hasUpvoted = c.upvotedBy?.some(id => 
        id.toString() === req.session.user?.id
      );
      
      const canEdit = req.session.user?.role === 'admin' || 
                     c.user_name === req.session.user?.username;
                     
      return {
        ...c,
        hasUpvoted,
        canEdit
      };
    });
    
    res.json(withFlags);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching complaints' });
  }
});

// — SUBMIT COMPLAINT (auth)
app.post('/api/complaints', isAuth, async (req, res) => {
  try {
    const { text, isAnnouncement = false } = req.body;
    
    // Only admin can create announcements
    if (isAnnouncement && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create announcements' });
    }
    
    const comp = await new Complaint({
      user_name: req.session.user.username,
      user_id: req.session.user.id,
      text,
      isAnnouncement: isAnnouncement && req.session.user.role === 'admin'
    }).save();
    
    res.json({ 
      ...comp.toObject(), 
      hasUpvoted: false,
      canEdit: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error creating complaint' });
  }
});

// — TOGGLE UPVOTE (auth)
app.post('/api/complaints/:id/upvote', isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    
    const comp = await Complaint.findById(id);
    if (!comp) return res.status(404).json({ error: 'Complaint not found' });

    // Check if user has already upvoted
    const hasUpvoted = comp.upvotedBy && 
                      comp.upvotedBy.some(id => id.toString() === userId);
    
    if (!hasUpvoted) {
      comp.upvotes++;
      comp.upvotedBy = [...(comp.upvotedBy || []), userId];
    } else {
      comp.upvotes = Math.max(0, comp.upvotes - 1);
      comp.upvotedBy = comp.upvotedBy.filter(id => id.toString() !== userId);
    }
    
    await comp.save();
    
    const canEdit = req.session.user.role === 'admin' || 
                   comp.user_name === req.session.user.username;
    
    res.json({ 
      ...comp.toObject(), 
      hasUpvoted: !hasUpvoted,
      canEdit
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating upvote' });
  }
});

// — UPDATE COMPLAINT (owner or admin)
app.put('/api/complaints/:id', isAuth, isOwnerOrAdmin, async (req, res) => {
  try {
    const { text, isAnnouncement } = req.body;
    const updateData = { 
      text,
      updatedAt: new Date()
    };
    
    // Only allow admin to set announcement flag
    if (req.session.user.role === 'admin' && isAnnouncement !== undefined) {
      updateData.isAnnouncement = isAnnouncement;
    }
    
    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    res.json({
      ...updated.toObject(),
      canEdit: true,
      hasUpvoted: updated.upvotedBy && 
                updated.upvotedBy.some(id => id.toString() === req.session.user.id)
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating complaint' });
  }
});

// — DELETE COMPLAINT (owner or admin)
app.delete('/api/complaints/:id', isAuth, isOwnerOrAdmin, async (req, res) => {
  try {
    const deleted = await Complaint.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting complaint' });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));