import { UnitCategory } from "../entities/unit.entity";

export interface StandardUnitDef {
  category: UnitCategory;
  name: string;
  symbol: string;
  toBaseRatio: number; // multiplier to reach base unit
  isBase: boolean;
}

export const STANDARD_UNITS: Record<string, StandardUnitDef> = {
  // WEIGHT (Base: Kg)
  "kg":    { category: UnitCategory.WEIGHT, name: "Kilogram", symbol: "Kg", toBaseRatio: 1.0, isBase: true },
  "g":     { category: UnitCategory.WEIGHT, name: "Gram", symbol: "g", toBaseRatio: 0.001, isBase: false },
  "gram":  { category: UnitCategory.WEIGHT, name: "Gram", symbol: "g", toBaseRatio: 0.001, isBase: false },
  "ton":   { category: UnitCategory.WEIGHT, name: "Ton", symbol: "Ton", toBaseRatio: 1000.0, isBase: false },
  "mg":    { category: UnitCategory.WEIGHT, name: "Milligram", symbol: "mg", toBaseRatio: 0.000001, isBase: false },

  // VOLUME (Base: Liter)
  "l":     { category: UnitCategory.VOLUME, name: "Liter", symbol: "L", toBaseRatio: 1.0, isBase: true },
  "liter": { category: UnitCategory.VOLUME, name: "Liter", symbol: "L", toBaseRatio: 1.0, isBase: true },
  "ml":    { category: UnitCategory.VOLUME, name: "Milliliter", symbol: "ml", toBaseRatio: 0.001, isBase: false },
  "gal":   { category: UnitCategory.VOLUME, name: "Gallon", symbol: "gal", toBaseRatio: 3.78541, isBase: false },

  // COUNT (Base: Piece)
  "pcs":    { category: UnitCategory.COUNT, name: "Piece", symbol: "pcs", toBaseRatio: 1.0, isBase: true },
  "piece":  { category: UnitCategory.COUNT, name: "Piece", symbol: "pcs", toBaseRatio: 1.0, isBase: true },
  "box":    { category: UnitCategory.COUNT, name: "Box", symbol: "box", toBaseRatio: 1.0, isBase: false },
  "packet": { category: UnitCategory.COUNT, name: "Packet", symbol: "pkt", toBaseRatio: 1.0, isBase: false },
  "carton": { category: UnitCategory.COUNT, name: "Carton", symbol: "ctn", toBaseRatio: 1.0, isBase: false },
  "dozen":  { category: UnitCategory.COUNT, name: "Dozen", symbol: "dz", toBaseRatio: 12.0, isBase: false },
  "bundle": { category: UnitCategory.COUNT, name: "Bundle", symbol: "bdl", toBaseRatio: 1.0, isBase: false },
  "roll":   { category: UnitCategory.COUNT, name: "Roll", symbol: "roll", toBaseRatio: 1.0, isBase: false },

  // LENGTH (Base: Meter)
  "m":     { category: UnitCategory.LENGTH, name: "Meter", symbol: "m", toBaseRatio: 1.0, isBase: true },
  "meter": { category: UnitCategory.LENGTH, name: "Meter", symbol: "m", toBaseRatio: 1.0, isBase: true },
  "ft":    { category: UnitCategory.LENGTH, name: "Feet", symbol: "ft", toBaseRatio: 0.3048, isBase: false },
  "feet":  { category: UnitCategory.LENGTH, name: "Feet", symbol: "ft", toBaseRatio: 0.3048, isBase: false },
  "cm":    { category: UnitCategory.LENGTH, name: "Centimeter", symbol: "cm", toBaseRatio: 0.01, isBase: false },
  "inch":  { category: UnitCategory.LENGTH, name: "Inch", symbol: "in", toBaseRatio: 0.0254, isBase: false }
};

export class UnitConverter {
  /**
   * Converts a given quantity in unit_name to the equivalent Base Unit quantity.
   */
  public static toBaseQuantity(quantity: number, unitName: string, customRatio?: number): number {
    if (!quantity || quantity <= 0) return 0;
    const lower = unitName.toLowerCase().trim();
    
    if (customRatio && customRatio > 0) {
      return Number((quantity * customRatio).toFixed(6));
    }

    const std = STANDARD_UNITS[lower];
    if (std) {
      return Number((quantity * std.toBaseRatio).toFixed(6));
    }

    // Default fallback 1:1 if unit is unknown
    return quantity;
  }

  /**
   * Converts a base unit quantity into target unit quantity.
   */
  public static fromBaseQuantity(baseQuantity: number, targetUnitName: string, customRatio?: number): number {
    if (!baseQuantity || baseQuantity <= 0) return 0;
    const lower = targetUnitName.toLowerCase().trim();

    if (customRatio && customRatio > 0) {
      return Number((baseQuantity / customRatio).toFixed(6));
    }

    const std = STANDARD_UNITS[lower];
    if (std && std.toBaseRatio > 0) {
      return Number((baseQuantity / std.toBaseRatio).toFixed(6));
    }

    return baseQuantity;
  }

  /**
   * Calculate unit price for a specific unit relative to base unit price.
   */
  public static calculateUnitPrice(basePrice: number, unitName: string, customRatio?: number): number {
    const ratio = customRatio && customRatio > 0 ? customRatio : (STANDARD_UNITS[unitName.toLowerCase().trim()]?.toBaseRatio || 1.0);
    return Number((basePrice * ratio).toFixed(2));
  }
}
