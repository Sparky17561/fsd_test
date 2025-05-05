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
  const [role, setRole] = useState('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = isLogin ? '/auth/login' : '/auth/register';
      let payload = { username, password };
      
      if (!isLogin) {
        payload = { ...payload, role, fullName, email };
      }
      
      const { data } = await axios.post(url, payload);
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
      <h1>College Admission Management System</h1>
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
        
        {!isLogin && (
          <>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </>
        )}
        
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn-primary">
          {isLogin ? 'Sign In' : 'Register'}
        </button>
      </form>
      <p className="toggle-auth">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="link-button"
        >
          {isLogin ? 'Register' : 'Sign In'}
        </button>
      </p>
    </div>
  );
}

function ProgramCard({ program, showApplyButton = true, onApply }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  return (
    <div className="program-card">
      <h3>{program.name}</h3>
      <p className="program-description">{program.description}</p>
      <div className="program-details">
        <p><strong>Duration:</strong> {program.duration}</p>
        <p><strong>Available Seats:</strong> {program.availableSeats}</p>
        <p><strong>Application Deadline:</strong> {formatDate(program.deadline)}</p>
      </div>
      {program.requirements && (
        <div className="program-requirements">
          <h4>Requirements:</h4>
          <p>{program.requirements}</p>
        </div>
      )}
      {showApplyButton && (
        <button 
          onClick={() => onApply(program)} 
          className="btn-apply"
          disabled={new Date(program.deadline) < new Date()}
        >
          Apply Now
        </button>
      )}
    </div>
  );
}
function ApplicationForm({ program, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    address: '',
    previousEducation: {
      institution: '',
      degree: '',
      graduationYear: new Date().getFullYear(),
      gpa: 0
    }
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const payload = {
        ...formData,
        program: program._id
      };
      
      const { data } = await axios.post('/applications', payload);
      onSubmit(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    }
  };

  return (
    <div className="application-form">
      <h2>Apply for {program.name}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Personal Information</h3>
          
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-section">
          <h3>Previous Education</h3>
          
          <div className="form-group">
            <label htmlFor="previousEducation.institution">Institution</label>
            <input
              id="previousEducation.institution"
              name="previousEducation.institution"
              type="text"
              value={formData.previousEducation.institution}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="previousEducation.degree">Degree/Certificate</label>
            <input
              id="previousEducation.degree"
              name="previousEducation.degree"
              type="text"
              value={formData.previousEducation.degree}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="previousEducation.graduationYear">Graduation Year</label>
            <input
              id="previousEducation.graduationYear"
              name="previousEducation.graduationYear"
              type="number"
              min="1950"
              max={new Date().getFullYear()}
              value={formData.previousEducation.graduationYear}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="previousEducation.gpa">GPA</label>
            <input
              id="previousEducation.gpa"
              name="previousEducation.gpa"
              type="number"
              step="0.01"
              min="0"
              max="4"
              value={formData.previousEducation.gpa}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        {error && <div className="error">{error}</div>}
        
        <div className="form-buttons">
          <button type="submit" className="btn-primary">Submit Application</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function ApplicationCard({ application }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      case 'under-review': return 'status-review';
      default: return 'status-pending';
    }
  };
  
  return (
    <div className="application-card">
      <div className={`application-status ${getStatusClass(application.status)}`}>
        {application.status.toUpperCase()}
      </div>
      <h3>Application for {application.program}</h3>
      <p><strong>Applied on:</strong> {formatDate(application.submittedAt)}</p>
      {application.adminNotes && (
        <div className="admin-notes">
          <h4>Admin Notes:</h4>
          <p>{application.adminNotes}</p>
        </div>
      )}
    </div>
  );
}

function StudentDashboard({ user, activeTab, setActiveTab }) {
  const [programs, setPrograms] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPrograms();
    fetchApplications();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data } = await axios.get('/programs');
      setPrograms(data);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };
  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/applications/my');
      setApplications(data);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (program) => {
    setSelectedProgram(program);
    setActiveTab('apply');
  };

  const handleApplicationSubmit = (application) => {
    setMessage('Application submitted successfully!');
    setSelectedProgram(null);
    setActiveTab('applications');
    fetchApplications();
  };

  const handleCancelApplication = () => {
    setSelectedProgram(null);
    setActiveTab('browse');
  };

  return (
    <div className="dashboard">
      <h1>Welcome, {user.fullName || user.username}!</h1>
      
      {message && (
        <div className="message success">
          {message}
          <button onClick={() => setMessage('')} className="close-btn">×</button>
        </div>
      )}
      
      <div className="tabs">
        <button 
          className={activeTab === 'browse' ? 'active' : ''}
          onClick={() => setActiveTab('browse')}
        >
          Browse Programs
        </button>
        <button 
          className={activeTab === 'applications' ? 'active' : ''}
          onClick={() => setActiveTab('applications')}
        >
          My Applications
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'browse' && (
          <div className="programs-list">
            <h2>Available Programs</h2>
            {isLoading ? (
              <p>Loading programs...</p>
            ) : programs.length > 0 ? (
              programs.map(program => (
                <ProgramCard 
                  key={program._id}
                  program={program}
                  onApply={handleApply}
                />
              ))
            ) : (
              <p>No programs available at this time.</p>
            )}
          </div>
        )}
        
        {activeTab === 'apply' && selectedProgram && (
          <ApplicationForm 
            program={selectedProgram}
            onSubmit={handleApplicationSubmit}
            onCancel={handleCancelApplication}
          />
        )}
        
        {activeTab === 'applications' && (
          <div className="applications-list">
            <h2>My Applications</h2>
            {isLoading ? (
              <p>Loading applications...</p>
            ) : applications.length > 0 ? (
              applications.map(app => (
                <ApplicationCard key={app._id} application={app} />
              ))
            ) : (
              <p>You haven't submitted any applications yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStats();
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [activeTab, filterStatus, filterProgram]);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchPrograms = async () => {
    try {
      const { data } = await axios.get('/programs/all');
      setPrograms(data);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const url = '/applications' + 
        (filterStatus ? `?status=${filterStatus}` : '') +
        (filterStatus && filterProgram ? '&' : '') +
        (filterProgram ? `program=${filterProgram}` : '');
      
      const { data } = await axios.get(url);
      setApplications(data);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProgram = () => {
    setSelectedProgram({
      name: '',
      description: '',
      duration: '',
      availableSeats: 0,
      requirements: '',
      deadline: new Date().toISOString().split('T')[0],
      active: true
    });
    setActiveTab('editProgram');
  };

  const handleEditProgram = (program) => {
    setSelectedProgram({
      ...program,
      deadline: new Date(program.deadline).toISOString().split('T')[0]
    });
    setActiveTab('editProgram');
  };

  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedProgram._id) {
        await axios.put(`/programs/${selectedProgram._id}`, selectedProgram);
        setMessage('Program updated successfully!');
      } else {
        await axios.post('/programs', selectedProgram);
        setMessage('Program added successfully!');
      }
      fetchPrograms();
      setActiveTab('programs');
      setSelectedProgram(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save program');
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      try {
        await axios.delete(`/programs/${programId}`);
        fetchPrograms();
        setMessage('Program deleted successfully!');
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete program');
      }
    }
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setActiveTab('viewApplication');
  };

  const handleUpdateStatus = async (applicationId, status, notes) => {
    try {
      await axios.put(`/applications/${applicationId}/status`, {
        status,
        adminNotes: notes
      });
      fetchApplications();
      setMessage('Application status updated!');
      setActiveTab('applications');
      setSelectedApplication(null);
    } catch (err) {
      alert('Failed to update application status');
    }
  };
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      {message && (
        <div className="message success">
          {message}
          <button onClick={() => setMessage('')} className="close-btn">×</button>
        </div>
      )}
      
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'programs' ? 'active' : ''}
          onClick={() => setActiveTab('programs')}
        >
          Programs
        </button>
        <button 
          className={activeTab === 'applications' ? 'active' : ''}
          onClick={() => setActiveTab('applications')}
        >
          Applications
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'overview' && stats && (
          <div className="overview">
            <div className="stats-cards">
              <div className="stat-card">
                <h3>Total Students</h3>
                <div className="stat-value">{stats.totalStudents}</div>
              </div>
              <div className="stat-card">
                <h3>Total Applications</h3>
                <div className="stat-value">{stats.totalApplications}</div>
              </div>
              <div className="stat-card">
                <h3>Applications by Status</h3>
                <ul>
                  {stats.statusCounts.map(item => (
                    <li key={item._id}>
                      {item._id}: {item.count}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="recent-applications">
              <h3>Recent Applications</h3>
              {stats.recentApplications.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Program</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentApplications.map(app => (
                      <tr key={app._id}>
                        <td>{app.userId?.fullName || app.fullName}</td>
                        <td>{app.program}</td>
                        <td>{app.status}</td>
                        <td>{new Date(app.submittedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No applications yet.</p>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'programs' && (
          <div className="programs-manager">
            <div className="action-bar">
              <h2>Programs Management</h2>
              <button onClick={handleAddProgram} className="btn-primary">
                Add New Program
              </button>
            </div>
            
            {isLoading ? (
              <p>Loading programs...</p>
            ) : programs.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Duration</th>
                    <th>Seats</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(program => (
                    <tr key={program._id}>
                      <td>{program.name}</td>
                      <td>{program.duration}</td>
                      <td>{program.availableSeats}</td>
                      <td>{new Date(program.deadline).toLocaleDateString()}</td>
                      <td>{program.active ? 'Active' : 'Inactive'}</td>
                      <td>
                        <button 
                          onClick={() => handleEditProgram(program)}
                          className="btn-small"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteProgram(program._id)}
                          className="btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No programs available.</p>
            )}
          </div>
        )}
        
        {activeTab === 'editProgram' && selectedProgram && (
          <div className="program-form">
            <h2>{selectedProgram._id ? 'Edit Program' : 'Add New Program'}</h2>
            <form onSubmit={handleProgramSubmit}>
              <div className="form-group">
                <label htmlFor="name">Program Name</label>
                <input
                  id="name"
                  type="text"
                  value={selectedProgram.name}
                  onChange={(e) => setSelectedProgram({...selectedProgram, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={selectedProgram.description}
                  onChange={(e) => setSelectedProgram({...selectedProgram, description: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="duration">Duration</label>
                <input
                  id="duration"
                  type="text"
                  value={selectedProgram.duration}
                  onChange={(e) => setSelectedProgram({...selectedProgram, duration: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="availableSeats">Available Seats</label>
                <input
                  id="availableSeats"
                  type="number"
                  min="1"
                  value={selectedProgram.availableSeats}
                  onChange={(e) => setSelectedProgram({...selectedProgram, availableSeats: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="requirements">Requirements</label>
                <textarea
                  id="requirements"
                  value={selectedProgram.requirements}
                  onChange={(e) => setSelectedProgram({...selectedProgram, requirements: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deadline">Application Deadline</label>
                <input
                  id="deadline"
                  type="date"
                  value={selectedProgram.deadline}
                  onChange={(e) => setSelectedProgram({...selectedProgram, deadline: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="active">Status</label>
                <select
                  id="active"
                  value={selectedProgram.active}
                  onChange={(e) => setSelectedProgram({...selectedProgram, active: e.target.value === 'true'})}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn-primary">Save</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedProgram(null);
                    setActiveTab('programs');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {activeTab === 'applications' && (
          <div className="applications-manager">
            <h2>Application Management</h2>
            
            <div className="filters">
              <div className="filter-group">
                <label htmlFor="statusFilter">Status:</label>
                <select
                  id="statusFilter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under-review">Under Review</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="programFilter">Program:</label>
                <select
                  id="programFilter"
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                >
                  <option value="">All Programs</option>
                  {programs.map(prog => (
                    <option key={prog._id} value={prog._id}>
                      {prog.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {isLoading ? (
              <p>Loading applications...</p>
            ) : applications.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Program</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app._id}>
                      <td>{app.userId?.fullName || app.fullName}</td>
                      <td>{app.program}</td>
                      <td>{new Date(app.submittedAt).toLocaleDateString()}</td>
                      <td>{app.status}</td>
                      <td>
                        <button 
                          onClick={() => handleViewApplication(app)}
                          className="btn-small"
                        >
                          View/Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No applications found matching your criteria.</p>
            )}
          </div>
        )}
        
        {activeTab === 'viewApplication' && selectedApplication && (
          <div className="application-detail">
            <h2>Application Details</h2>
            
            <div className="application-sections">
              <div className="section">
                <h3>Personal Information</h3>
                <p><strong>Name:</strong> {selectedApplication.fullName}</p>
                <p><strong>Email:</strong> {selectedApplication.email}</p>
                <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                <p><strong>Date of Birth:</strong> {new Date(selectedApplication.dateOfBirth).toLocaleDateString()}</p>
                <p><strong>Gender:</strong> {selectedApplication.gender}</p>
                <p><strong>Address:</strong> {selectedApplication.address}</p>
              </div>
              
              <div className="section">
                <h3>Program & Education</h3>
                <p><strong>Program:</strong> {selectedApplication.program}</p>
                <p><strong>Previous Institution:</strong> {selectedApplication.previousEducation.institution}</p>
                <p><strong>Degree:</strong> {selectedApplication.previousEducation.degree}</p>
                <p><strong>Graduation Year:</strong> {selectedApplication.previousEducation.graduationYear}</p>
                <p><strong>GPA:</strong> {selectedApplication.previousEducation.gpa}</p>
              </div>
            </div>
            
            <div className="status-update">
              <h3>Update Status</h3>
              <div className="status-form">
                <div className="form-group">
                  <label htmlFor="status">Status:</label>
                  <select 
                    id="status"
                    value={selectedApplication.status}
                    onChange={(e) => setSelectedApplication({
                      ...selectedApplication,
                      status: e.target.value
                    })}
                  >
                    <option value="pending">Pending</option>
                    <option value="under-review">Under Review</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="adminNotes">Admin Notes:</label>
                  <textarea
                    id="adminNotes"
                    value={selectedApplication.adminNotes || ''}
                    onChange={(e) => setSelectedApplication({
                      ...selectedApplication,
                      adminNotes: e.target.value
                    })}
                  />
                </div>
                
                <div className="form-buttons">
                  <button 
                    className="btn-primary"
                    onClick={() => handleUpdateStatus(
                      selectedApplication._id,
                      selectedApplication.status,
                      selectedApplication.adminNotes
                    )}
                  >
                    Update Status
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedApplication(null);
                      setActiveTab('applications');
                    }}
                  >
                    Back to List
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axios.get('/auth/me');
        if (data.ok) {
          setUser(data.user);
          if (data.user.role === 'admin') {
            setActiveTab('overview');
          }
        }
      } catch (err) {
        console.log('Not authenticated');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      {user ? (
        <>
          <header className="app-header">
            <h1>College Admission System</h1>
            <div className="user-actions">
              <span>Logged in as {user.username} ({user.role})</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </header>
          
          <main>
            {user.role === 'admin' ? (
              <AdminDashboard user={user} />
            ) : (
              <StudentDashboard user={user} activeTab={activeTab} setActiveTab={setActiveTab} />
            )}
          </main>
          
          <footer className="app-footer">
            <p>&copy; {new Date().getFullYear()} College Admission Management System</p>
          </footer>
        </>
      ) : (
        <AuthForm onSuccess={setUser} />
      )}
    </div>
  );
}

export default App;