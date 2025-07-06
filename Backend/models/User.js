const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    unique: [true, 'This username is already taken.'],
    required: [true, 'Username is required.'],
    minlength: [3, 'The username must consist of at least 3 characters.'],
    maxlength: [10, 'The username must consist of at most 10 characters.'],
    match: [/^[A-Za-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  password: {
    type: String,
    required: [true, 'Password is required.'],
    minlength: 8,
    maxlength: 20,
    match: [
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,20}$/,
      'Password must include lowercase, uppercase, number, and special character'
    ]
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.ComparePasswords = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
