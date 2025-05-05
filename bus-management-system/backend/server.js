const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;

// ==== Database Connection ====
const MONGO_URI = 'mongodb://localhost:27017/busms';
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
    secret: 'bus_management_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb://localhost:27017/bus-management',
      collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
  })
);

// ==== Models ====
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
  route: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Bus = mongoose.model('Bus', busSchema);

const ticketSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seatsBooked: { type: Number, required: true },
  status: { type: String, enum: ['booked', 'canceled'], default: 'booked' },
  createdAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

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
      role: user.role
    };
    
    res.json({ ok: true, user: userData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role } = req.body;
  
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({ ok: false, error: 'Username already taken' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      password: hashedPassword,
      role: role || 'customer'
    });
    
    await user.save();
    
    req.session.userId = user._id;
    req.session.role = user.role;
    
    const userData = {
      _id: user._id,
      username: user.username,
      role: user.role
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

// ==== Bus Routes ====
app.get('/api/buses', async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

app.post('/api/buses', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { busNumber, capacity, route, status } = req.body;
    
    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({ error: 'Bus number already exists' });
    }
    
    const newBus = new Bus({
      busNumber,
      capacity,
      route,
      status
    });
    
    await newBus.save();
    res.status(201).json(newBus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bus' });
  }
});

app.put('/api/buses/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { busNumber, capacity, route, status } = req.body;
    
    const existingBus = await Bus.findOne({ 
      busNumber, 
      _id: { $ne: req.params.id } 
    });
    
    if (existingBus) {
      return res.status(400).json({ error: 'Bus number already exists' });
    }
    
    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      {
        busNumber,
        capacity,
        route,
        status,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!updatedBus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    res.json(updatedBus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bus' });
  }
});

app.delete('/api/buses/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const activeTickets = await Ticket.findOne({ 
      busId: req.params.id,
      status: 'booked'
    });
    
    if (activeTickets) {
      return res.status(400).json({ 
        error: 'Cannot delete bus with active tickets' 
      });
    }
    
    const deletedBus = await Bus.findByIdAndDelete(req.params.id);
    
    if (!deletedBus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    res.json({ message: 'Bus deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bus' });
  }
});

// ==== Ticket Routes ====
app.post('/api/tickets/book', isAuthenticated, async (req, res) => {
  const { busId, seatsBooked } = req.body;
  const userId = req.session.userId;

  try {
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (bus.status !== 'active') {
      return res.status(400).json({ error: 'Bus is not active' });
    }

    if (bus.capacity < seatsBooked) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    const ticket = new Ticket({
      busId,
      userId,
      seatsBooked,
      status: 'booked'
    });

    await ticket.save();
    
    bus.capacity -= seatsBooked;
    await bus.save();

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error('Error booking ticket:', err);
    res.status(500).json({ error: 'Failed to book ticket' });
  }
});

app.post('/api/tickets/cancel', isAuthenticated, async (req, res) => {
  const { ticketId } = req.body;
  const userId = req.session.userId;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.userId.toString() !== userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to cancel this ticket' });
    }

    if (ticket.status === 'canceled') {
      return res.status(400).json({ error: 'Ticket is already canceled' });
    }

    const bus = await Bus.findById(ticket.busId);
    if (bus) {
      bus.capacity += ticket.seatsBooked;
      await bus.save();
    }

    ticket.status = 'canceled';
    await ticket.save();

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error('Error canceling ticket:', err);
    res.status(500).json({ error: 'Failed to cancel ticket' });
  }
});

app.get('/api/tickets/my-tickets', isAuthenticated, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.session.userId })
      .populate('busId')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.get('/api/tickets', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('busId')
      .populate('userId', '-password')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ==== Start Server ====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
