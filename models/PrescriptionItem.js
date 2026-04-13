const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true,
    index: true
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  drugName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'dispensed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PrescriptionItem', prescriptionItemSchema);
