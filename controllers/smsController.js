const SMSParserService = require('../services/smsParserService');
const Inventory = require('../models/Inventory');
const StockUpdate = require('../models/StockUpdate');
const PredictionService = require('../services/predictionService');
const Facility = require('../models/Facility');

const processSMS = async (req, res) => {
  try {
    const { message, from, timestamp } = req.body;
    
    // Parse SMS
    const parsed = SMSParserService.parseStockUpdate(message);
    
    if (parsed.error) {
      return res.status(400).json({
        success: false,
        error: parsed.error,
        originalMessage: message
      });
    }
    
    // Validate against database
    const validation = await SMSParserService.validateParsedData(parsed, Facility, Inventory);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        parsed
      });
    }
    
    // Update inventory
    const inventory = await Inventory.findById(validation.inventoryId);
    const previousStock = inventory.currentStock;
    
    // Add to consumption history
    inventory.consumptionHistory.push({
      date: new Date(),
      quantity: Math.max(0, previousStock - validation.currentStock),
      recordedBy: 'sms',
      notes: `Auto-updated via SMS from ${from}`
    });
    
    // Update current stock
    inventory.currentStock = validation.currentStock;
    await inventory.save();
    
    // Log the update
    await StockUpdate.create({
      facilityId: validation.facilityId,
      inventoryId: validation.inventoryId,
      source: 'sms',
      rawMessage: message,
      parsedData: parsed,
      from: from,
      previousStock: previousStock,
      newStock: validation.currentStock,
      timestamp: timestamp || new Date()
    });
    
    // Re-run predictions for all items (could be optimized to just this facility)
    await PredictionService.updateAllPredictions();
    
    res.json({
      success: true,
      message: 'Stock updated successfully via SMS',
      data: {
        facility: parsed.facility,
        drug: parsed.drug,
        newStock: validation.currentStock,
        risk: inventory.stockoutRisk,
        daysLeft: inventory.daysOfStockLeft
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSMSHistory = async (req, res) => {
  try {
    const { facilityId, limit = 50 } = req.query;
    const query = facilityId ? { facilityId } : {};
    
    const updates = await StockUpdate.find(query)
      .populate('facilityId', 'name code')
      .populate('inventoryId', 'drugName')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: updates.length,
      data: updates
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const simulateSMS = async (req, res) => {
  const { message, from = '+254700000000' } = req.body;
  
  const mockReq = { body: { message, from, timestamp: new Date() } };
  const mockRes = {
    status: function(s) { this.statusCode = s; return this; },
    json: function(j) { this.body = j; return this; }
  };
  
  await exports.processSMS(mockReq, mockRes);
  res.status(mockRes.statusCode || 200).json(mockRes.body);
};

module.exports = {processSMS, getSMSHistory, simulateSMS}
