const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a patient name'],
    trim: true
  },
  patientIdentifier: {
    type: String,
    required: [true, 'Please add a unique patient identifier'],
    unique: true,
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Please add patient age']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Please add patient gender']
  },
  contactInfo: {
    phone: String,
    email: String
  },
  address: {
    region: String,
    district: String,
    ward: String
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Virtual for medical history (prescriptions)
patientSchema.virtual('prescriptions', {
  ref: 'Prescription',
  localField: '_id',
  foreignField: 'patientId',
  justOne: false
});

module.exports = mongoose.model('Patient', patientSchema);
