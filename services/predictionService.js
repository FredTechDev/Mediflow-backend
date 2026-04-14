const Inventory = require('../models/Inventory');
const Facility = require('../models/Facility');
const Alert = require('../models/Alert');

class PredictionService {

  /**
   * Calculate Stock and Expiry Risk for a single item
   */
  static calculateRisk(inventoryItem) {
    const { consumptionHistory, currentStock, expiryDate, reorderPoint, maxStock } = inventoryItem;

    // --- 1. STOCKOUT PREDICTION ---
    const recentConsumption = this.getRecentConsumption(consumptionHistory, 7);
    const avgDailyUse = recentConsumption.length > 0
      ? recentConsumption.reduce((sum, c) => sum + c.quantity, 0) / recentConsumption.length
      : this.getHistoricalAverage(consumptionHistory);

    let stockRisk = 'none';
    let daysLeft = 999;
    let stockoutDate = null;
    let reorderDate = null;
    let reorderAmount = 0;

    if (avgDailyUse > 0) {
      daysLeft = Math.floor(currentStock / avgDailyUse);
      stockoutDate = new Date(Date.now() + (daysLeft * 24 * 60 * 60 * 1000));

      if (daysLeft <= 2) stockRisk = 'critical';
      else if (daysLeft <= 5) stockRisk = 'high';
      else if (daysLeft <= 14) stockRisk = 'medium';
      else if (daysLeft <= 30) stockRisk = 'low';

      // Reorder Date Calculation
      const effectiveReorderPoint = reorderPoint || 100;
      if (currentStock > effectiveReorderPoint) {
        const daysUntilReorder = Math.floor((currentStock - effectiveReorderPoint) / avgDailyUse);
        reorderDate = new Date(Date.now() + (daysUntilReorder * 24 * 60 * 60 * 1000));
      } else {
        reorderDate = new Date(); // Needs reorder now
      }

      // Reorder Amount Calculation (Replenish to maxStock)
      const effectiveMaxStock = maxStock || 1000;
      reorderAmount = Math.max(0, effectiveMaxStock - currentStock);
    }

    // --- 2. EXPIRY MONITORING ---
    const expiryStatus = this.checkExpiryStatus(expiryDate);

    return {
      stockRisk,
      daysLeft,
      predictedStockoutDate: stockoutDate,
      avgDailyUse,
      expiryStatus,
      reorderDate,
      reorderAmount,
      confidence: consumptionHistory.length >= 14 ? 'high' : 'medium'
    };
  }

  static checkExpiryStatus(expiryDate) {
    if (!expiryDate) return 'safe';

    const today = new Date();
    const diffDays = Math.ceil((new Date(expiryDate) - today) / (1000 * 60 * 60 * 24));

    // Note: 'expired' is intentionally mapped to 'expires_soon' to stay within the
    // Inventory schema enum ['safe', 'warning', 'expires_soon'].
    // The expiryDate field itself is the source of truth for expiry checks.
    if (diffDays <= 0) return 'expires_soon'; // Already expired
    if (diffDays <= 7) return 'expires_soon';
    if (diffDays <= 30) return 'warning';
    return 'safe';
  }

  static getRecentConsumption(history, days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return history.filter(h => h.date >= cutoff);
  }

  static getHistoricalAverage(history) {
    if (!history || history.length === 0) return 0;
    const total = history.reduce((sum, h) => sum + h.quantity, 0);
    const firstEntryDate = history[0].date;
    const daysSpan = Math.ceil((new Date() - new Date(firstEntryDate)) / (1000 * 60 * 60 * 24));
    return daysSpan > 0 ? total / daysSpan : 0;
  }

  /**
   * Update all predictions in background
   */
  static async updateAllPredictions() {
    const allInventory = await Inventory.find();
    const updates = [];

    for (const item of allInventory) {
      const prediction = this.calculateRisk(item);

      updates.push({
        updateOne: {
          filter: { _id: item._id },
          update: {
            $set: {
              stockoutRisk: prediction.stockRisk,
              daysOfStockLeft: prediction.daysLeft,
              predictedStockoutDate: prediction.predictedStockoutDate,
              expiryStatus: prediction.expiryStatus,
              lastUpdated: new Date()
            }
          }
        }
      });

      // Generate alerts for critical risks or reorder thresholds
      if (prediction.stockRisk === 'critical' || 
          prediction.stockRisk === 'high' || 
          prediction.expiryStatus === 'expires_soon' || 
          prediction.expiryStatus === 'expired') {
        await this.createAlert(item, prediction);
      }
    }

    if (updates.length > 0) {
      await Inventory.bulkWrite(updates);
    }

    return { updated: updates.length };
  }

  static async createAlert(inventoryItem, prediction) {
    let alertType, title, description, severity = 'critical';

    if (prediction.stockRisk === 'critical' || prediction.stockRisk === 'high') {
      alertType = 'stockout_risk';
      severity = prediction.stockRisk === 'critical' ? 'critical' : 'high';
      title = `${prediction.stockRisk.toUpperCase()} Stockout Risk: ${inventoryItem.drugName}`;
      
      const formattedDate = prediction.reorderDate ? new Date(prediction.reorderDate).toLocaleDateString() : 'ASAP';
      description = `Current Stock: ${inventoryItem.currentStock}. Expected Stockout in ${prediction.daysLeft} days. ` +
                    `Action: Reorder ${prediction.reorderAmount} units by ${formattedDate}.`;
    } else if (prediction.expiryStatus === 'expires_soon') {
      alertType = 'expiry';
      severity = 'high';
      const isExpired = inventoryItem.expiryDate && new Date(inventoryItem.expiryDate) < new Date();
      if (isExpired) {
        title = `DRUG EXPIRED: ${inventoryItem.drugName}`;
        description = `Batch ${inventoryItem.batchNumber || 'N/A'} has expired. Remove from stock immediately.`;
        severity = 'critical';
      } else {
        title = `Expiring Soon: ${inventoryItem.drugName}`;
        description = `Drug will expire on ${new Date(inventoryItem.expiryDate).toLocaleDateString()}.`;
      }
    }

    if (!alertType) return;

    const existingAlert = await Alert.findOne({
      inventoryId: inventoryItem._id,
      type: alertType,
      resolved: false
    });

    if (!existingAlert) {
      await Alert.create({
        facilityId: inventoryItem.facilityId,
        inventoryId: inventoryItem._id,
        type: alertType,
        severity,
        title,
        description,
        metadata: {
          daysLeft: prediction.daysLeft,
          expiryDate: inventoryItem.expiryDate,
          batchNumber: inventoryItem.batchNumber,
          reorderAmount: prediction.reorderAmount,
          reorderDate: prediction.reorderDate
        }
      });
    }
  }

  static async getDashboardSummary() {
    const [
      totalFacilities,
      criticalStockouts,
      expiringSoon,
      totalDrugs
    ] = await Promise.all([
      Facility.countDocuments({ status: 'active' }),
      Inventory.countDocuments({ stockoutRisk: 'critical' }),
      Inventory.countDocuments({ expiryStatus: { $in: ['warning', 'expires_soon', 'expired'] } }),
      Inventory.countDocuments()
    ]);

    const topCritical = await Inventory.find({ 
      $or: [{ stockoutRisk: 'critical' }, { expiryStatus: 'expires_soon' }] 
    })
      .populate('facilityId', 'name code')
      .sort({ daysOfStockLeft: 1 })
      .limit(10);

    return {
      summary: {
        totalFacilities,
        totalDrugsMonitored: totalDrugs,
        criticalStockouts,
        expiryRisks: expiringSoon,
        alertRate: ((criticalStockouts + expiringSoon) / totalDrugs * 100).toFixed(1)
      },
      topAlerts: topCritical.map(item => ({
        facility: item.facilityId ? item.facilityId.name : 'Unknown',
        drug: item.drugName,
        daysLeft: item.daysOfStockLeft,
        risk: item.stockoutRisk,
        expiry: item.expiryStatus
      }))
    };
  }
}

module.exports = PredictionService;
