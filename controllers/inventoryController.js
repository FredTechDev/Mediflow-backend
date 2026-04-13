const Inventory = require('../models/Inventory');

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
        recordedBy: 'api'
      });
      inventory.currentStock -= quantityConsumed;
    } else if (currentStock !== undefined) {
      inventory.currentStock = currentStock;
    }
    
    await inventory.save();
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {getFacilityInventory, updateStock}
