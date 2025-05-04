// App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';

/* 
  👉 Make sure you've added this in your public/index.html <head>:
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    integrity="sha512-pIVQuG1ZevL+4x2d6f3NhONcNuoYnM+GfY8n1X9lWqR+tHuZ/0BMyrUu9s1kpBKW+6T4MEZR+5x6bkgUnX+log=="
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
  />
*/

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({ username: '', password: '', text: '' });
  const [complaints, setComplaints] = useState([]);
  const [sort, setSort] = useState('newest');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  // Check if user is already logged in when app loads
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/session', { 
          credentials: 'include'
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // Fetch complaints
  const fetchComplaints = () => {
    fetch(`/api/complaints?sort=${sort}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setComplaints)
      .catch(err => console.error('Error fetching complaints:', err));
  };

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [sort, user]);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: form.username, password: form.password })
      });
      
      if (!res.ok) {
        const error = await res.json();
        return alert(error.error || 'Login failed');
      }
      
      const userData = await res.json();
      setUser(userData);
      setForm(f => ({ ...f, username: '', password: '' }));
    } catch (err) {
      console.error('Login error:', err);
      alert('Login failed. Please try again.');
    }
  };

  const handleRegister = async () => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password })
      });
      
      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || 'Register failed');
      }
      
      alert('Registered! Please login.');
      setView('login');
      setForm(f => ({ ...f, username: '', password: '' }));
    } catch (err) {
      console.error('Register error:', err);
      alert('Registration failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      setUser(null);
      setView('login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const submitComplaint = async () => {
    // Admin can only make announcements, not regular complaints
    if (!form.text.trim()) return;
    
    try {
      // If user is admin, only allow announcements
      if (user.role === 'admin' && !isAnnouncement) {
        return alert('As an admin, you can only make announcements.');
      }
      
      const payload = { 
        text: form.text
      };
      
      // Only include isAnnouncement if user is admin
      if (user.role === 'admin') {
        payload.isAnnouncement = isAnnouncement;
      }
      
      const res = await fetch('/api/complaints', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setForm(f => ({ ...f, text: '' }));
        if (user.role === 'admin') {
          setIsAnnouncement(false);
        }
        fetchComplaints();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit complaint');
    }
  };

  const toggleUpvote = async id => {
    try {
      const res = await fetch(`/api/complaints/${id}/upvote`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        const updated = await res.json();
        setComplaints(cs =>
          cs.map(c => (c._id === updated._id ? updated : c))
        );
      }
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };
  
  const toggleDownvote = async id => {
    try {
      const res = await fetch(`/api/complaints/${id}/downvote`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        const updated = await res.json();
        setComplaints(cs =>
          cs.map(c => (c._id === updated._id ? updated : c))
        );
      }
    } catch (err) {
      console.error('Downvote error:', err);
    }
  };

  const startEdit = (id, text, isAnnouncement) => {
    setEditId(id);
    setEditText(text);
    setIsAnnouncement(isAnnouncement || false);
  };

  const saveEdit = async () => {
    try {
      const payload = { text: editText };
      
      // Only include isAnnouncement if user is admin
      if (user.role === 'admin') {
        payload.isAnnouncement = isAnnouncement;
      }
      
      const res = await fetch(`/api/complaints/${editId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const updated = await res.json();
        setComplaints(cs => 
          cs.map(c => (c._id === updated._id ? updated : c))
        );
        setEditId(null);
        setEditText('');
        setIsAnnouncement(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update');
      }
    } catch (err) {
      console.error('Edit error:', err);
      alert('Failed to update complaint');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditText('');
    setIsAnnouncement(false);
  };

  const deleteComplaint = async id => {
    if (!window.confirm('Delete this complaint?')) return;
    
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        setComplaints(cs => cs.filter(c => c._id !== id));
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete complaint');
    }
  };

  // Show loading spinner when checking session
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // — LOGIN / REGISTER —
  if (!user) {
    return (
      <div className="login-container">
        <h2>{view === 'login' ? 'Login' : 'Register'}</h2>
        <input
          placeholder="Username"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />
        <button onClick={view === 'login' ? handleLogin : handleRegister}>
          {view === 'login' ? 'Login' : 'Register'}
        </button>
        <p onClick={() => setView(v => (v === 'login' ? 'register' : 'login'))} className="toggle">
          {view === 'login' ? 'Create account?' : 'Have an account? Login'}
        </p>
      </div>
    );
  }

  // — MAIN APP —
  return (
    <div className="app-container">
      <header>
        <h1>Complaints</h1>
        <div className="user-info">
          <span>{user.username} ({user.role})</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="controls">
        <input
          placeholder="Your complaint..."
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
        />
        
        {user.role === 'admin' && (
          <div className="announcement-toggle">
            <input
              type="checkbox"
              id="announcement-checkbox"
              checked={isAnnouncement}
              onChange={() => setIsAnnouncement(!isAnnouncement)}
            />
            <label htmlFor="announcement-checkbox">Announcement</label>
          </div>
        )}
        
        <button onClick={submitComplaint}>
          {user.role === 'admin' ? 'Post Announcement' : 'Submit'}
        </button>
        
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="upvotes">Most Upvoted</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <div className="list">
        {complaints.map(c => (
          <div 
            key={c._id} 
            className={`card ${c.isAnnouncement ? 'announcement' : c.user_name === 'admin' ? 'admin-post' : 'user-post'}`}
          >
            <div className="card-header">
              <strong>{c.user_name}</strong>
              <span>{new Date(c.createdAt).toLocaleString()}</span>
            </div>

            {editId === c._id ? (
              <div className="edit-area">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                />
                
                {user.role === 'admin' && (
                  <div className="announcement-toggle edit-toggle">
                    <input
                      type="checkbox"
                      id="edit-announcement-checkbox"
                      checked={isAnnouncement}
                      onChange={() => setIsAnnouncement(!isAnnouncement)}
                    />
                    <label htmlFor="edit-announcement-checkbox">Announcement</label>
                  </div>
                )}
                
                <div className="edit-buttons">
                  <button onClick={saveEdit}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {c.isAnnouncement && <div className="announcement-badge">Announcement</div>}
                <p>{c.text}</p>
              </>
            )}

            <div className="card-footer">
              {!c.isAnnouncement && (
                <div className="vote-controls">
                  <button className={`vote-btn upvote-btn ${c.hasUpvoted ? 'active-vote' : ''}`} onClick={() => toggleUpvote(c._id)}>
                    +
                  </button>
                  <span className="upvote-count">{c.upvotes}</span>
                  <button className="vote-btn downvote-btn" onClick={() => toggleDownvote(c._id)}>
                    -
                  </button>
                </div>
              )}

              {(c.canEdit || user.role === 'admin') && editId !== c._id && (
                <div className="action-buttons">
                  {c.canEdit && (
                    <button className="icon-btn edit-icon" onClick={() => startEdit(c._id, c.text, c.isAnnouncement)}>
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                  )}
                  <button className="icon-btn delete-icon" onClick={() => deleteComplaint(c._id)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {complaints.length === 0 && (
          <div className="empty-state">
            <p>No complaints yet. Be the first to post!</p>
          </div>
        )}
      </div>
    </div>
  );
}