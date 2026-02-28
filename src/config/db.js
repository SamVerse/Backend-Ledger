const mongoose = require('mongoose');

function connectToDb() {
    const mongoDbUri = process.env.MONGO_DB_URI;
    mongoose.connect(mongoDbUri)
    .then(() => {
        console.log('Connected to MongoDB');
    }).catch((err) => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    });
}

module.exports = connectToDb;