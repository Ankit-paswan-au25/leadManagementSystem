const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
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
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include passwordHash by default in queries
    },
    role: {
      type: String,
      enum: ['ADMIN', 'USER'],
      default: 'USER',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'DISABLED'],
      default: 'PENDING',
      required: true,
    },
    salesTarget: {
      type: Number,
      default: 0,
      min: 0,
    },
    zohoLoggedIn: {
      type: Boolean,
      default: false,
    },
    zohoPushedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) {
    return next();
  }

  // Check if passwordHash is already hashed (bcrypt hashes start with $2b$)
  if (this.passwordHash && this.passwordHash.startsWith('$2b$')) {
    return next();
  }

  try {
    // Hash password with cost of 10
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (plainPassword) {
  if (!plainPassword || !this.passwordHash) {
    return false;
  }
  try {
    return await bcrypt.compare(plainPassword, this.passwordHash);
  } catch (error) {
    return false;
  }
};

// Prevent deletion (soft delete will be implemented later)
userSchema.pre('remove', function (next) {
  next(new Error('User deletion is not allowed. Use status update instead.'));
});

// Note: email field already has unique: true which creates an index automatically

const User = mongoose.model('User', userSchema);

module.exports = User;

