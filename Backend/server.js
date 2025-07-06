// backend/server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { setupWebSocket } = require('./websockets/socketServer');
const connectDB = require('./db'); 

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
