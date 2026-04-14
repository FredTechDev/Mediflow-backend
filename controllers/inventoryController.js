const Inventory = require('../models/Inventory');
const Facility = require('../models/Facility');

const getFacilityInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find({ facilityId: req.params.facilityId });
    res.json({ success: true, count: inventory.length, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateStock = async (req, res) => {
  try {
    const { drugName, currentStock, quantityConsumed } = req.body;
    const { facilityId } = req.params;
    
    let inventory = await Inventory.findOne({ facilityId, drugName });
    
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Drug not found for this facility' });
    }
    
    if (quantityConsumed !== undefined) {
      inventory.consumptionHistory.push({
        date: new Date(),
        quantity: quantityConsumed,
        recordedBy: req.user ? req.user.id : undefined
      });
      // Clamp stock to prevent negative values
      inventory.currentStock = Math.max(0, inventory.currentStock - quantityConsumed);
    } else if (currentStock !== undefined) {
      inventory.currentStock = currentStock;
    }
    
    await inventory.save();
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const searchDrugAvailability = async (req, res) => {
  try {
    const { drugName, facilityId } = req.query;

    if (!drugName) {
      return res.status(400).json({ success: false, message: 'Please provide a drug name' });
    }

    // 1. Check current facility
    const currentInventory = await Inventory.findOne({ facilityId, drugName })
      .populate('facilityId', 'name location');

    // 2. Find nearby facilities with the same drug
    let nearbyStock = [];
    if (facilityId) {
      const facility = await Facility.findById(facilityId);
      if (facility) {
        // Simple geospatial search for nearby facilities with available stock
        const nearbyFacilities = await Facility.find({
          _id: { $ne: facilityId },
          location: {
            $near: {
              $geometry: facility.location,
              $maxDistance: 50000 // 50km
            }
          }
        }).limit(5);

        const facilityIds = nearbyFacilities.map(f => f._id);
        nearbyStock = await Inventory.find({
          facilityId: { $in: facilityIds },
          drugName: new RegExp(drugName, 'i'),
          currentStock: { $gt: 0 }
        }).populate('facilityId', 'name address contactInfo');
      }
    }

    res.json({
      success: true,
      data: {
        currentFacility: currentInventory || null,
        nearbyAlternatives: nearbyStock.map(item => ({
          facilityName: item.facilityId.name,
          address: item.facilityId.address,
          currentStock: item.currentStock,
          risk: item.stockoutRisk,
          contact: item.facilityId.contactInfo
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { 
  getFacilityInventory, 
  updateStock, 
  searchDrugAvailability 
}
