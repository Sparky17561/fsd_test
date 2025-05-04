// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/quiz_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  highestScore: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);

// JWT Secret
const JWT_SECRET = 'your_jwt_secret_key'; // In production, use environment variable

// Quiz Data (now with 25 questions)
const quizData = [
  {
    question: "What does HTML stand for?",
    options: ["Hyper Text Markup Language", "Hot Mail", "How to Make Links", "Hyper Tool Multi Language"],
    answer: "Hyper Text Markup Language"
  },
  {
    question: "Which CSS property controls the text size?",
    options: ["font-style", "text-size", "font-size", "text-style"],
    answer: "font-size"
  },
  {
    question: "Which language is used for backend?",
    options: ["HTML", "CSS", "JavaScript", "Node.js"],
    answer: "Node.js"
  },
  {
    question: "What is the default port for React dev server?",
    options: ["3000", "5000", "8080", "5173"],
    answer: "5173"
  },
  {
    question: "Which database is NoSQL?",
    options: ["MySQL", "MongoDB", "PostgreSQL", "SQLite"],
    answer: "MongoDB"
  },
  {
    question: "Which hook is used to fetch data in React?",
    options: ["useState", "useEffect", "useRef", "useMemo"],
    answer: "useEffect"
  },
  {
    question: "What is Express.js used for?",
    options: ["Frontend design", "Database management", "Routing & middleware", "Authentication only"],
    answer: "Routing & middleware"
  },
  {
    question: "Which HTTP method is used to update data?",
    options: ["GET", "POST", "PUT", "FETCH"],
    answer: "PUT"
  },
  {
    question: "What does CRUD stand for?",
    options: ["Create, Read, Update, Delete", "Create, Replace, Upload, Delete", "Copy, Run, Undo, Delete", "None"],
    answer: "Create, Read, Update, Delete"
  },
  {
    question: "Which tag is used to link a CSS file in HTML?",
    options: ["<script>", "<link>", "<style>", "<css>"],
    answer: "<link>"
  },
  {
    question: "Which command starts a Vite dev server?",
    options: ["vite start", "npm run dev", "vite run", "npm vite start"],
    answer: "npm run dev"
  },
  {
    question: "React is maintained by?",
    options: ["Google", "Microsoft", "Facebook", "Apple"],
    answer: "Facebook"
  },
  {
    question: "In Node.js, which module handles file system?",
    options: ["http", "url", "fs", "events"],
    answer: "fs"
  },
  {
    question: "What does JSX stand for?",
    options: ["JavaScript XML", "Java Syntax Extension", "JavaScript XHTML", "Java Source XML"],
    answer: "JavaScript XML"
  },
  {
    question: "Which is a valid React hook?",
    options: ["useFetch", "useCall", "useInput", "useState"],
    answer: "useState"
  },
  {
    question: "Which function is used to send response in Express?",
    options: ["res.send()", "req.send()", "app.send()", "express.send()"],
    answer: "res.send()"
  },
  {
    question: "What is the correct command to install Express?",
    options: ["npm i express", "npm install node", "npm express", "npm start express"],
    answer: "npm i express"
  },
  {
    question: "Which CSS property makes the background a gradient?",
    options: ["background-color", "gradient", "background-image", "background"],
    answer: "background-image"
  },
  {
    question: "Which command installs Vite?",
    options: ["npm create vite", "npm vite init", "vite new", "npm install vite-app"],
    answer: "npm create vite"
  },
  {
    question: "Which file contains metadata about a Node.js project?",
    options: ["server.js", "index.js", "package.json", "config.js"],
    answer: "package.json"
  },
  {
    question: "Which lifecycle method is used in React class components to fetch data?",
    options: ["componentDidMount", "componentWillMount", "shouldComponentUpdate", "constructor"],
    answer: "componentDidMount"
  },
  {
    question: "Which of these is a JavaScript package manager?",
    options: ["npm", "composer", "pip", "cargo"],
    answer: "npm"
  },
  {
    question: "Which symbol is used to define props in a React component?",
    options: ["{}", "()", "[]", "<>"],
    answer: "{}"
  },
  {
    question: "Which method is used to create a new React app?",
    options: ["npx create-react-app", "npm create app", "npm new react", "npx react-start"],
    answer: "npx create-react-app"
  },
  {
    question: "Which CSS unit is relative to the root element?",
    options: ["em", "%", "vh", "rem"],
    answer: "rem"
  },
  // Added 5 more questions to reach 25
  {
    question: "What is the virtual DOM in React?",
    options: ["A lightweight copy of the real DOM", "A 3D rendering engine", "A database for React components", "A browser extension"],
    answer: "A lightweight copy of the real DOM"
  },
  {
    question: "Which method converts a JavaScript object to a JSON string?",
    options: ["JSON.parse()", "JSON.stringify()", "object.toJSON()", "stringifyJSON()"],
    answer: "JSON.stringify()"
  },
  {
    question: "What is the purpose of the useEffect cleanup function?",
    options: ["To clean up memory leaks", "To remove event listeners", "To cancel subscriptions", "All of the above"],
    answer: "All of the above"
  },
  {
    question: "Which operator is used for nullish coalescing in JavaScript?",
    options: ["??", "||", "&&", "##"],
    answer: "??"
  },
  {
    question: "What does the 'CORS' middleware in Express handle?",
    options: ["Cross-Origin Resource Sharing", "Cookie management", "CSRF protection", "Content compression"],
    answer: "Cross-Origin Resource Sharing"
  }
];

// Authentication Middleware
const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Routes
app.get('/api/quiz', (req, res) => {
  res.json(quizData);
});

// Register Route
app.post('/api/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // Check if user already exists by username or email
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // Create JWT token
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        highestScore: newUser.highestScore
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        highestScore: user.highestScore
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update Score Route - More robust version
app.put('/api/update-score', authenticate, async (req, res) => {
  const { score } = req.body;

  try {
    // Validate score is a number
    if (typeof score !== 'number') {
      return res.status(400).json({ message: 'Invalid score format' });
    }

    // Only update if new score is higher
    if (score > req.user.highestScore) {
      req.user.highestScore = score;
      await req.user.save();
      return res.json({ 
        success: true,
        message: 'New high score recorded!',
        highestScore: req.user.highestScore 
      });
    }

    res.json({ 
      success: false,
      message: 'Score not higher than current record',
      highestScore: req.user.highestScore 
    });
  } catch (err) {
    console.error('Score update error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update score',
      error: err.message 
    });
  }
});

// Leaderboard Route with additional stats
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.aggregate([
      {
        $match: { highestScore: { $gt: 0 } } // Only include players with scores
      },
      {
        $sort: { highestScore: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          username: 1,
          highestScore: 1,
          scorePercentage: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$highestScore", quizData.length] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      leaderboard,
      totalQuestions: quizData.length
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch leaderboard' 
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
