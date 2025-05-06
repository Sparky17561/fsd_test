// app.js
// ─────────────────────────────────────────────────────────────────────────────
// Single‑file React frontend w/ axios + session auth.
// All components below; split into modules later.

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import './app.css'

// Set up axios defaults
axios.defaults.baseURL = '/api'
axios.defaults.withCredentials = true

// ==== AuthForm Component ====
// Handles both login and registration
function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    
    setLoading(true)
    setError('')
    
    try {
      const url = isLogin ? '/auth/login' : '/auth/register'
      const { data } = await axios.post(url, { username, password })
      
      if (data.ok) {
        onSuccess(data.username)
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (err) {
      setError('Server error. Please try again.')
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Log In' : 'Create Account'}</h2>
      <form onSubmit={submit}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={loading}>
          {loading ? 'Processing...' : isLogin ? 'Log In' : 'Register'}
        </button>
      </form>
      <button
        className="link-btn"
        onClick={() => {
          setIsLogin(!isLogin)
          setError('')
        }}
        disabled={loading}
      >
        {isLogin ? 'Need an account? Register' : 'Already have an account? Log In'}
      </button>
    </div>
  )
}

// ==== HabitForm Component ====
// Form for creating new habits
function HabitForm({ onAdd }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const { data } = await axios.post('/habits', { name })
      onAdd(data)
      setName('')
    } catch (err) {
      setError('Failed to add habit')
      console.error('Error adding habit:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <>
      <form onSubmit={submit} className="habit-form">
        <input
          placeholder="New habit name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />
        <button className="primary" disabled={loading}>
          {loading ? 'Adding...' : 'Add Habit'}
        </button>
      </form>
      {error && <div className="error form-error">{error}</div>}
    </>
  )
}

// ==== HabitCard Component ====
// Displays a single habit with actions
function HabitCard({ habit, onUpdate, onDelete, onComplete }) {
  const [showEdit, setShowEdit] = useState(false)
  const [name, setName] = useState(habit.name)
  const [loading, setLoading] = useState(false)
  
  // Format date nicely
  const formatDate = (dateString) => {
    if (!dateString) return 'Not yet completed'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Check if completed today
  const isCompletedToday = () => {
    if (!habit.lastCompleted) return false
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const lastCompleted = new Date(habit.lastCompleted)
    lastCompleted.setHours(0, 0, 0, 0)
    
    return lastCompleted.getTime() === today.getTime()
  }
  
  // Handle save edit
  const handleSave = async () => {
    if (!name.trim()) return
    
    setLoading(true)
    try {
      const { data } = await axios.put(`/habits/${habit._id}`, { name })
      onUpdate(data)
      setShowEdit(false)
    } catch (err) {
      console.error('Error updating habit:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle complete
  const handleComplete = async () => {
    if (isCompletedToday()) return
    
    setLoading(true)
    try {
      const { data } = await axios.post(`/habits/${habit._id}/complete`)
      onComplete(data)
    } catch (err) {
      console.error('Error completing habit:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this habit?')) return
    
    setLoading(true)
    try {
      await onDelete(habit._id)
    } catch (err) {
      console.error('Error deleting habit:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={`habit-card ${isCompletedToday() ? 'completed' : ''}`}>
        <div className="habit-header">
          <h3 className="habit-name">{habit.name}</h3>
          <div className="habit-actions">
            <button 
              onClick={() => setShowEdit(true)} 
              disabled={loading}
              title="Edit"
            >
              ✏️
            </button>
            <button 
              onClick={handleDelete} 
              disabled={loading}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div className="habit-details">
          <div className="habit-streak">
            <span className="badge">{habit.streak}</span>
            <span>day streak</span>
          </div>
          <div className="habit-last-completed">
            <strong>Last completed:</strong> {formatDate(habit.lastCompleted)}
          </div>
        </div>
        
        <button 
          className={`complete-btn ${isCompletedToday() ? 'completed' : ''}`} 
          onClick={handleComplete}
          disabled={loading || isCompletedToday()}
        >
          {isCompletedToday() ? '✓ Completed Today' : 'Mark Complete'}
        </button>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Habit</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <div className="button-group">
              <button onClick={handleSave} className="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => setShowEdit(false)} 
                className="secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ==== EmptyState Component ====
// Shown when user has no habits
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">📝</div>
      <h3>No habits yet</h3>
      <p>Add your first habit using the form above to get started!</p>
    </div>
  )
}

// ==== App Component ====
// Main application component
function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load user data and habits
  const loadData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data } = await axios.get('/habits')
      setHabits(data)
    } catch (err) {
      console.error('Error loading habits:', err)
      setError('Failed to load habits')
    } finally {
      setLoading(false)
    }
  }

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axios.get('/auth/me')
        if (data.ok) {
          setAuthenticated(true)
          setUsername(data.username)
          await loadData()
        }
      } catch (err) {
        console.error('Auth check error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  // Handle login/register success
  const handleLoginSuccess = async (username) => {
    setAuthenticated(true)
    setUsername(username)
    await loadData()
  }
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')
      setAuthenticated(false)
      setUsername('')
      setHabits([])
    } catch (err) {
      console.error('Logout error:', err)
    }
  }
  
  // Handle adding new habit
  const handleAddHabit = (habit) => {
    setHabits((prev) => [habit, ...prev])
  }
  
  // Handle updating habit
  const handleUpdateHabit = (updatedHabit) => {
    setHabits((prev) => 
      prev.map((h) => (h._id === updatedHabit._id ? updatedHabit : h))
    )
  }
  
  // Handle deleting habit
  const handleDeleteHabit = async (id) => {
    try {
      await axios.delete(`/habits/${id}`)
      setHabits((prev) => prev.filter((h) => h._id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      throw err
    }
  }

  // Show login/register form if not authenticated
  if (!authenticated) {
    return <AuthForm onSuccess={handleLoginSuccess} />
  }

  return (
    <div className="container">
      <header>
        <div className="header-left">
          <h1>Habit Tracker</h1>
          {username && <span className="username">Welcome, {username}</span>}
        </div>
        <button onClick={handleLogout} className="secondary">Log Out</button>
      </header>

      <div className="main-content">
        <HabitForm onAdd={handleAddHabit} />
        
        {loading ? (
          <div className="loading">Loading habits...</div>
        ) : error ? (
          <div className="error main-error">{error}</div>
        ) : habits.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="habits-grid">
            {habits.map((habit) => (
              <HabitCard
                key={habit._id}
                habit={habit}
                onUpdate={handleUpdateHabit}
                onDelete={handleDeleteHabit}
                onComplete={handleUpdateHabit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




export default App