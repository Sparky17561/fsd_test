import React from 'react';
import BookList from './BookList';
import AddBook from './AddBook';

const App = () => (
  <div className="max-w-5xl mx-auto p-6">
    <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">📚 Book Management & Booking System</h1>
    <div className="grid md:grid-cols-3 gap-6">
      <AddBook />
      <div className="md:col-span-2">
        <BookList />
      </div>
    </div>
  </div>
);

export default App;
