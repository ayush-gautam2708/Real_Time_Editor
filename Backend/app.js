const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const docRoutes = require('./routes/doc');

const app = express();
app.use(cors());
app.use(express.json());

// Default route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount doc routes
app.use('/api/docs', docRoutes);

module.exports = app;
