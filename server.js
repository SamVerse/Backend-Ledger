// We are using server.js to start the server and connect to the database
require('dotenv').config();

const app = require('./src/app');
const connectToDb = require('./src/config/db');

const PORT = process.env.PORT || 3000;

connectToDb();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

