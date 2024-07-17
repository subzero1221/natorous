const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  passwordConfirmation: {
    type: String,
    required: [true, 'Password confirmation is required'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords do not match',
    },
    select: false,
  },
  passwordChangedAt: Date,
  roles: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// middleware

// userSchema.pre('save', async function (next) { if (!this.isModified('password')) next() });

userSchema.pre('save', async function (next) {
  // only run this function if the password was modified
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  // hash returns a promise, so we await it
  this.password = await bcrypt.hash(this.password, salt);
  // clear the passwordConfirmation field
  this.passwordConfirmation = undefined;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  // sometimes saving to the database takes longer than issuing the token.
  // this can mean the time shows as a change after the token was issued.
  // that will mean that the token will be invalidated.
  // so we take 1 second off the current time.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// query middleware

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// instance method

userSchema.methods.matchPassword = async function (
  enteredPassword,
  userPassword
) {
  return await bcrypt.compare(enteredPassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // convert timestamp to milliseconds
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // if the timestamp value in the token is less than the password changed timestamp, return true
    return JWTTimestamp < changedTimestamp;
  }
  // password not changed since token was issued.
  return false;
};

// create a password reset token.
// save an encrypted copy of the token in the database for comparison later.
// send the token to the user.
userSchema.methods.getPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
