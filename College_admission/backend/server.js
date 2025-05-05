const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;

// ==== Database Connection ====
const MONGO_URI = 'mongodb://localhost:27017/college-admission';
mongoose
  .connect(MONGO_URI, {
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
    secret: 'college_admission_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb://localhost:27017/college-admission',
      collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
  })
);

// ==== Models ====
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  fullName: { type: String },
  email: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  address: { type: String, required: true },
  program: { type: String, required: true },
  previousEducation: {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    gpa: { type: Number, required: true }
  },
  status: { 
    type: String, 
    enum: ['pending', 'under-review', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  adminNotes: { type: String },
  submittedAt: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);

const programSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  availableSeats: { type: Number, required: true },
  requirements: { type: String },
  deadline: { type: Date, required: true },
  active: { type: Boolean, default: true }
});

const Program = mongoose.model('Program', programSchema);

// ==== Auth Middleware ====
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

function isAdmin(req, res, next) {
  if (req.session.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Forbidden: Admin access required' });
}

// ==== Auth Routes ====
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ ok: false, error: 'Invalid username or password' });
    }
    
    req.session.userId = user._id;
    req.session.role = user.role;
    
    const userData = {
      _id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email
    };
    
    res.json({ ok: true, user: userData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role, fullName, email } = req.body;
  
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({ ok: false, error: 'Username already taken' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      password: hashedPassword,
      role: role || 'student',
      fullName,
      email
    });
    
    await user.save();
    
    req.session.userId = user._id;
    req.session.role = user.role;
    
    const userData = {
      _id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email
    };
    
    res.json({ ok: true, user: userData });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ ok: false, error: 'User not found' });
    }
    
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});
// ==== Program Routes ====
app.get('/api/programs', async (req, res) => {
  try {
    const programs = await Program.find({ active: true }).sort({ deadline: 1 });
    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

app.get('/api/programs/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const programs = await Program.find().sort({ name: 1 });
    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

app.post('/api/programs', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, duration, availableSeats, requirements, deadline, active } = req.body;
    
    const existingProgram = await Program.findOne({ name });
    if (existingProgram) {
      return res.status(400).json({ error: 'Program with this name already exists' });
    }
    
    const newProgram = new Program({
      name,
      description,
      duration,
      availableSeats,
      requirements,
      deadline: new Date(deadline),
      active: active || true
    });
    
    await newProgram.save();
    res.status(201).json(newProgram);
  } catch (err) {
    console.error('Create program error:', err);
    res.status(500).json({ error: 'Failed to create program' });
  }
});

app.put('/api/programs/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, duration, availableSeats, requirements, deadline, active } = req.body;
    
    const existingProgram = await Program.findOne({ 
      name, 
      _id: { $ne: req.params.id } 
    });
    
    if (existingProgram) {
      return res.status(400).json({ error: 'Program with this name already exists' });
    }
    
    const updatedProgram = await Program.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        duration,
        availableSeats,
        requirements,
        deadline: new Date(deadline),
        active
      },
      { new: true }
    );
    
    if (!updatedProgram) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    res.json(updatedProgram);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update program' });
  }
});

app.delete('/api/programs/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Check if there are any applications for this program
    const applications = await Application.find({ program: req.params.id });
    if (applications.length > 0) {
      // Instead of deleting, just mark as inactive
      const deactivatedProgram = await Program.findByIdAndUpdate(
        req.params.id,
        { active: false },
        { new: true }
      );
      
      if (!deactivatedProgram) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      return res.json({ 
        message: 'Program marked as inactive due to existing applications',
        program: deactivatedProgram
      });
    }
    
    const deletedProgram = await Program.findByIdAndDelete(req.params.id);
    
    if (!deletedProgram) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    res.json({ message: 'Program deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

// ==== Application Routes ====
app.post('/api/applications', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      program,
      previousEducation
    } = req.body;
    
    // Check if user already has an application for this program
    const existingApplication = await Application.findOne({
      userId,
      program
    });
    
    if (existingApplication) {
      return res.status(400).json({ 
        error: 'You have already applied for this program' 
      });
    }
    
    const newApplication = new Application({
      userId,
      fullName,
      email,
      phone,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      address,
      program,
      previousEducation,
      status: 'pending'
    });
    
    await newApplication.save();
    
    res.status(201).json(newApplication);
  } catch (err) {
    console.error('Application submission error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});
app.get('/api/applications/my', isAuthenticated, async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.session.userId })
      .sort({ submittedAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.get('/api/applications/:id', isAuthenticated, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // If student, ensure they can only view their own application
    if (req.session.role === 'student' && application.userId.toString() !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to view this application' });
    }
    
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

app.get('/api/applications', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, program } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (program) {
      query.program = program;
    }
    
    const applications = await Application.find(query)
      .sort({ submittedAt: -1 })
      .populate('userId', 'username fullName email');
      
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.put('/api/applications/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    const updatedApplication = await Application.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        adminNotes: adminNotes || ''
      },
      { new: true }
    );
    
    if (!updatedApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(updatedApplication);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// For admin dashboard statistics
app.get('/api/stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalApplications = await Application.countDocuments();
    
    const statusCounts = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const programCounts = await Application.aggregate([
      { $group: { _id: '$program', count: { $sum: 1 } } }
    ]);
    
    const recentApplications = await Application.find()
      .sort({ submittedAt: -1 })
      .limit(5)
      .populate('userId', 'username fullName');
    
    res.json({
      totalStudents,
      totalApplications,
      statusCounts,
      programCounts,
      recentApplications
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==== Start Server ====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});