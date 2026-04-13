const mongoose = require('mongoose');

const dispensingLogSchema = new mongoose.Schema({
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true,
    index: true
  },
  pharmacistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
    index: true
  },
  items: [
    {
      drugName: String,
      quantity: Number,
      inventoryId: mongoose.Schema.Types.ObjectId
    }
  ],
  totalItems: Number
}, {
  timestamps: true
});

module.exports = mongoose.model('DispensingLog', dispensingLogSchema);
