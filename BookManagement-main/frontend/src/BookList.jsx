import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BookList = () => {
  const [books, setBooks] = useState([]);

  const fetchBooks = async () => {
    const res = await axios.get('http://localhost:5000/api/books');
    setBooks(res.data);
  };

  const reserveBook = async (id) => {
    await axios.put(`http://localhost:5000/api/books/book/${id}`);
    fetchBooks();
  };

  const deleteBook = async (id) => {
    await axios.delete(`http://localhost:5000/api/books/${id}`);
    fetchBooks();
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return (
    <div className="bg-white shadow rounded p-4 border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">📖 Book List</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border divide-y divide-gray-200">
          <thead className="bg-gray-100 text-gray-600 text-sm">
            <tr>
              <th className="px-3 py-2 text-left">Image</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Author</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-200">
            {books.map(book => (
              <tr key={book._id}>
                <td className="px-3 py-2">
                  {book.image ? (
                    <img src={book.image} alt="Book" className="h-16 w-12 object-cover rounded shadow" />
                  ) : (
                    <div className="h-16 w-12 bg-gray-200 flex items-center justify-center text-xs text-gray-500 rounded">No Image</div>
                  )}
                </td>
                <td className="px-3 py-2 font-medium">{book.title}</td>
                <td className="px-3 py-2">{book.author}</td>
                <td className="px-3 py-2 text-center">
                  {book.booked ? (
                    <span className="bg-red-200 text-red-700 px-2 py-1 rounded text-xs">Booked</span>
                  ) : (
                    <span className="bg-green-200 text-green-700 px-2 py-1 rounded text-xs">Available</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center space-x-2">
                  {!book.booked && (
                    <button
                      className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                      onClick={() => reserveBook(book._id)}
                    >
                      Reserve
                    </button>
                  )}
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                    onClick={() => deleteBook(book._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-400">No books found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookList;
