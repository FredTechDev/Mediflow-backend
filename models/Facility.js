const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    }
  },
  address: {
    region: String,
    district: String,
    ward: String,
    village: String
  },
  facilityType: {
    type: String,
    enum: ['hospital', 'health_center', 'dispensary', 'clinic'],
    required: true
  },
  level: {
    type: Number,
    min: 1,
    max: 6,
    default: 3
  },
  capacity: {
    beds: { type: Number, default: 0 },
    catchment_population: { type: Number, default: 0 }
  },
  contactInfo: {
    phone: String,
    email: String,
    manager: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance
facilitySchema.index({ code: 1 });
facilitySchema.index({ 'address.district': 1 });
facilitySchema.index({ facilityType: 1 });
facilitySchema.index({ status: 1 });

// Virtual for nearby facilities
facilitySchema.virtual('nearbyFacilities', {
  ref: 'Facility',
  localField: 'location.coordinates',
  foreignField: 'location.coordinates',
  justOne: false,
  options: { maxDistance: 50000 } // 50km
});

module.exports = mongoose.model('Facility', facilitySchema);
