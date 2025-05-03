// App.jsx
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import './app.css'

// Proxy to Express via vite.config.js
axios.defaults.baseURL = '/api'
axios.defaults.withCredentials = true

// ==== AuthForm ====
function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const url = isLogin ? '/auth/login' : '/auth/register'
      const { data } = await axios.post(url, { username, password })
      // both endpoints return { ok:true } on success
      if (data.ok) onSuccess()
      else setError(data.error || 'Something went wrong')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    }
  }

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Log In' : 'Register'}</h2>
      <form onSubmit={submit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" className="primary">
          {isLogin ? 'Log In' : 'Register'}
        </button>
      </form>
      <button
        className="link-btn"
        onClick={() => {
          setIsLogin(!isLogin)
          setError('')
        }}
      >
        {isLogin ? 'Need an account? Register' : 'Have one? Log In'}
      </button>
    </div>
  )
}

// ==== TodoForm ====
function TodoForm({ onAdd }) {
  const [task, setTask] = useState('')
  const [priority, setPriority] = useState('medium')

  const submit = async (e) => {
    e.preventDefault()
    if (!task.trim()) return
    const { data } = await axios.post('/todos', { 
      task, 
      priority,
      completed: false
    })
    if (data) onAdd(data)
    setTask('')
    setPriority('medium')
  }

  return (
    <form onSubmit={submit} className="todo-form">
      <div className="input-group">
        <input
          placeholder="Add a new task..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
          required
        />
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
      </div>
      <button type="submit" className="primary">
        Add Task
      </button>
    </form>
  )
}

// ==== TodoItem ====
function TodoItem({ todo, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [task, setTask] = useState(todo.task)
  const [priority, setPriority] = useState(todo.priority)

  // Reset state when cancelling edit
  const cancelEdit = () => {
    setTask(todo.task)
    setPriority(todo.priority)
    setIsEditing(false)
  }

  // Toggle completed status
  const toggleCompleted = async () => {
    try {
      const { data } = await axios.put(`/todos/${todo._id}`, { 
        ...todo,
        completed: !todo.completed 
      })
      onUpdate(data)
    } catch (err) {
      console.error('Failed to update todo:', err)
    }
  }

  // Save edited todo
  const save = async () => {
    if (!task.trim()) return
    try {
      const { data } = await axios.put(`/todos/${todo._id}`, { 
        task, 
        priority,
        completed: todo.completed
      })
      onUpdate(data)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update todo:', err)
    }
  }

  // Render modal outside of todo item when editing
  const editModal = isEditing && (
    <div className="modal">
      <div className="modal-content">
        <h3>Edit Task</h3>
        <div className="form-group">
          <label htmlFor="task">Task</label>
          <input
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select 
            id="priority"
            value={priority} 
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        <div className="button-group">
          <button onClick={save} className="primary">
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className={`todo-item ${todo.completed ? 'completed' : ''}`}>
        <div className="todo-content">
          <input 
            type="checkbox"
            className="todo-checkbox"
            checked={todo.completed}
            onChange={toggleCompleted}
          />
          <span className="todo-text">{todo.task}</span>
          <span className={`todo-priority ${todo.priority}`}>
            {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
          </span>
        </div>
        <div className="todo-actions">
          <button onClick={() => setIsEditing(true)} title="Edit task">✏️</button>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this task?')) {
                onDelete(todo._id)
              }
            }} 
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>
      {editModal}
    </>
  )
}

// Stats Component
function Stats({ todos }) {
  const total = todos.length
  const completed = todos.filter(t => t.completed).length
  const pending = total - completed
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="stats">
      <div className="stat-item">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Total Tasks</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{completed}</span>
        <span className="stat-label">Completed</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{pending}</span>
        <span className="stat-label">Pending</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{completionRate}%</span>
        <span className="stat-label">Completion Rate</span>
      </div>
    </div>
  )
}

// ==== Main App ====
function App() {
  const [authed, setAuthed] = useState(false)
  const [todos, setTodos] = useState([])
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // loader
  const loadTodos = () =>
    axios.get('/todos').then((res) => setTodos(res.data))

  // on mount, check session first
  useEffect(() => {
    axios
      .get('/auth/me')
      .then(({ data }) => {
        if (data.ok) {
          loadTodos().then(() => setAuthed(true))
        } else {
          setAuthed(false)
        }
      })
      .catch(() => setAuthed(false))
  }, [])

  // after login/register
  const handleLogin = async () => {
    await loadTodos()
    setAuthed(true)
  }

  const handleLogout = async () => {
    await axios.post('/auth/logout')
    setAuthed(false)
    setTodos([])
  }

  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed') return todo.completed
    if (filter === 'active') return !todo.completed
    return true // 'all'
  })

  // Sort todos based on current sort option
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt)
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt)
    } else if (sortBy === 'priority') {
      const priorityValue = { high: 3, medium: 2, low: 1 }
      return priorityValue[b.priority] - priorityValue[a.priority]
    }
    return 0
  })

  if (!authed) {
    return <AuthForm onSuccess={handleLogin} />
  }

  return (
    <div className="container">
      <header>
        <h1>My To-Do List</h1>
        <button onClick={handleLogout} className="secondary">
          Log Out
        </button>
      </header>

      <Stats todos={todos} />

      <div className="filters">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Tasks</option>
          <option value="active">Active Tasks</option>
          <option value="completed">Completed Tasks</option>
        </select>
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <TodoForm onAdd={(t) => setTodos([t, ...todos])} />

      <div className="todos-list">
        {sortedTodos.length === 0 ? (
          <div className="empty-state">
            <h3>No tasks found</h3>
            <p>{filter === 'all' ? 'Add a new task to get started!' : 'Try changing your filters'}</p>
          </div>
        ) : (
          sortedTodos.map((t) => (
            <TodoItem
              key={t._id}
              todo={t}
              onUpdate={(updated) =>
                setTodos((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))
              }
              onDelete={async (id) => {
                await axios.delete(`/todos/${id}`)
                setTodos((prev) => prev.filter((x) => x._id !== id))
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default App