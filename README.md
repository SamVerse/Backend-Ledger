# Banking Backend System

Backend implementation of a banking system using **Node.js**, **Express**, and **MongoDB**.

This project demonstrates how core banking operations are handled on the server side, including authentication, account management, transaction processing, ledger management, and idempotency validation.

---

## Tech Stack

- Node.js  
- Express.js  
- MongoDB (Atlas)  
- Mongoose  
- JWT (Authentication)  
- bcrypt (Password hashing)  
- Nodemailer (Email service)  
- Cookie Parser  
- dotenv  

---

## Features

### Authentication
- User registration with email validation (regex)
- Password hashing using bcrypt
- Login with JWT
- HTTP-only cookie authentication
- Logout using token blacklist

### Accounts
- Account creation per user
- Account status validation
- Balance retrieval API

### Transactions
- Credit and debit operations
- Transactions created in `pending` state
- Idempotency key validation
- Email notifications on transaction events

### Ledger System
- No direct balance storage
- Each transaction creates ledger entries
- Balance derived using MongoDB aggregation pipeline
- Ensures traceability and consistency

---

## System Design Overview

### 1. Authentication Flow
1. User registers → password hashed  
2. User logs in → JWT generated  
3. JWT stored in HTTP-only cookie  
4. Protected routes use authentication middleware  
5. Logout invalidates token using blacklist collection  

### 2. Transaction Flow

1. Validate user and account status  
2. Validate idempotency key  
3. Create transaction in `pending` state  
4. Create ledger entries  
5. Derive updated balance using aggregation  
6. Send email notification  

### 3. Ledger-Based Balance

Instead of storing balance directly:

- All credit/debit operations create ledger records  
- Balance is calculated dynamically: Total Credits - Total Debits


This approach avoids inconsistencies and allows complete transaction history tracking.

---

## Project Structure

```
src/
│
├── config/ # Database and environment configuration
├── controllers/ # Request handling logic
├── middleware/ # Authentication middleware
├── models/ # Mongoose schemas
├── routes/ # API routes
├── utils/ # Utility functions (email, helpers)
│
└── app.js # Application entry point

```
---

## Database Models

- User  
- Account  
- Transaction  
- Ledger  
- Blacklist (for JWT invalidation)  

---

## API Endpoints

```
 Auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

 Account
POST - /api/accounts/ 
GET - /api/accounts/
GET - /api/accounts/balance/:accountId


 Transactions
POST - /api/transactions 
POST - /api/transactions/systems/initial-funds

```
---

## Environment Variables


Create a `.env` file in the root directory:
```
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```
---

## Running Locally

### 1. Install dependencies
npm install


### 2. Start development server
npm run dev

Server runs at:
http://localhost:3000

---

## Testing

APIs can be tested using:

- Postman  
- Thunder Client  

---

## Deployment

The project can be deployed to:

- Render (I Deployed it here)
- Railway  
- VPS  
---

## Concepts Implemented

- JWT authentication  
- Password hashing  
- Cookie-based auth flow  
- Token blacklisting  
- Idempotent transaction design  
- MongoDB aggregation pipeline  
- Ledger-based accounting model  
- Transaction state handling  

---

# KEEP LEARNINGG.. (;


