const mongoose = require('mongoose');

const consumptionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
});

const inventorySchema = new mongoose.Schema({
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
    index: true
  },
  drugName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  drugCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['antibiotics', 'antimalarial', 'arv', 'vaccine', 'painkiller', 'other'],
    default: 'other'
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    enum: ['tablets', 'capsules', 'vials', 'bottles', 'doses', 'ml', 'mg'],
    default: 'tablets'
  },
  consumptionHistory: [consumptionSchema],
  lastOrderDate: Date,
  lastReceivedDate: Date,
  leadTimeDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 60
  },
  reorderPoint: {
    type: Number,
    default: 100
  },
  maxStock: {
    type: Number,
    default: 1000
  },
  safetyStock: {
    type: Number,
    default: 50
  },
  expiryDate: {
    type: Date,
    index: true
  },
  batchNumber: {
    type: String,
    trim: true
  },
  stockoutRisk: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'none'],
    default: 'none'
  },
  expiryStatus: {
    type: String,
    enum: ['safe', 'warning', 'expires_soon'],
    default: 'safe'
  },
  predictedStockoutDate: Date,
  daysOfStockLeft: Number,
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  alerts: [{
    type: {
      type: String,
      enum: ['low_stock', 'stockout', 'expiry', 'overstock']
    },
    message: String,
    createdAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

// Compound indexes for fast queries
inventorySchema.index({ facilityId: 1, drugName: 1 }, { unique: true });
inventorySchema.index({ stockoutRisk: 1, daysOfStockLeft: 1 });
inventorySchema.index({ 'consumptionHistory.date': -1 });

// Pre-save middleware to update daysOfStockLeft
inventorySchema.pre('save', function(next) {
  if (this.consumptionHistory && this.consumptionHistory.length > 0) {
    const last7Days = this.consumptionHistory
      .filter(c => c.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .map(c => c.quantity);
    
    const avgDailyUse = last7Days.length > 0 
      ? last7Days.reduce((a, b) => a + b, 0) / last7Days.length
      : 0;
    
    this.daysOfStockLeft = avgDailyUse > 0 
      ? Math.floor(this.currentStock / avgDailyUse)
      : 999;
    
    // Update risk level
    if (this.daysOfStockLeft <= 3) this.stockoutRisk = 'critical';
    else if (this.daysOfStockLeft <= 7) this.stockoutRisk = 'high';
    else if (this.daysOfStockLeft <= 14) this.stockoutRisk = 'medium';
    else if (this.daysOfStockLeft <= 30) this.stockoutRisk = 'low';
    else this.stockoutRisk = 'none';
    
    // Set predicted stockout date
    if (avgDailyUse > 0 && this.currentStock > 0) {
      this.predictedStockoutDate = new Date(Date.now() + (this.daysOfStockLeft * 24 * 60 * 60 * 1000));
    }
  }
  
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
