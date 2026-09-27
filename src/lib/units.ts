const scales: Record<string, [string, number]> = {
  ml: ['volume', 1], ltr: ['volume', 1000], l: ['volume', 1000], litre: ['volume', 1000], liter: ['volume', 1000],
  gm: ['mass', 1], g: ['mass', 1], kg: ['mass', 1000],
};

function measure(unit: string): [string, number] {
  const normalized = unit.trim().toLowerCase().replace(/\s+/g, ' ');
  if (scales[normalized]) return scales[normalized];
  const packed = normalized.match(/^(\d+(?:\.\d+)?)\s*(ml|ltr|l|litre|liter|gm|g|kg)$/);
  if (packed && Number(packed[1]) > 0) {
    const [dimension, factor] = scales[packed[2]];
    return [dimension, factor * Number(packed[1])];
  }
  return [normalized, 1];
}

export function unitConversionFactor(from: string, to: string): number {
  const [fromDimension, fromFactor] = measure(from);
  const [toDimension, toFactor] = measure(to);
  if (fromDimension !== toDimension) throw new Error(`Cannot convert ${from} to ${to}. Choose a compatible product unit.`);
  return fromFactor / toFactor;
}

/** Stock stays in the product's unit; rates and invoice quantities use the selected unit. */
export function convertQuantity(quantity: number, from: string, to: string): number {
  const converted = quantity * unitConversionFactor(from, to);
  const rounded = Math.round(converted * 1000) / 1000;
  if (Math.abs(converted - rounded) > 0.00000001) throw new Error(`This quantity cannot be stored precisely in ${to}. Use a larger quantity or a smaller stock unit.`);
  return rounded;
}
