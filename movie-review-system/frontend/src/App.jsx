// App.js
// ─────────────────────────────────────────────────────────────────────────────
// Main React component for Movie Review System

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// Set up axios defaults
axios.defaults.baseURL = 'http://localhost:5000/api'
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
        onSuccess(data.username, data.isAdmin)
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

// ==== MovieForm Component ====
// Form for creating/editing movies (admin only)
function MovieForm({ movie, onSubmit, onCancel }) {
  const [title, setTitle] = useState(movie?.title || '')
  const [genre, setGenre] = useState(movie?.genre || '')
  const [director, setDirector] = useState(movie?.director || '')
  const [releaseYear, setReleaseYear] = useState(movie?.releaseYear || '')
  const [description, setDescription] = useState(movie?.description || '')
  const [posterUrl, setPosterUrl] = useState(movie?.posterUrl || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !genre.trim()) {
      setError('Title and genre are required')
      return
    }
    
    setLoading(true)
    setError('')
    
    const movieData = {
      title,
      genre,
      director,
      releaseYear: releaseYear ? Number(releaseYear) : undefined,
      description,
      posterUrl
    }
    
    try {
      await onSubmit(movieData)
      
      // Reset form if it's for creating a new movie (not editing)
      if (!movie) {
        setTitle('')
        setGenre('')
        setDirector('')
        setReleaseYear('')
        setDescription('')
        setPosterUrl('')
      }
    } catch (err) {
      setError('Failed to save movie')
      console.error('Movie save error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="movie-form-container">
      <h2>{movie ? 'Edit Movie' : 'Add New Movie'}</h2>
      <form onSubmit={submit} className="movie-form">
        <div className="form-group">
          <label>Title*</label>
          <input
            placeholder="Movie title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Genre*</label>
          <input
            placeholder="Genre (e.g., Action, Comedy)"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Director</label>
          <input
            placeholder="Director name"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Release Year</label>
          <input
            type="number"
            placeholder="Year of release"
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Movie description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={4}
          />
        </div>
        
        <div className="form-group">
          <label>Poster URL</label>
          <input
            placeholder="URL to movie poster image"
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            disabled={loading}
          />
        </div>
        
        {error && <div className="error form-error">{error}</div>}
        
        <div className="button-group">
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Saving...' : movie ? 'Update Movie' : 'Add Movie'}
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
  )
}

// ==== ReviewForm Component ====
// Form for submitting movie reviews
function ReviewForm({ movieId, onReviewAdded }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const submitReview = async (e) => {
    e.preventDefault()
    if (!comment.trim()) {
      setError('Please write a comment')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess(false)
    
    try {
      const { data } = await axios.post(`/movies/${movieId}/reviews`, {
        rating,
        comment
      })
      
      setComment('')
      setRating(5)
      setSuccess(true)
      
      if (onReviewAdded) {
        onReviewAdded(data)
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.error || 'Failed to submit review')
      } else {
        setError('Failed to submit review')
      }
      console.error('Review submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="review-form">
      <h3>Write a Review</h3>
      <form onSubmit={submitReview}>
        <div className="form-group">
          <label>Rating</label>
          <div className="rating-input">
            {[1, 2, 3, 4, 5].map((value) => (
              <span 
                key={value}
                className={`star ${value <= rating ? 'selected' : ''}`}
                onClick={() => setRating(value)}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <label>Your Review</label>
          <textarea
            placeholder="Share your thoughts about this movie..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
            rows={4}
            required
          />
        </div>
        
        {error && <div className="error form-error">{error}</div>}
        {success && <div className="success-message">Review submitted successfully!</div>}
        
        <button className="primary" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}

// ==== MovieCard Component ====
// Displays a movie in the list
// ==== MovieCard Component ====
// Displays a movie in the list
function MovieCard({ movie, isAdmin, onEdit, onDelete, onSelectMovie }) {
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${movie.title}"?`)) {
      onDelete(movie._id)
    }
  }

  return (
    <div className="movie-card">
      <div className="movie-poster">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} />
        ) : (
          <div className="no-poster">No Image</div>
        )}
      </div>
      
      <div className="movie-info">
        <h3>{movie.title}</h3>
        <div className="movie-meta">
          <span className="movie-genre">{movie.genre}</span>
          {movie.releaseYear && <span className="movie-year">{movie.releaseYear}</span>}
        </div>
        {movie.director && <p className="movie-director">Director: {movie.director}</p>}
        
        <div className="movie-actions">
          <a href="#" onClick={(e) => {
            e.preventDefault();
            onSelectMovie(movie._id);  // This is the correct way to use the prop
          }} className="view-link">View Details</a>
          
          {isAdmin && (
            <>
              <button onClick={(e) => {
                e.stopPropagation();
                onEdit(movie);
              }} className="edit-btn">Edit</button>
              <button onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }} className="delete-btn">Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ==== MovieDetail Component ====
// Displays full movie details and reviews
function MovieDetail({ movieId, username, onBack }) {
  const [movie, setMovie] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch movie and its reviews
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')
      
      try {
        const [movieRes, reviewsRes] = await Promise.all([
          axios.get(`/movies/${movieId}`),
          axios.get(`/movies/${movieId}/reviews`)
        ])
        
        setMovie(movieRes.data)
        setReviews(reviewsRes.data)
      } catch (err) {
        setError('Failed to load movie details')
        console.error('Error loading movie details:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [movieId])

  // Handle adding a new review
  const handleReviewAdded = (newReview) => {
    setReviews([newReview, ...reviews])
  }

  if (loading) {
    return <div className="loading">Loading movie details...</div>
  }
  
  if (error || !movie) {
    return (
      <div className="error-container">
        <div className="error">{error || 'Movie not found'}</div>
        <button onClick={onBack} className="secondary">Back to Movies</button>
      </div>
    )
  }

  // Calculate average rating
  const avgRating = reviews.length 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 'No ratings yet'

  return (
    <div className="movie-detail">
      <button onClick={onBack} className="back-btn">← Back to Movies</button>
      
      <div className="movie-header">
        <div className="movie-poster-large">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} />
          ) : (
            <div className="no-poster-large">No Image</div>
          )}
        </div>
        
        <div className="movie-info-large">
          <h2>{movie.title}</h2>
          <div className="movie-meta-large">
            <span className="movie-genre-large">{movie.genre}</span>
            {movie.releaseYear && <span className="movie-year-large">{movie.releaseYear}</span>}
            <span className="movie-rating-large">
              Rating: {typeof avgRating === 'string' ? avgRating : `${avgRating}/5 (${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})`}
            </span>
          </div>
          
          {movie.director && <p className="movie-director-large">Director: {movie.director}</p>}
          
          {movie.description && (
            <div className="movie-description">
              <h3>Description</h3>
              <p>{movie.description}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="movie-reviews-section">
        {username ? (
          <ReviewForm movieId={movieId} onReviewAdded={handleReviewAdded} />
        ) : (
          <div className="login-prompt">Please log in to write a review</div>
        )}
        
        <h3 className="reviews-title">Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
        
        {reviews.length === 0 ? (
          <div className="no-reviews">No reviews yet. Be the first to review!</div>
        ) : (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review._id} className="review-item">
                <div className="review-header">
                  <span className="review-author">{review.username}</span>
                  <span className="review-rating">
                    {Array(review.rating).fill('★').join('')}
                    {Array(5 - review.rating).fill('☆').join('')}
                  </span>
                  <span className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="review-comment">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==== MoviesGrid Component ====
// Displays all movies in a grid
function MoviesGrid({ movies, isAdmin, onEdit, onDelete, onSelectMovie }) {
  if (movies.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎬</div>
        <h3>No movies found</h3>
        {isAdmin ? (
          <p>Add your first movie using the form above!</p>
        ) : (
          <p>Check back later for new movies.</p>
        )}
      </div>
    )
  }

  return (
    <div className="movies-grid">
      {movies.map((movie) => (
        <div key={movie._id} className="movie-card-container">
          <MovieCard
            movie={movie}
            isAdmin={isAdmin}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelectMovie={onSelectMovie}
          />
        </div>
      ))}
    </div>
  )
}

// ==== EmptyState Component ====
function EmptyState({ isAdmin }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🎬</div>
      <h3>Welcome to Movie Review System</h3>
      {isAdmin ? (
        <p>As an admin, you can add, edit, and delete movies. Get started by adding your first movie!</p>
      ) : (
        <p>Browse movies, read reviews, and share your own thoughts after logging in.</p>
      )}
    </div>
  )
}

// ==== App Component ====
// Main application component
function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMovie, setEditingMovie] = useState(null)
  const [selectedMovieId, setSelectedMovieId] = useState(null)

  // Check if user is authenticated on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axios.get('/auth/me')
        if (data.ok) {
          setAuthenticated(true)
          setUsername(data.username)
          setIsAdmin(data.isAdmin)
        }
      } catch (err) {
        console.error('Auth check error:', err)
      } finally {
        fetchMovies()
      }
    }
    
    checkAuth()
  }, [])
  
  // Fetch all movies
  const fetchMovies = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data } = await axios.get('/movies')
      setMovies(data)
    } catch (err) {
      setError('Failed to load movies')
      console.error('Movie fetch error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle successful login/registration
  const handleAuthSuccess = (username, isAdmin) => {
    setAuthenticated(true)
    setUsername(username)
    setIsAdmin(isAdmin)
  }
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')
      setAuthenticated(false)
      setUsername('')
      setIsAdmin(false)
      setSelectedMovieId(null)
      setEditingMovie(null)
      setShowAddForm(false)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }
  
  // Handle adding a movie
  const handleAddMovie = async (movieData) => {
    try {
      const { data } = await axios.post('/movies', movieData)
      setMovies([data, ...movies])
      setShowAddForm(false)
    } catch (err) {
      console.error('Add movie error:', err)
      throw err
    }
  }
  
  // Handle updating a movie
  const handleUpdateMovie = async (movieData) => {
    try {
      const { data } = await axios.put(`/movies/${editingMovie._id}`, movieData)
      setMovies(movies.map(m => m._id === data._id ? data : m))
      setEditingMovie(null)
    } catch (err) {
      console.error('Update movie error:', err)
      throw err
    }
  }
  
  // Handle deleting a movie
  const handleDeleteMovie = async (movieId) => {
    try {
      await axios.delete(`/movies/${movieId}`)
      setMovies(movies.filter(m => m._id !== movieId))
    } catch (err) {
      console.error('Delete movie error:', err)
      alert('Failed to delete movie')
    }
  }
  
  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => {
          setSelectedMovieId(null)
          setEditingMovie(null)
          setShowAddForm(false)
        }} className="app-title">Movie Review System</h1>
        
        <div className="header-right">
          {authenticated ? (
            <>
              <span className="user-greeting">
                Hello, {username} {isAdmin && <span className="admin-badge">Admin</span>}
              </span>
              <button onClick={handleLogout} className="logout-btn">Log Out</button>
            </>
          ) : (
            <span className="login-prompt-header">Log in to write reviews</span>
          )}
        </div>
      </header>
      
      <main className="app-main">
        {!authenticated && (
          <section className="auth-section">
            <AuthForm onSuccess={handleAuthSuccess} />
          </section>
        )}
        
        {selectedMovieId ? (
          <MovieDetail 
            movieId={selectedMovieId} 
            username={username}
            onBack={() => setSelectedMovieId(null)}
          />
        ) : (
          <>
            {isAdmin && (
              <section className="admin-section">
                {editingMovie ? (
                  <MovieForm 
                    movie={editingMovie} 
                    onSubmit={handleUpdateMovie}
                    onCancel={() => setEditingMovie(null)}
                  />
                ) : showAddForm ? (
                  <MovieForm 
                    onSubmit={handleAddMovie}
                    onCancel={() => setShowAddForm(false)}
                  />
                ) : (
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="add-movie-btn primary"
                  >
                    Add New Movie
                  </button>
                )}
              </section>
            )}
            
            <section className="movies-section">
              {loading ? (
                <div className="loading">Loading movies...</div>
              ) : error ? (
                <div className="error">{error}</div>
              ) : movies.length === 0 ? (
                <EmptyState isAdmin={isAdmin} />
              ) : (
                <MoviesGrid 
                  movies={movies} 
                  isAdmin={isAdmin}
                  onEdit={setEditingMovie}
                  onDelete={handleDeleteMovie}
                  onSelectMovie={setSelectedMovieId}
                />
              )}
            </section>
          </>
        )}
      </main>
      
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Movie Review System</p>
      </footer>
    </div>
  )
}

export default App