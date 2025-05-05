import React, { useState } from 'react';
import axios from 'axios';

const AddBook = () => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [image, setImage] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const addBook = async (e) => {
    e.preventDefault();
    if (title && author) {
      await axios.post('http://localhost:5000/api/books', { title, author, image });
      setTitle('');
      setAuthor('');
      setImage('');
      window.location.reload();
    }
  };

  return (
    <div className="bg-white shadow rounded p-4 border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">➕ Add New Book</h2>
      <form onSubmit={addBook} className="space-y-3">
        <input
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {image && (
          <img src={image} alt="Preview" className="h-32 object-cover rounded mt-2" />
        )}
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
        >
          Add Book
        </button>
      </form>
    </div>
  );
};

export default AddBook;
