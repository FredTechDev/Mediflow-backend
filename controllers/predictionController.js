const PredictionService = require('../services/predictionService');
const Inventory = require('../models/Inventory');

const getFacilityPredictions = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { days = 30 } = req.query;
    
    const inventory = await Inventory.find({ 
      facilityId,
      daysOfStockLeft: { $lt: days }
    }).populate('facilityId', 'name code');
    
    const predictions = inventory.map(item => ({
      drug: item.drugName,
      currentStock: item.currentStock,
      daysLeft: item.daysOfStockLeft,
      risk: item.stockoutRisk,
      predictedDate: item.predictedStockoutDate,
      recommendedOrder: PredictionService.calculateRecommendedOrder(
        PredictionService.getHistoricalAverage(item.consumptionHistory),
        item.leadTimeDays,
        item.currentStock
      )
    }));
    
    res.json({
      success: true,
      facilityId,
      totalAtRisk: predictions.length,
      predictions,
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllCriticalStockouts = async (req, res) => {
  try {
    const critical = await PredictionService.getCriticalStockouts(100);
    res.json({
      success: true,
      count: critical.length,
      data: critical,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const summary = await PredictionService.getDashboardSummary();
    res.json({
      success: true,
      ...summary,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const triggerPredictionUpdate = async (req, res) => {
  try {
    const result = await PredictionService.updateAllPredictions();
    res.json({
      success: true,
      message: 'Predictions updated successfully',
      updated: result.updated,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDrugPredictionHistory = async (req, res) => {
  try {
    const { facilityId, drugName } = req.params;
    const { days = 90 } = req.query;
    
    const inventory = await Inventory.findOne({ facilityId, drugName });
    
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Drug not found' });
    }
    
    const history = inventory.consumptionHistory
      .filter(h => h.date >= new Date(Date.now() - days * 24 * 60 * 60 * 1000))
      .sort((a, b) => a.date - b.date);
    
    res.json({
      success: true,
      drug: inventory.drugName,
      currentStock: inventory.currentStock,
      risk: inventory.stockoutRisk,
      daysLeft: inventory.daysOfStockLeft,
      consumptionHistory: history,
      predictions: {
        risk: inventory.stockoutRisk,
        predictedDate: inventory.predictedStockoutDate,
        confidence: history.length >= 14 ? 'high' : 'medium'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports =  {
  getFacilityPredictions, 
  getAllCriticalStockouts,
  getDashboardSummary,
  triggerPredictionUpdate,
  getDrugPredictionHistory
}
