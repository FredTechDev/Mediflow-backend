const Prescription = require('../models/Prescription');
const Inventory = require('../models/Inventory');
const Alert = require('../models/Alert');

// @desc    Create new prescription (record demand)
// @route   POST /api/prescriptions
// @access  Private (Doctor)
exports.createPrescription = async (req, res) => {
  try {
    const { inventoryId, patientId, quantity, priority, patientNotes } = req.body;

    if (!patientId) {
       return res.status(400).json({ success: false, message: 'Please provide a patientId' });
    }

    const inventory = await Inventory.findById(inventoryId).populate('facilityId');
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Drug not found in inventory' });
    }

    const prescription = await Prescription.create({
      doctorId: req.user.id,
      facilityId: inventory.facilityId._id,
      patientId,
      inventoryId,
      drugName: inventory.drugName,
      quantity,
      priority,
      patientNotes
    });

    // Smart Insight: If priority is urgent OR stock is critically low, trigger a notification/alert
    if (priority === 'urgent' || inventory.stockoutRisk === 'critical') {
      await Alert.create({
        facilityId: inventory.facilityId._id,
        inventoryId: inventory._id,
        type: 'low_stock',
        severity: 'critical',
        title: `URGENT PRESCRIPTION: ${inventory.drugName}`,
        description: `Doctor ${req.user.name} issued an urgent prescription for ${inventory.drugName}. Current stock is ${inventory.currentStock} units.`,
        metadata: {
          prescriptionId: prescription._id,
          doctorId: req.user.id,
          priority: priority
        }
      });
    }

    res.status(201).json({
      success: true,
      data: prescription,
      insights: {
        stockLevel: inventory.currentStock,
        daysOfStockLeft: inventory.daysOfStockLeft,
        risk: inventory.stockoutRisk
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ doctorId: req.user.id })
      .populate('inventoryId', 'drugName currentStock')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
