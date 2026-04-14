const Inventory = require('../models/Inventory');
const Facility = require('../models/Facility');
const Alert = require('../models/Alert');

// @desc    Get aggregate stock levels across entire nation
// @route   GET /api/admin/global-inventory
// @access  Private (Admin)
const getGlobalInventory = async (req, res) => {
  try {
    const aggregates = await Inventory.aggregate([
      {
        $group: {
          _id: '$drugName',
          totalStock: { $sum: '$currentStock' },
          facilitiesCount: { $sum: 1 },
          criticalRiskCount: { 
            $sum: { $cond: [{ $eq: ['$stockoutRisk', 'critical'] }, 1, 0] } 
          },
          category: { $first: '$category' }
        }
      },
      { $sort: { totalStock: -1 } }
    ]);

    res.json({ success: true, data: aggregates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get health status of all facilities
// @route   GET /api/admin/facility-health
// @access  Private (Admin)
const getFacilityHealth = async (req, res) => {
  try {
    const facilities = await Facility.find();
    
    const healthStatus = await Promise.all(facilities.map(async (f) => {
      const criticalItems = await Inventory.countDocuments({ 
        facilityId: f._id, 
        stockoutRisk: 'critical' 
      });
      const expiringItems = await Inventory.countDocuments({ 
        facilityId: f._id, 
        expiryStatus: { $ne: 'safe' } 
      });

      return {
        _id: f._id,
        name: f.name,
        region: f.address?.region,
        type: f.facilityType,
        criticalItems,
        expiringItems,
        status: criticalItems > 3 ? 'critical' : (criticalItems > 0 ? 'warning' : 'safe')
      };
    }));

    res.json({ success: true, data: healthStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get recent global alerts
// @route   GET /api/admin/global-alerts
// @access  Private (Admin)
const getGlobalAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('facilityId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getGlobalInventory,
  getFacilityHealth,
  getGlobalAlerts
};
