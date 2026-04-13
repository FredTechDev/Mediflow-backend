const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  doctorId: {
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
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'dispensed', 'cancelled'],
    default: 'pending'
  },
  patientNotes: String
}, {
  timestamps: true
});

// Middleware to update demand signal could be added here
prescriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
