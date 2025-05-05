import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Set up axios defaults
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await axios.post(url, { username, password, role });
      if (data.ok) {
        onSuccess(data.user);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <h1>Bus Management System</h1>
      <h2>{isLogin ? 'Sign In' : 'Create Account'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {!isLogin && (
          <div>
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Administrator</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <button type="submit">
          {isLogin ? 'Sign In' : 'Register'}
        </button>
      </form>
      <p>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Register' : 'Sign In'}
        </button>
      </p>
    </div>
  );
}

function BusForm({ onSave, bus = null, onCancel }) {
  const [busNumber, setBusNumber] = useState(bus?.busNumber || '');
  const [capacity, setCapacity] = useState(bus?.capacity || 40);
  const [route, setRoute] = useState(bus?.route || '');
  const [status, setStatus] = useState(bus?.status || 'active');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (bus?._id) {
        await axios.put(`/buses/${bus._id}`, { busNumber, capacity, route, status });
      } else {
        await axios.post('/buses', { busNumber, capacity, route, status });
      }
      setBusNumber('');
      setCapacity(40);
      setRoute('');
      setStatus('active');
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save bus');
    }
  };

  return (
    <div className="bus-form">
      <h3>{bus ? 'Edit Bus' : 'Add New Bus'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Bus Number</label>
          <input
            type="text"
            value={busNumber}
            onChange={(e) => setBusNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Capacity</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            min="1"
            required
          />
        </div>
        <div>
          <label>Route</label>
          <input
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="form-buttons">
          <button type="submit">{bus ? 'Update' : 'Add'} Bus</button>
          {bus && <button type="button" onClick={onCancel}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}

function BusCard({ bus, onEdit, onDelete }) {
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete bus ${bus.busNumber}?`)) {
      try {
        await axios.delete(`/buses/${bus._id}`);
        onDelete();
      } catch (err) {
        console.error('Failed to delete bus:', err);
      }
    }
  };

  return (
    <div className={`bus-card status-${bus.status}`}>
      <h3>{bus.busNumber}</h3>
      <p><strong>Route:</strong> {bus.route}</p>
      <p><strong>Capacity:</strong> {bus.capacity}</p>
      <p><strong>Status:</strong> {bus.status}</p>
      {onEdit && (
        <div className="card-actions">
          <button onClick={() => onEdit(bus)}>Edit</button>
          <button onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}

function TicketBooking({ buses }) {
  const [selectedBus, setSelectedBus] = useState('');
  const [seats, setSeats] = useState(1);
  const [message, setMessage] = useState('');

  const handleBookTicket = async () => {
    if (!selectedBus) {
      setMessage('Please select a bus.');
      return;
    }

    try {
      const { data } = await axios.post('/tickets/book', {
        busId: selectedBus,
        seatsBooked: seats
      });

      if (data.ok) {
        setMessage('Ticket booked successfully!');
        setSelectedBus('');
        setSeats(1);
      } else {
        setMessage(data.error || 'Booking failed!');
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="ticket-booking">
      <h2>Book a Ticket</h2>
      <div>
        <label>Select Bus:</label>
        {buses.length === 0 ? (
          <p>No buses available for booking</p>
        ) : (
          <select value={selectedBus} onChange={(e) => setSelectedBus(e.target.value)}>
            <option value="">Select a bus</option>
            {buses.filter(bus => bus.status === 'active').map((bus) => (
              <option key={bus._id} value={bus._id}>
                {bus.busNumber} - {bus.route} ({bus.capacity} seats available)
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label>Seats:</label>
        <input
          type="number"
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          min="1"
          max="10"
        />
      </div>
      <button onClick={handleBookTicket}>Book Ticket</button>
      {message && <div className={message.includes('success') ? 'success' : 'error'}>{message}</div>}
    </div>
  );
}

function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { data } = await axios.get('/tickets/my-tickets');
        setTickets(data);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleCancelTicket = async (ticketId) => {
    if (window.confirm('Are you sure you want to cancel this ticket?')) {
      try {
        await axios.post('/tickets/cancel', { ticketId });
        setTickets(tickets.filter(ticket => ticket._id !== ticketId));
      } catch (err) {
        console.error('Failed to cancel ticket:', err);
      }
    }
  };

  if (isLoading) return <div>Loading tickets...</div>;

  return (
    <div className="my-tickets">
      <h2>My Tickets</h2>
      {tickets.length === 0 ? (
        <p>You have no tickets.</p>
      ) : (
        <div className="tickets-list">
          {tickets.map(ticket => (
            <div key={ticket._id} className="ticket-card">
              <h3>Bus: {ticket.busId.busNumber}</h3>
              <p>Route: {ticket.busId.route}</p>
              <p>Seats: {ticket.seatsBooked}</p>
              <p>Status: {ticket.status}</p>
              <p>Booked on: {new Date(ticket.createdAt).toLocaleDateString()}</p>
              {ticket.status === 'booked' && (
                <button onClick={() => handleCancelTicket(ticket._id)}>Cancel Ticket</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBus, setEditingBus] = useState(null);
  const [activeTab, setActiveTab] = useState('buses');

  useEffect(() => {
    loadBuses();
  }, []);

  const loadBuses = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/buses');
      setBuses(data);
    } catch (err) {
      console.error('Failed to load buses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      onLogout();
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Bus Management System</h1>
        <div className="user-info">
          <span>Logged in as: {user.username} ({user.role})</span>
          <button onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      <nav className="tabs">
        <button 
          className={activeTab === 'buses' ? 'active' : ''} 
          onClick={() => setActiveTab('buses')}
        >
          Buses
        </button>
        {user.role === 'admin' && (
          <button 
            className={activeTab === 'manage' ? 'active' : ''} 
            onClick={() => setActiveTab('manage')}
          >
            Manage Buses
          </button>
        )}
        <button 
          className={activeTab === 'booking' ? 'active' : ''} 
          onClick={() => setActiveTab('booking')}
        >
          Book Tickets
        </button>
        <button 
          className={activeTab === 'mytickets' ? 'active' : ''} 
          onClick={() => setActiveTab('mytickets')}
        >
          My Tickets
        </button>
      </nav>

      <main>
        {activeTab === 'buses' && (
          <>
            <h2>Available Buses</h2>
            {isLoading ? (
              <div>Loading buses...</div>
            ) : buses.length === 0 ? (
              <div>No buses available.</div>
            ) : (
              <div className="buses-grid">
                {buses.map(bus => (
                  <BusCard key={bus._id} bus={bus} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'manage' && user.role === 'admin' && (
          <>
            <h2>Manage Buses</h2>
            <BusForm onSave={loadBuses} bus={editingBus} onCancel={() => setEditingBus(null)} />
            
            <h3>All Buses</h3>
            {isLoading ? (
              <div>Loading buses...</div>
            ) : buses.length === 0 ? (
              <div>No buses in system.</div>
            ) : (
              <div className="buses-grid">
                {buses.map(bus => (
                  <BusCard 
                    key={bus._id} 
                    bus={bus} 
                    onEdit={setEditingBus} 
                    onDelete={loadBuses} 
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'booking' && (
          <TicketBooking buses={buses} />
        )}

        {activeTab === 'mytickets' && (
          <MyTickets />
        )}
      </main>
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get('/auth/me')
      .then(({ data }) => {
        if (data.ok) {
          setAuthed(true);
          setUser(data.user);
        }
      })
      .catch(err => {
        console.log('Not authenticated:', err);
        setAuthed(false);
        setUser(null);
      });
  }, []);

  const handleAuthSuccess = (userData) => {
    setAuthed(true);
    setUser(userData);
  };

  const handleLogout = () => {
    setAuthed(false);
    setUser(null);
  };

  if (!authed) {
    return <AuthForm onSuccess={handleAuthSuccess} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
