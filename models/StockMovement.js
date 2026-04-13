const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true,
    index: true
  },
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['IN', 'OUT'],
    required: true
  },
  reason: {
    type: String,
    enum: ['dispensing', 'restock', 'expiry', 'adjustment', 'transfer'],
    default: 'dispensing'
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId, // Could be PrescriptionId or StockUpdateId
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);
