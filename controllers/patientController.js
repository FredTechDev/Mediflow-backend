const Patient = require('../models/Patient');

// @desc    Register a new patient
// @route   POST /api/patients
// @access  Private (Doctor, Admin)
const registerPatient = async (req, res) => {
  try {
    const { name, patientIdentifier, age, gender, contactInfo, address } = req.body;

    // Ensure the patient doesn't already exist
    const existingPatient = await Patient.findOne({ patientIdentifier });
    if (existingPatient) {
      return res.status(400).json({ success: false, message: 'Patient with this identifier already exists' });
    }

    const patient = await Patient.create({
      name,
      patientIdentifier,
      age,
      gender,
      contactInfo,
      address,
      registeredBy: req.user.id,
      facilityId: req.user.facilityId
    });

    res.status(201).json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all patients at the current facility
// @route   GET /api/patients
// @access  Private (Doctor, Admin, Pharmacist)
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find({ facilityId: req.user.facilityId })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: patients.length, data: patients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single patient by ID with prescription history
// @route   GET /api/patients/:id
// @access  Private (Doctor, Admin, Pharmacist)
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('prescriptions');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports =  {
  registerPatient, 
  getPatients, 
  getPatientById
}