const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ROLES = require('../utils/userRoles');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, facilityId } = req.body;

    const userCount = await User.countDocuments();

    // 1. Bootstrap Phase: If no users exist, allow creating the first account (usually admin)
    if (userCount === 0) {
      const user = await User.create({ name, email, password, role, facilityId });
      return sendTokenResponse(user, 201, res);
    }

    // 2. Administrative Phase: Require authorization for further registrations
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized - No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Not authorized - Current user not found' });
    }

    // Role-based validation
    if (currentUser.role === ROLES.ADMIN) {
      // Admin can create any user
    } else if (currentUser.role === ROLES.MANAGER) {
      // Manager can only create Pharmacist/Doctor for their facility
      if (![ROLES.PHARMACIST, ROLES.DOCTOR].includes(role)) {
        return res.status(403).json({ success: false, message: 'Managers can only register Pharmacists or Doctors' });
      }
      if (facilityId !== currentUser.facilityId.toString()) {
        return res.status(403).json({ success: false, message: 'Managers can only register users for their own facility' });
      }
    } else {
      return res.status(403).json({ success: false, message: `Role ${currentUser.role} is not authorized to register users` });
    }

    // Create user
    const user = await User.create({ name, email, password, role, facilityId });
    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        facilityId: user.facilityId
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    // Validate email, password & role
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password and select a role'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Role Verification
    if (user.role !== role) {
      return res.status(401).json({
        success: false,
        message: `This account is not registered as a ${role.replace('_', ' ')}`
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// const getMe = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.user.id);

//     res.status(200).json({
//       success: true,
//       data: user
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  const options = {
    expires: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        facilityId: user.facilityId
      }
    });
};

const logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(0), // Immediate expiration
    httpOnly: true
  });

  res.status(200).json({
    message: 'User logged out successfully'
  });
};

module.exports = {
  register,
  login,
  logout
};
