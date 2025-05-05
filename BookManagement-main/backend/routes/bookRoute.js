// backend/routes/bookRoutes.js
import express from 'express';
import Book from '../models/Book.js';

const router = express.Router();

// GET all books
router.get('/', async (req, res) => {
  const books = await Book.find();
  res.json(books);
});

// POST create new book
router.post('/', async (req, res) => {
  const { title, author,image } = req.body;
  const newBook = new Book({ title, author,image });
  await newBook.save();
  res.json(newBook);
});

// PUT book (reserve) a book
router.put('/book/:id', async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (book) {
    book.booked = true;
    await book.save();
    res.json({ message: 'Book reserved' });
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
});

// DELETE a book
router.delete('/:id', async (req, res) => {
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: 'Book deleted' });
});

export default router;
