const Inventory = require('../models/Inventory');
const Facility = require('../models/Facility');
const Alert = require('../models/Alert');

class PredictionService {

  static calculateRisk(inventoryItem) {
    const { consumptionHistory, currentStock, leadTimeDays, reorderPoint } = inventoryItem;

    const recentConsumption = this.getRecentConsumption(consumptionHistory, 7);
    const avgDailyUse = recentConsumption.length > 0
      ? recentConsumption.reduce((sum, c) => sum + c.quantity, 0) / recentConsumption.length
      : this.getHistoricalAverage(consumptionHistory);

    if (avgDailyUse === 0) {
      return { risk: 'unknown', daysLeft: 999, confidence: 'low' };
    }

    const daysLeft = Math.floor(currentStock / avgDailyUse);
    const stockoutDate = new Date(Date.now() + (daysLeft * 24 * 60 * 60 * 1000));

    let risk = 'none';
    let priority = 0;

    if (daysLeft <= leadTimeDays) {
      risk = 'critical';
      priority = 3;
    } else if (daysLeft <= leadTimeDays * 2) {
      risk = 'high';
      priority = 2;
    } else if (daysLeft <= leadTimeDays * 3) {
      risk = 'medium';
      priority = 1;
    } else if (daysLeft <= 30) {
      risk = 'low';
      priority = 0;
    }

    // Adjust for reorder point
    if (currentStock <= reorderPoint && risk === 'none') {
      risk = 'low';
      priority = 0;
    }

    return {
      risk,
      priority,
      daysLeft,
      predictedStockoutDate: stockoutDate,
      avgDailyUse,
      recommendedOrder: this.calculateRecommendedOrder(avgDailyUse, leadTimeDays, currentStock),
      confidence: consumptionHistory.length >= 14 ? 'high' : 'medium'
    };
  }

  static getRecentConsumption(history, days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return history.filter(h => h.date >= cutoff);
  }

  static getHistoricalAverage(history) {
    if (!history || history.length === 0) return 0;
    const total = history.reduce((sum, h) => sum + h.quantity, 0);
    const daysSpan = (new Date() - history[0].date) / (1000 * 60 * 60 * 24);
    return daysSpan > 0 ? total / daysSpan : 0;
  }

  /**
   * Calculate recommended order quantity
   */
  static calculateRecommendedOrder(avgDailyUse, leadTimeDays, currentStock) {
    const safetyStock = avgDailyUse * 3; // 3 days safety stock
    const orderUpTo = (avgDailyUse * leadTimeDays * 2) + safetyStock;
    const recommended = Math.max(0, Math.ceil(orderUpTo - currentStock));
    return recommended;
  }

  /**
   * Get all facilities with critical stockouts
   */
  static async getCriticalStockouts(limit = 50) {
    const criticalItems = await Inventory.find({
      stockoutRisk: 'critical',
      daysOfStockLeft: { $lt: 7 }
    })
      .populate('facilityId', 'name code location address contactInfo')
      .sort({ daysOfStockLeft: 1 })
      .limit(limit);

    return criticalItems.map(item => ({
      facility: item.facilityId,
      drug: item.drugName,
      daysLeft: item.daysOfStockLeft,
      currentStock: item.currentStock,
      predictedDate: item.predictedStockoutDate,
      recommendedOrder: this.calculateRecommendedOrder(
        this.getHistoricalAverage(item.consumptionHistory),
        item.leadTimeDays,
        item.currentStock
      )
    }));
  }

  /**
   * Bulk update predictions for all inventory items
   * (Run as scheduled job every hour)
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
              stockoutRisk: prediction.risk,
              daysOfStockLeft: prediction.daysLeft,
              predictedStockoutDate: prediction.predictedStockoutDate
            }
          }
        }
      });

      // Generate alert if critical
      if (prediction.risk === 'critical') {
        await this.createAlert(item, prediction);
      }
    }

    if (updates.length > 0) {
      await Inventory.bulkWrite(updates);
    }

    return { updated: updates.length };
  }

  /**
   * Create alert for critical stockout
   */
  static async createAlert(inventoryItem, prediction) {
    const existingAlert = await Alert.findOne({
      inventoryId: inventoryItem._id,
      type: 'stockout_risk',
      resolved: false
    });

    if (!existingAlert) {
      await Alert.create({
        facilityId: inventoryItem.facilityId,
        inventoryId: inventoryItem._id,
        type: 'stockout_risk',
        severity: 'critical',
        title: `Critical Stockout Risk: ${inventoryItem.drugName}`,
        description: `Only ${prediction.daysLeft} days of stock remaining. Predicted stockout on ${prediction.predictedStockoutDate.toLocaleDateString()}. Recommended order: ${prediction.recommendedOrder} units.`,
        metadata: {
          daysLeft: prediction.daysLeft,
          currentStock: inventoryItem.currentStock,
          recommendedOrder: prediction.recommendedOrder,
          avgDailyUse: prediction.avgDailyUse
        }
      });
    }
  }

  /**
   * Get dashboard summary statistics
   */
  static async getDashboardSummary() {
    const [totalFacilities, criticalCount, highCount, mediumCount, totalDrugs] = await Promise.all([
      Facility.countDocuments({ status: 'active' }),
      Inventory.countDocuments({ stockoutRisk: 'critical' }),
      Inventory.countDocuments({ stockoutRisk: 'high' }),
      Inventory.countDocuments({ stockoutRisk: 'medium' }),
      Inventory.countDocuments()
    ]);

    const topCritical = await Inventory.find({ stockoutRisk: 'critical' })
      .populate('facilityId', 'name code')
      .sort({ daysOfStockLeft: 1 })
      .limit(10);

    return {
      summary: {
        totalFacilities,
        totalDrugsMonitored: totalDrugs,
        criticalStockouts: criticalCount,
        highRiskStockouts: highCount,
        mediumRiskStockouts: mediumCount,
        alertRate: ((criticalCount + highCount) / totalDrugs * 100).toFixed(1)
      },
      topAlerts: topCritical.map(item => ({
        facility: item.facilityId ? item.facilityId.name : 'Unknown',
        drug: item.drugName,
        daysLeft: item.daysOfStockLeft,
        risk: item.stockoutRisk
      }))
    };
  }
}

module.exports = PredictionService;
