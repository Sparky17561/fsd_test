const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());

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
  }
];

app.get('/api/quiz', (req, res) => {
  res.json(quizData);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
