// backend/app.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bookRoutes from './routes/bookRoute.js';

const app = express();
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173"]
}));
const MONGO_URI = 'mongodb://localhost:27017/bms';

mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected'));

app.use('/api/books', bookRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
