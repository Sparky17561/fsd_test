// models/Book.js
import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  booked: { type: Boolean, default: false },
  image: String,  // <-- Added this
});

const Book = mongoose.model('Book', bookSchema);
export default Book;
