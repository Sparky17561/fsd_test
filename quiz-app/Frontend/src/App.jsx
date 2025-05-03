import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import './index.css'

function App() {
  const [quizData, setQuizData] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [showScore, setShowScore] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/quiz')
        const data = await response.json()
        setQuizData(data)
      } catch (error) {
        console.error('Error fetching quiz data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchQuizData()
  }, [])

  const handleOptionClick = (option) => {
    if (answered) return
    
    setSelectedOption(option)
    setAnswered(true)
    
    if (option === quizData[currentQuestion].answer) {
      setScore(score + 1)
      // Enhanced confetti with different colors
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      })
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      setShowScore(true)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setSelectedOption(null)
      setAnswered(false)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestion(0)
    setScore(0)
    setShowScore(false)
    setSelectedOption(null)
    setAnswered(false)
    setQuizStarted(false)
  }

  const startQuiz = () => {
    setQuizStarted(true)
  }

  const getPerformanceData = () => {
    const percentage = (score / quizData.length) * 100
    if (percentage >= 90) return { emoji: '🏆', message: 'Exceptional!', color: '#FFD700' }
    if (percentage >= 75) return { emoji: '🎉', message: 'Excellent!', color: '#4CAF50' }
    if (percentage >= 60) return { emoji: '👍', message: 'Great job!', color: '#2196F3' }
    if (percentage >= 40) return { emoji: '😊', message: 'Good effort!', color: '#FF9800' }
    return { emoji: '🧠', message: 'Keep learning!', color: '#F44336' }
  }

  const renderProgressBar = () => {
    const progress = ((currentQuestion + 1) / quizData.length) * 100
    return (
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading Quiz...</p>
      </div>
    )
  }

  return (
    <div className="app">
      {!quizStarted ? (
        <div className="hero-section">
          <div className="hero-content">
            <h1>Quizzify</h1>
            <p className="hero-subtitle">Test your web development knowledge with our interactive quiz</p>
            <div className="hero-features">
              <div className="feature">
                <span>📚</span> 25 Questions
              </div>
              <div className="feature">
                <span>🎯</span> Instant Feedback
              </div>
              <div className="feature">
                <span>🏆</span> Score Tracking
              </div>
            </div>
            <button onClick={startQuiz} className="start-btn">
              Start Quiz <span>→</span>
            </button>
          </div>
          <div className="hero-decoration">
            <div className="decoration-circle"></div>
            <div className="decoration-circle"></div>
            <div className="decoration-circle"></div>
          </div>
        </div>
      ) : showScore ? (
        <div className="score-section">
          <div className="score-card">
            <h2>Quiz Completed!</h2>
            <div className="score-display" style={{ color: getPerformanceData().color }}>
              {score}<span>/{quizData.length}</span>
            </div>
            <div className="performance-message">
              <span className="emoji">{getPerformanceData().emoji}</span>
              <p>{getPerformanceData().message}</p>
            </div>
            <div className="score-actions">
              <button onClick={restartQuiz} className="restart-btn">
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : (
        quizData.length > 0 && (
          <div className="quiz-container">
            {renderProgressBar()}
            <div className="question-section">
              <div className="question-count">
                Question <span>{currentQuestion + 1}</span> of {quizData.length}
              </div>
              <div className="question-text">
                {quizData[currentQuestion].question}
              </div>
            </div>
            <div className="answer-section">
              {quizData[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  className={`option-btn ${
                    selectedOption === option
                      ? option === quizData[currentQuestion].answer
                        ? 'correct'
                        : 'incorrect'
                      : answered && option === quizData[currentQuestion].answer
                      ? 'correct'
                      : ''
                  }`}
                  disabled={answered}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option}</span>
                  {selectedOption === option && (
                    <span className="option-feedback">
                      {option === quizData[currentQuestion].answer ? '✓' : '✗'}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="navigation-buttons">
              <button 
                onClick={handlePrevQuestion} 
                disabled={currentQuestion === 0}
                className="nav-btn prev-btn"
              >
                ← Previous
              </button>
              <div className="question-indicator">
                {currentQuestion + 1}/{quizData.length}
              </div>
              <button 
                onClick={handleNextQuestion} 
                className="nav-btn next-btn"
              >
                {currentQuestion === quizData.length - 1 ? 'Finish →' : 'Next →'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default App