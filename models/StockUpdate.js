const mongoose = require('mongoose');

const stockUpdateSchema = new mongoose.Schema({
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
    index: true
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true,
    index: true
  },
  source: {
    type: String,
    enum: ['sms', 'api', 'manual', 'excel'],
    required: true
  },
  rawMessage: String,
  parsedData: {
    type: mongoose.Schema.Types.Mixed
  },
  from: String, // Phone number or user ID
  previousStock: Number,
  newStock: Number,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StockUpdate', stockUpdateSchema);
