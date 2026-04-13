const Facility = require('../models/Facility');

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

module.exports = {getAllFacilities, getFacilityById}
