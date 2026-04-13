const Inventory = require('../models/Inventory');
const Facility = require('../models/Facility');
const Alert = require('../models/Alert');

const findSurplusAndShortage = async (req, res) => {
  try {
    const { drugName, radius = 50 } = req.query;
    
    // Find facilities with shortage (critical or high risk)
    const shortageItems = await Inventory.find({
      drugName: new RegExp(drugName, 'i'),
      stockoutRisk: { $in: ['critical', 'high'] }
    }).populate('facilityId', 'name code location');
    
    // Find facilities with surplus (low risk or none, and significant stock)
    const surplusItems = await Inventory.find({
      drugName: new RegExp(drugName, 'i'),
      stockoutRisk: { $in: ['none', 'low'] },
      currentStock: { $gt: 200 } // Threshold for surplus
    }).populate('facilityId', 'name code location');
    
    // Match shortages with nearby surpluses
    const matches = [];
    
    for (const short of shortageItems) {
      if (!short.facilityId) continue;
      
      const nearby = surplusItems.filter(surp => {
        if (!surp.facilityId) return false;
        
        const distance = calculateDistance(
          short.facilityId.location.coordinates,
          surp.facilityId.location.coordinates
        );
        return distance <= radius && surp.facilityId._id.toString() !== short.facilityId._id.toString();
      });
      
      if (nearby.length > 0) {
        matches.push({
          shortage: {
            facility: short.facilityId.name,
            currentStock: short.currentStock,
            needed: short.reorderPoint - short.currentStock
          },
          surplusSources: nearby.map(s => ({
            facility: s.facilityId.name,
            available: s.currentStock - s.safetyStock,
            distance: calculateDistance(
              short.facilityId.location.coordinates,
              s.facilityId.location.coordinates
            ).toFixed(2)
          }))
        });
      }
    }
    
    res.json({
      success: true,
      drug: drugName,
      matches,
      recommendation: matches.length > 0 
        ? 'Transfer recommended from surplus to shortage facilities'
        : 'No redistribution opportunities found within radius'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

function calculateDistance(coord1, coord2) {
  // Haversine formula for distance in km
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

const generateTransferPlan = async (req, res) => {
  try {
    const { fromFacilityId, toFacilityId, drugName, quantity } = req.body;
    
    const fromInventory = await Inventory.findOne({
      facilityId: fromFacilityId,
      drugName: new RegExp(`^${drugName}$`, 'i')
    }).populate('facilityId', 'name');
    
    const toInventory = await Inventory.findOne({
      facilityId: toFacilityId,
      drugName: new RegExp(`^${drugName}$`, 'i')
    }).populate('facilityId', 'name');
    
    if (!fromInventory || !toInventory) {
      return res.status(404).json({ success: false, error: 'Inventory not found' });
    }
    
    if (fromInventory.currentStock < quantity) {
      return res.status(400).json({ success: false, error: 'Insufficient stock at source' });
    }
    
    // Create transfer record (mock for now as there's no Transfer model yet)
    const transferPlan = {
      from: fromInventory.facilityId.name,
      to: toInventory.facilityId.name,
      drug: drugName,
      quantity,
      status: 'pending',
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
    };
    
    res.json({
      success: true,
      transferPlan,
      message: `Proposed transfer of ${quantity} units of ${drugName} from ${transferPlan.from} to ${transferPlan.to}`,
      nextSteps: [
        '1. Verify stock availability physically',
        '2. Generate transfer manifest',
        '3. Update inventory systems after physical transfer',
        '4. Confirm receipt at destination'
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const requestUrgentSupply = async (req, res) => {
  try {
    const { facilityId, drugName, reason, quantity } = req.body;

    if (!facilityId || !drugName) {
      return res.status(400).json({ success: false, message: 'Please provide facilityId and drugName' });
    }

    const inventory = await Inventory.findOne({ facilityId, drugName: new RegExp(`^${drugName}$`, 'i') });

    // Create a high-priority alert for redistribution
    const alert = await Alert.create({
      facilityId,
      inventoryId: inventory ? inventory._id : null,
      type: 'low_stock',
      severity: 'critical',
      title: `URGENT STOCK REQUEST: ${drugName}`,
      description: `Doctor ${req.user.name} has requested an urgent supply of ${drugName}. Reason: ${reason || 'Not specified'}. Quantity needed: ${quantity || 'N/A'}.`,
      metadata: {
        doctorId: req.user.id,
        drugName,
        requestedQuantity: quantity,
        currentStock: inventory ? inventory.currentStock : 'Unknown'
      }
    });

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Urgent supply request recorded and notified to management'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { findSurplusAndShortage, generateTransferPlan, requestUrgentSupply }

