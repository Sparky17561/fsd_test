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

// ==== NoteForm ====
function NoteForm({ onAdd }) {
  const [text, setText] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const { data } = await axios.post('/notes', { text })
    if (data) onAdd(data)
    setText('')
  }
  return (
    <form onSubmit={submit} className="note-form">
      <textarea
        placeholder="Write your note..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows="3"
        required
      />
      <button type="submit" className="primary">
        Add Note
      </button>
    </form>
  )
}

// ==== NoteCard ====
// Updated NoteCard component to fix the modal overlay bug
function NoteCard({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(note.text)

  // Reset text when cancelling edit to prevent stale text
  const cancelEdit = () => {
    setText(note.text)
    setIsEditing(false)
  }

  const save = async () => {
    if (!text.trim()) {
      return // Prevent empty notes
    }
    try {
      const { data } = await axios.put(`/notes/${note._id}`, { text })
      onUpdate(data)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update note:', err)
      // Could add error handling UI here
    }
  }

  // Render modal outside of note card when editing
  const editModal = isEditing && (
    <div className="modal">
      <div className="modal-content">
        <h3>Edit Note</h3>
        <textarea
          rows="6"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
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
      <div className="note-card">
        <div className="note-actions">
          <button onClick={() => setIsEditing(true)} title="Edit note">✏️</button>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this note?')) {
                onDelete(note._id)
              }
            }} 
            title="Delete note"
          >
            🗑️
          </button>
        </div>
        <p className="note-text">{note.text}</p>
      </div>
      {editModal}
    </>
  )
}

// ==== Main App ====
function App() {
  const [authed, setAuthed] = useState(false)
  const [notes, setNotes] = useState([])

  // loader
  const loadNotes = () =>
    axios.get('/notes').then((res) => setNotes(res.data))

  // on mount, check session first
  useEffect(() => {
    axios
      .get('/auth/me')
      .then(({ data }) => {
        if (data.ok) {
          loadNotes().then(() => setAuthed(true))
        } else {
          setAuthed(false)
        }
      })
      .catch(() => setAuthed(false))
  }, [])

  // after login/register
  const handleLogin = async () => {
    await loadNotes()
    setAuthed(true)
  }

  const handleLogout = async () => {
    await axios.post('/auth/logout')
    setAuthed(false)
    setNotes([])
  }

  if (!authed) {
    return <AuthForm onSuccess={handleLogin} />
  }

  return (
    <div className="container">
      <header>
        <h1>My Notes</h1>
        <button onClick={handleLogout} className="secondary">
          Log Out
        </button>
      </header>

      <NoteForm onAdd={(n) => setNotes([n, ...notes])} />

      <div className="notes-grid">
        {notes.map((n) => (
          <NoteCard
            key={n._id}
            note={n}
            onUpdate={(u) =>
              setNotes((prev) => prev.map((x) => (x._id === u._id ? u : x)))
            }
            onDelete={async (id) => {
              await axios.delete(`/notes/${id}`)
              setNotes((prev) => prev.filter((x) => x._id !== id))
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default App

