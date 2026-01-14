const User = require('../models/User.model');
const ApiError = require('../core/ApiError');
const ApiResponse = require('../core/ApiResponse');
const { generateToken } = require('../utils/token');

/**
 * Login Controller
 * POST /auth/login
 * 
 * Flow:
 * 1. Find user by email
 * 2. If not found → unauthorized
 * 3. If status != ACTIVE → forbidden
 * 4. Compare password
 * 5. Generate JWT
 * 6. Send response
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    const errors = {};
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    throw ApiError.validationError('Validation failed', errors);
  }

  // Find user by email (include passwordHash for comparison)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  // User not found
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden('Account is not active. Please contact administrator.');
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user);

  // Prepare user data (exclude passwordHash)
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  // Send response
  return ApiResponse.success(res, 200, 'Login successful', {
    user: userData,
    token,
  });
};

/**
 * Register Controller
 * POST /auth/register
 * 
 * Flow:
 * 1. Validate input (name, email, password)
 * 2. Check if email already exists
 * 3. Create new user with PENDING status
 * 4. Hash password (handled by User model pre-save hook)
 * 5. Save user
 * 6. Return success response (without token - user needs activation)
 */
const register = async (req, res) => {
  let { name, email, password } = req.body;

  // Trim name and email before validation
  if (name) name = name.trim();
  if (email) email = email.trim();

  // Validate input
  if (!name || !email || !password) {
    const errors = {};
    if (!name) errors.name = 'Name is required';
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    throw ApiError.validationError('Validation failed', errors);
  }

  // Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw ApiError.validationError('Validation failed', {
      email: 'Please provide a valid email address',
    });
  }

  // Validate password strength (minimum 6 characters)
  if (password.length < 6) {
    throw ApiError.validationError('Validation failed', {
      password: 'Password must be at least 6 characters long',
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw ApiError.conflict('User with this email already exists');
  }

  // Create new user
  // Password will be hashed by User model pre-save hook
  const user = new User({
    name: name, // Already trimmed
    email: email.toLowerCase(), // Already trimmed
    passwordHash: password, // Will be hashed by pre-save hook
    role: 'USER', // Default role
    status: 'PENDING', // Requires admin activation
  });

  await user.save();

  // Prepare user data (exclude passwordHash)
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  // Send response (no token - user needs activation)
  return ApiResponse.success(res, 201, 'Registration successful. Your account is pending activation by an administrator.', {
    user: userData,
  });
};

/**
 * Get All Users
 * GET /auth/users
 * 
 * Access: Authenticated users (all active users)
 * Returns list of all active users for dropdowns, etc.
 */
const getUsers = async (req, res) => {
  // Fetch all active users
  const users = await User.find({ status: 'ACTIVE' })
    .select('name email role status')
    .sort({ name: 1 }); // Sort by name alphabetically

  // Prepare response
  const usersData = users.map(user => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  }));

  return ApiResponse.success(res, 200, 'Users fetched successfully', usersData);
};

module.exports = {
  login,
  register,
  getUsers,
};

