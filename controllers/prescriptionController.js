const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const PrescriptionItem = require('../models/PrescriptionItem');
const Inventory = require('../models/Inventory');
const Alert = require('../models/Alert');
const StockMovement = require('../models/StockMovement');
const DispensingLog = require('../models/DispensingLog');

// @desc    Create new prescription (Multi-item support)
// @route   POST /api/prescriptions
// @access  Private (Doctor)
exports.createPrescription = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { patientId, drugs, priority, patientNotes } = req.body;

    if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one drug' });
    }

    // 1. Create the main prescription record
    const prescription = await Prescription.create([{
      doctorId: req.user.id,
      facilityId: req.user.facilityId,
      patientId,
      priority,
      patientNotes
    }], { session });

    // 2. Map and create prescription items
    const prescriptionItems = [];
    for (const drug of drugs) {
      const inventory = await Inventory.findById(drug.inventoryId);
      if (!inventory) {
        throw new Error(`Drug with ID ${drug.inventoryId} not found in inventory`);
      }

      prescriptionItems.push({
        prescriptionId: prescription[0]._id,
        inventoryId: inventory._id,
        drugName: inventory.drugName,
        quantity: drug.quantity
      });

      // Simple real-time alert check during prescription
      if (drug.priority === 'urgent' || inventory.stockoutRisk === 'critical') {
        await Alert.create([{
          facilityId: req.user.facilityId,
          inventoryId: inventory._id,
          type: 'low_stock',
          severity: 'critical',
          title: `URGENT PRESCRIPTION: ${inventory.drugName}`,
          description: `Doctor ${req.user.name} issued an urgent prescription for ${inventory.drugName}.`,
          metadata: { prescriptionId: prescription[0]._id }
        }], { session });
      }
    }

    await PrescriptionItem.insertMany(prescriptionItems, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: prescription[0]
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get prescriptions for current pharmacist's facility
// @route   GET /api/prescriptions
// @access  Private (Pharmacist, Doctor)
exports.getPrescriptions = async (req, res) => {
  try {
    const query = { facilityId: req.user.facilityId };
    if (req.user.role === 'pharmacist') query.status = 'pending';

    const prescriptions = await Prescription.find(query)
      .populate('patientId', 'name patientIdentifier')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single prescription with items
// @route   GET /api/prescriptions/:id
// @access  Private
exports.getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name patientIdentifier age gender')
      .populate('doctorId', 'name');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const items = await PrescriptionItem.find({ prescriptionId: prescription._id });

    res.json({ success: true, data: { ...prescription.toObject(), items } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Dispense prescription logic (Transactional)
// @route   POST /api/prescriptions/dispense
// @access  Private (Pharmacist)
exports.dispensePrescription = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { prescriptionId } = req.body;

    const prescription = await Prescription.findById(prescriptionId).session(session);
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (prescription.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Prescription status is already ${prescription.status}` });
    }

    const items = await PrescriptionItem.find({ prescriptionId: prescription._id }).session(session);
    const logItems = [];

    // 🔥 Loop through drugs and update inventory
    for (const item of items) {
      const inventory = await Inventory.findById(item.inventoryId).session(session);

      if (!inventory) {
        throw new Error(`Inventory item for ${item.drugName} not found`);
      }

      if (inventory.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.drugName}. Available: ${inventory.currentStock}, Requested: ${item.quantity}`);
      }

      // 1. Reduce Stock
      inventory.currentStock -= item.quantity;
      await inventory.save({ session });

      // 2. Log Movement
      await StockMovement.create([{
        inventoryId: inventory._id,
        facilityId: req.user.facilityId,
        userId: req.user.id,
        quantity: item.quantity,
        type: 'OUT',
        reason: 'dispensing',
        referenceId: prescription._id
      }], { session });

      logItems.push({
        drugName: item.drugName,
        quantity: item.quantity,
        inventoryId: inventory._id
      });

      // 3. Update Item Status
      item.status = 'dispensed';
      await item.save({ session });
    }

    // 4. Create Dispensing Log
    await DispensingLog.create([{
      prescriptionId: prescription._id,
      pharmacistId: req.user.id,
      facilityId: req.user.facilityId,
      items: logItems,
      totalItems: logItems.length
    }], { session });

    // 5. Update Prescription Status
    prescription.status = 'dispensed';
    await prescription.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Prescription dispensed successfully and stock adjusted'
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getMyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ doctorId: req.user.id })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
