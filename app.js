const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const facilityRoutes = require('./routes/facilities');
const inventoryRoutes = require('./routes/inventory');
const predictionRoutes = require('./routes/predictions');
const smsRoutes = require('./routes/sms');
const redistributionRoutes = require('./routes/redistribution');
const authRoutes = require('./routes/auth');
const prescriptionRoutes = require('./routes/prescription');
const patientRoutes = require('./routes/patient');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourfrontend.com'] 
    : '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/facilities', facilityRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/redistribution', redistributionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/patients', patientRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
