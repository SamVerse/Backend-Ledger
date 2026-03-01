// We are using app.js to mainly create and configure the Express application

const express = require('express');
const cookieParser = require('cookie-parser');

// Importing route handlers
const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');
const transactionRouter = require('./routes/transaction.routes');

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is running successfully!' });
});

// User Routes
app.use('/api/auth', authRouter);

// Account Routes
app.use('/api/accounts', accountRouter);

// Transaction Routes
app.use('/api/transactions', transactionRouter);

module.exports = app;