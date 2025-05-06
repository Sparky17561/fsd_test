// app.jsx
// ─────────────────────────────────────────────────────────────────────────────
// React frontend for Voting Management System

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './app.css';

// Set up axios defaults
axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = true;

// ==== AuthForm Component ====
// Handles both login and registration
function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      const url = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await axios.post(url, { username, password });
      
      if (data.ok) {
        onSuccess(data.username, data.isAdmin);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Server error. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

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
          setIsLogin(!isLogin);
          setError('');
        }}
        disabled={loading}
      >
        {isLogin ? 'Need an account? Register' : 'Already have an account? Log In'}
      </button>
    </div>
  );
}

// ==== PartyForm Component ====
// Form for creating/editing parties (admin only)
function PartyForm({ party = null, onSubmit, onCancel }) {
  const [name, setName] = useState(party?.name || '');
  const [description, setDescription] = useState(party?.description || '');
  const [logoUrl, setLogoUrl] = useState(party?.logoUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isEdit = Boolean(party);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const url = isEdit ? `/parties/${party._id}` : '/parties';
      const method = isEdit ? axios.put : axios.post;
      
      const { data } = await method(url, { name, description, logoUrl });
      onSubmit(data);
      
      // Reset form if not editing
      if (!isEdit) {
        setName('');
        setDescription('');
        setLogoUrl('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save party');
      console.error('Error saving party:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="party-form-container">
      <h3>{isEdit ? 'Edit Party' : 'Add New Party'}</h3>
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Party Name</label>
          <input
            placeholder="Party name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={4}
          />
        </div>
        
        <div className="form-group">
          <label>Logo URL</label>
          <input
            placeholder="Logo URL (optional)"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={loading}
          />
        </div>
        
        {error && <div className="error form-error">{error}</div>}
        
        <div className="button-group">
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Party' : 'Add Party'}
          </button>
          {onCancel && (
            <button 
              type="button" 
              className="secondary" 
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ==== PartyCard Component ====
// Displays a single party with actions
function PartyCard({ party, userVote, isAdmin, onVote, onRevokeVote, onEdit, onDelete }) {
  const isVoted = userVote && userVote.party._id === party._id;
  const [loading, setLoading] = useState(false);
  
  const handleVote = async () => {
    setLoading(true);
    try {
      await onVote(party._id);
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRevokeVote = async () => {
    if (!window.confirm('Are you sure you want to revoke your vote?')) return;
    
    setLoading(true);
    try {
      await onRevokeVote();
    } catch (err) {
      console.error('Revoke vote error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${party.name}"? All votes for this party will also be deleted.`)) return;
    
    setLoading(true);
    try {
      await onDelete(party._id);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`party-card ${isVoted ? 'voted' : ''}`}>
      <div className="party-header">
        <h3 className="party-name">{party.name}</h3>
        {isAdmin && (
          <div className="party-actions">
            <button 
              onClick={() => onEdit(party)} 
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
        )}
      </div>
      
      {party.logoUrl && (
        <div className="party-logo">
          <img src={party.logoUrl} alt={`${party.name} logo`} />
        </div>
      )}
      
      {party.description && (
        <div className="party-description">{party.description}</div>
      )}
      
      {!isAdmin && (
        <div className="vote-action">
          {isVoted ? (
            <button 
              className="secondary revoke-btn" 
              onClick={handleRevokeVote}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Revoke Vote'}
            </button>
          ) : (
            <button 
              className="primary vote-btn" 
              onClick={handleVote}
              disabled={loading || (userVote && !isVoted)}
            >
              {loading ? 'Processing...' : userVote ? 'Change Vote to This Party' : 'Vote for This Party'}
            </button>
          )}
          
          {isVoted && <div className="voted-badge">Your Vote</div>}
        </div>
      )}
    </div>
  );
}

// ==== VoteResultsCard Component ====
// Displays vote statistics
function VoteResultsCard({ voteStats, totalVotes }) {
  return (
    <div className="results-card">
      <h3>Voting Results</h3>
      
      {voteStats.length === 0 ? (
        <p className="no-votes">No votes have been cast yet.</p>
      ) : (
        <div className="results-list">
          {voteStats.map(stat => {
            const percentage = totalVotes > 0 
              ? ((stat.count / totalVotes) * 100).toFixed(1)
              : 0;
              
            return (
              <div key={stat._id} className="result-item">
                <div className="result-name">{stat.name}</div>
                <div className="result-bar-container">
                  <div 
                    className="result-bar" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="result-stats">
                  <span className="result-count">{stat.count}</span>
                  <span className="result-percentage">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="total-votes">
        Total votes: <strong>{totalVotes}</strong>
      </div>
    </div>
  );
}

// ==== VotesList Component ====
// Admin view of all votes
function VotesList({ votes }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="votes-list-container">
      <h3>All Votes</h3>
      
      {votes.length === 0 ? (
        <p className="no-votes">No votes have been cast.</p>
      ) : (
        <table className="votes-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Party</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {votes.map(vote => (
              <tr key={vote._id}>
                <td>{vote.user.username}</td>
                <td>{vote.party.name}</td>
                <td>{formatDate(vote.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ==== EmptyState Component ====
// Shown when no parties exist
function EmptyState({ isAdmin }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🗳️</div>
      <h3>No parties available</h3>
      {isAdmin ? (
        <p>Add your first party using the form above to get started!</p>
      ) : (
        <p>No parties have been added to the system yet. Please check back later.</p>
      )}
    </div>
  );
}

// ==== App Component ====
// Main application component
function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [parties, setParties] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [voteStats, setVoteStats] = useState([]);
  const [allVotes, setAllVotes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load data based on user type
  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch parties for everyone
      const partiesRes = await axios.get('/parties');
      setParties(partiesRes.data);
      
      // Fetch vote counts for everyone
      const statsRes = await axios.get('/votes/count');
      setVoteStats(statsRes.data);
      
      // If authenticated, fetch user's vote
      if (authenticated) {
        const userVoteRes = await axios.get('/votes/mine');
        setUserVote(userVoteRes.data);
        
        // If admin, fetch all votes
        if (isAdmin) {
          const allVotesRes = await axios.get('/votes');
          setAllVotes(allVotesRes.data);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axios.get('/auth/me');
        if (data.ok) {
          setAuthenticated(true);
          setUsername(data.username);
          setIsAdmin(data.isAdmin);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Load data when auth status changes
  useEffect(() => {
    if (loading) return;
    loadData();
  }, [authenticated, isAdmin]);

  // Handle login/register success
  const handleLoginSuccess = (username, isAdmin) => {
    setAuthenticated(true);
    setUsername(username);
    setIsAdmin(isAdmin);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      setAuthenticated(false);
      setUsername('');
      setIsAdmin(false);
      setUserVote(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };
  
  // Handle adding party
  const handleAddParty = (party) => {
    setParties((prev) => [party, ...prev]);
    setShowAddForm(false);
  };
  
  // Handle updating party
  const handleUpdateParty = (updatedParty) => {
    setParties((prev) => 
      prev.map((p) => (p._id === updatedParty._id ? updatedParty : p))
    );
    setEditingParty(null);
  };
  
  // Handle deleting party
  const handleDeleteParty = async (id) => {
    try {
      await axios.delete(`/parties/${id}`);
      setParties((prev) => prev.filter((p) => p._id !== id));
      
      // Refresh vote stats and user vote
      await loadData();
    } catch (err) {
      console.error('Delete party error:', err);
    }
  };
  
  // Handle voting for a party
  const handleVote = async (partyId) => {
    try {
      const { data } = await axios.post('/votes', { partyId });
      setUserVote(data);
      
      // Refresh vote stats
      const statsRes = await axios.get('/votes/count');
      setVoteStats(statsRes.data);
    } catch (err) {
      console.error('Vote error:', err);
    }
  };
  
  // Handle revoking vote
  const handleRevokeVote = async () => {
    try {
      await axios.delete('/votes');
      setUserVote(null);
      
      // Refresh vote stats
      const statsRes = await axios.get('/votes/count');
      setVoteStats(statsRes.data);
    } catch (err) {
      console.error('Revoke vote error:', err);
    }
  };
  
  // Calculate total votes
  const totalVotes = voteStats.reduce((sum, stat) => sum + stat.count, 0);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="branding">
          <h1>Voting Management System</h1>
        </div>
        {authenticated && (
          <div className="user-controls">
            <span className="username">
              {isAdmin ? '👑 ' : ''}
              {username}
            </span>
            <button className="logout-btn" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        )}
      </header>
      
      <main className="app-main">
        {!authenticated ? (
          <AuthForm onSuccess={handleLoginSuccess} />
        ) : (
          <div className="dashboard">
            {error && <div className="error global-error">{error}</div>}
            
            {/* Admin party form section */}
            {isAdmin && (
              <section className="admin-actions">
                {editingParty ? (
                  <PartyForm 
                    party={editingParty} 
                    onSubmit={handleUpdateParty}
                    onCancel={() => setEditingParty(null)}
                  />
                ) : showAddForm ? (
                  <PartyForm 
                    onSubmit={handleAddParty}
                    onCancel={() => setShowAddForm(false)}
                  />
                ) : (
                  <button
                    className="primary add-party-btn"
                    onClick={() => setShowAddForm(true)}
                  >
                    Add New Party
                  </button>
                )}
              </section>
            )}
            
            {/* Results section */}
            <section className="results-section">
              <VoteResultsCard 
                voteStats={voteStats} 
                totalVotes={totalVotes} 
              />
            </section>
            
            {/* Parties section */}
            <section className="parties-section">
              <h2>Political Parties</h2>
              
              {loading ? (
                <div className="loading">Loading...</div>
              ) : parties.length === 0 ? (
                <EmptyState isAdmin={isAdmin} />
              ) : (
                <div className="party-grid">
                  {parties.map(party => (
                    <PartyCard
                      key={party._id}
                      party={party}
                      userVote={userVote}
                      isAdmin={isAdmin}
                      onVote={handleVote}
                      onRevokeVote={handleRevokeVote}
                      onEdit={(party) => setEditingParty(party)}
                      onDelete={handleDeleteParty}
                    />
                  ))}
                </div>
              )}
            </section>
            
            {/* Admin votes section */}
            {isAdmin && (
              <section className="admin-votes-section">
                <VotesList votes={allVotes} />
              </section>
            )}
          </div>
        )}
      </main>
      
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Voting Management System</p>
      </footer>
    </div>
  );
}

// ==== Render the App ====
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App;