const Facility = require('../models/Facility');

const createFacility = async (req, res) => {
  try {
    const { name, code, facilityType, location, address, level, contactInfo } = req.body;

    // Explicit validation for required fields
    if (!name || !code || !facilityType || !location || !location.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, code, facilityType, and location (with coordinates)'
      });
    }

    const facility = await Facility.create({
      name,
      code,
      facilityType,
      location,
      address,
      level,
      contactInfo
    });

    res.status(201).json({
      success: true,
      data: facility
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getAllFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find({ status: 'active' });
    res.json({ success: true, count: facilities.length, data: facilities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });
    res.json({ success: true, data: facility });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllFacilities, getFacilityById, createFacility }
