const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');

const JWT_secret = process.env.JWT_SECRET;
if (!JWT_secret) throw new Error("JWT_SECRET is not defined");

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const newUser = new User({ username, password }); //
    await newUser.save();
    res.status(201).json({ message: "User signed up successfully." });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error("Signup Error", error);
    res.status(500).json({ error: "Server Error." });
  }
});

// Signin Route
router.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }); // 
    if (!user) return res.status(400).json({ error: 'Invalid username or password.' });

    const check = await user.ComparePasswords(password); // 
    if (!check) return res.status(401).json({ error: 'Invalid username or password.' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_secret, { expiresIn: '2h' });
    res.status(200).json({ message: "Signed in successfully.", token });
  } catch (error) {
    console.error("Signin Error", error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile', verifyToken, (req, res) => {
  res.json({
    message: `Welcome, ${req.user.username}!`,
    userId: req.user.id
  });
});

module.exports = router;
