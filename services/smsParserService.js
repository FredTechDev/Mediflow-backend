class SMSParserService {

  static parseStockUpdate(message) {
    const normalized = message.toLowerCase().trim();

    const pattern1 = /(\w+)\s+([a-z]+)\s+(\d+)/i;
    let match = normalized.match(pattern1);

    if (match) {
      return {
        facility: match[1].toUpperCase(),
        drug: this.normalizeDrugName(match[2]),
        stock: parseInt(match[3]),
        confidence: 'high'
      };
    }

    const pattern2 = /facility:\s*(\w+).*?drug:\s*([a-z]+).*?stock:\s*(\d+)/i;
    match = normalized.match(pattern2);

    if (match) {
      return {
        facility: match[1].toUpperCase(),
        drug: this.normalizeDrugName(match[2]),
        stock: parseInt(match[3]),
        confidence: 'high'
      };
    }
Y
    const pattern3 = /([a-z]+)\s+(\d+)\s+at\s+(\w+)/i;
    match = normalized.match(pattern3);

    if (match) {
      return {
        facility: match[3].toUpperCase(),
        drug: this.normalizeDrugName(match[1]),
        stock: parseInt(match[2]),
        confidence: 'medium'
      };
    }

    return {
      error: 'Unable to parse SMS',
      originalMessage: message,
      confidence: 'low'
    };
  }

  static normalizeDrugName(drug) {
    const drugMap = {
      'para': 'paracetamol',
      'paracetamol': 'paracetamol',
      'malaria': 'artemether-lumefantrine',
      'artemether': 'artemether-lumefantrine',
      'coartem': 'artemether-lumefantrine',
      'antibiotic': 'amoxicillin',
      'amox': 'amoxicillin',
      'arv': 'tenofovir',
      'tenofovir': 'tenofovir',
      'vaccine': 'vaccine',
      'ors': 'oral_rehydration_salts'
    };

    return drugMap[drug.toLowerCase()] || drug.toLowerCase();
  }

  /**
   * Validate parsed data against database
   */
  static async validateParsedData(parsed, Facility, Inventory) {
    const facility = await Facility.findOne({
      $or: [
        { code: parsed.facility },
        { name: new RegExp(`^${parsed.facility}$`, 'i') }
      ]
    });

    if (!facility) {
      return { valid: false, error: 'Facility not found' };
    }

    const inventory = await Inventory.findOne({
      facilityId: facility._id,
      drugName: new RegExp(`^${parsed.drug}$`, 'i')
    });

    if (!inventory) {
      return { valid: false, error: 'Drug not found for this facility' };
    }

    return {
      valid: true,
      facilityId: facility._id,
      inventoryId: inventory._id,
      currentStock: parsed.stock
    };
  }
}

module.exports = SMSParserService;
