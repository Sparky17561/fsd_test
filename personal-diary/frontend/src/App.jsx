// App.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import './App.css';

// Set up axios defaults
axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = true;

function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await axios.post(url, { username, password });
      if (data.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1 className="app-title">Personal Diary</h1>
        <h2>{isLogin ? 'Sign In' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary">
            {isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>
        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            className="btn-link" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}

function EntryForm({ onSave, entry = null }) {
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || 'neutral');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const entryData = {
      title,
      content,
      mood,
      date: entry?.date || new Date().toISOString()
    };
    
    try {
      if (entry?._id) {
        // Update existing entry
        const { data } = await axios.put(`/entries/${entry._id}`, entryData);
        onSave(data, 'update');
      } else {
        // Create new entry
        const { data } = await axios.post('/entries', entryData);
        onSave(data, 'create');
      }
      
      // Reset form if it's a new entry
      if (!entry?._id) {
        setTitle('');
        setContent('');
        setMood('neutral');
      }
    } catch (err) {
      console.error('Error saving entry:', err);
      alert('Failed to save entry. Please try again.');
    }
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>{entry?._id ? 'Edit Entry' : 'New Entry'}</h2>
        <div className="mood-selector">
          <label htmlFor="mood">Mood:</label>
          <select
            id="mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          >
            <option value="happy">Happy 😊</option>
            <option value="sad">Sad 😢</option>
            <option value="excited">Excited 🎉</option>
            <option value="angry">Angry 😠</option>
            <option value="neutral">Neutral 😐</option>
          </select>
        </div>
      </div>
      
      <div className="form-group">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="entry-title"
        />
      </div>
      
      <div className="form-group">
        <textarea
          placeholder="Write your thoughts here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={8}
          className="entry-content"
        />
      </div>
      
      <button type="submit" className="btn-primary">
        {entry?._id ? 'Update Entry' : 'Save Entry'}
      </button>
    </form>
  );
}

function EntryCard({ entry, onEdit, onDelete }) {
  const formattedDate = format(new Date(entry.date), 'MMMM d, yyyy - h:mm a');
  
  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'excited': return '🎉';
      case 'angry': return '😠';
      default: return '😐';
    }
  };

  return (
    <div className={`entry-card mood-${entry.mood}`}>
      <div className="entry-header">
        <h3>{entry.title}</h3>
        <div className="entry-mood">{getMoodEmoji(entry.mood)}</div>
      </div>
      <div className="entry-date">{formattedDate}</div>
      <div className="entry-preview">
        {entry.content.length > 100
          ? `${entry.content.substring(0, 100)}...`
          : entry.content}
      </div>
      <div className="entry-actions">
        <button className="btn-secondary" onClick={() => onEdit(entry)}>
          Edit
        </button>
        <button 
          className="btn-danger" 
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this entry?')) {
              onDelete(entry._id);
            }
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EntryDetail({ entry, onClose, onEdit, onDelete }) {
  const formattedDate = format(new Date(entry.date), 'MMMM d, yyyy - h:mm a');
  
  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'excited': return '🎉';
      case 'angry': return '😠';
      default: return '😐';
    }
  };

  return (
    <div className="entry-detail-modal">
      <div className={`entry-detail-content mood-${entry.mood}`}>
        <button className="close-button" onClick={onClose}>×</button>
        <div className="entry-detail-header">
          <h2>{entry.title}</h2>
          <div className="entry-mood">{getMoodEmoji(entry.mood)}</div>
        </div>
        <div className="entry-date">{formattedDate}</div>
        <div className="entry-full-content">
          {entry.content.split('\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <div className="entry-actions">
          <button className="btn-secondary" onClick={() => onEdit(entry)}>
            Edit
          </button>
          <button 
            className="btn-danger" 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this entry?')) {
                onDelete(entry._id);
                onClose();
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DiaryApp() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [filterMood, setFilterMood] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/entries');
      setEntries(data);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEntry = (savedEntry, action) => {
    if (action === 'create') {
      setEntries([savedEntry, ...entries]);
    } else {
      setEntries(entries.map(e => 
        e._id === savedEntry._id ? savedEntry : e
      ));
    }
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id) => {
    try {
      await axios.delete(`/entries/${id}`);
      setEntries(entries.filter(e => e._id !== id));
      if (viewingEntry?._id === id) {
        setViewingEntry(null);
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert('Failed to delete entry. Please try again.');
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setViewingEntry(null);
  };

  const handleViewEntry = (entry) => {
    setViewingEntry(entry);
    setEditingEntry(null);
  };

  // Filter entries based on mood and search term
  const filteredEntries = entries.filter(entry => {
    const matchesMood = filterMood === 'all' || entry.mood === filterMood;
    const matchesSearch = searchTerm === '' || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMood && matchesSearch;
  });

  // Sort entries based on date
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      window.location.reload();
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  return (
    <div className="diary-container">
      <header className="app-header">
        <h1 className="app-title">Personal Diary</h1>
        <button className="btn-outline" onClick={handleLogout}>
          Sign Out
        </button>
      </header>

      <div className="diary-layout">
        <aside className="sidebar">
          <div className="filter-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>Filter by Mood:</label>
              <select 
                value={filterMood} 
                onChange={(e) => setFilterMood(e.target.value)}
              >
                <option value="all">All Moods</option>
                <option value="happy">Happy 😊</option>
                <option value="sad">Sad 😢</option>
                <option value="excited">Excited 🎉</option>
                <option value="angry">Angry 😠</option>
                <option value="neutral">Neutral 😐</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort by:</label>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          <EntryForm 
            onSave={handleSaveEntry} 
            entry={editingEntry} 
          />
        </aside>

        <main className="entries-container">
          <h2 className="section-title">
            {filterMood === 'all' ? 'All Entries' : `${filterMood.charAt(0).toUpperCase() + filterMood.slice(1)} Entries`}
            {searchTerm && ` matching "${searchTerm}"`}
          </h2>
          
          {isLoading ? (
            <div className="loading">Loading your diary entries...</div>
          ) : sortedEntries.length === 0 ? (
            <div className="empty-state">
              <p>
                {searchTerm || filterMood !== 'all'
                  ? 'No entries match your search or filter.'
                  : 'No diary entries yet. Create your first entry!'}
              </p>
            </div>
          ) : (
            <div className="entries-grid">
              {sortedEntries.map(entry => (
                <div key={entry._id} onClick={() => handleViewEntry(entry)}>
                  <EntryCard
                    entry={entry}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {viewingEntry && (
        <EntryDetail
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
        />
      )}
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    axios.get('/auth/me')
      .then(({ data }) => {
        if (data.ok) {
          setAuthed(true);
        }
      })
      .catch(() => setAuthed(false));
  }, []);

  if (!authed) {
    return <AuthForm onSuccess={() => setAuthed(true)} />;
  }

  return <DiaryApp />;
}

export default App;