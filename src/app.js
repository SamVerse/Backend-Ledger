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

// User Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/transactions', transactionRouter);

module.exports = app;