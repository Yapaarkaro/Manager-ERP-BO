/**
 * Compound UoM: e.g. 1 Box = 12 Pieces.
 * Quantity in primary (Box) × ratio must equal a whole number of secondary units for stock.
 */

const EPS = 1e-6;

export function parseConversionRatio(ratio: string | undefined): number | null {
  if (ratio == null || String(ratio).trim() === '') return null;
  const n = parseFloat(String(ratio).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function isCompoundProduct(item: {
  secondaryUnit?: string;
  conversionRatio?: string;
}): boolean {
  const su = item.secondaryUnit;
  if (!su || su === 'None') return false;
  return parseConversionRatio(item.conversionRatio) != null;
}

export type CompoundCartItem = {
  selectedUoM?: 'primary' | 'secondary' | 'tertiary';
  primaryUnit?: string;
  secondaryUnit?: string;
  tertiaryUnit?: string;
  conversionRatio?: string;
  tertiaryConversionRatio?: string;
};

export function validateCompoundCartQuantity(
  quantity: number,
  item: CompoundCartItem
): { ok: true } | { ok: false; message: string } {
  if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
    return { ok: false, message: 'Enter a valid quantity greater than zero.' };
  }

  const uom = item.selectedUoM || 'primary';
  const primary = item.primaryUnit || 'unit';
  const secondary = item.secondaryUnit || 'Piece';

  if (uom === 'primary' && isCompoundProduct(item)) {
    const R = parseConversionRatio(item.conversionRatio)!;
    const inSecondary = quantity * R;
    const rounded = Math.round(inSecondary);
    if (Math.abs(inSecondary - rounded) > EPS) {
      const examples = [1, 0.5, 2, 12 / R, 18 / R].filter((x) => x > 0 && Math.abs(x * R - Math.round(x * R)) < EPS);
      const uniq = [...new Set(examples.map((x) => Number(x.toFixed(4))))].slice(0, 4);
      const hint = uniq.length ? ` Valid examples: ${uniq.join(', ')} ${primary}.` : '';
      return {
        ok: false,
        message:
          `${quantity} ${primary} = ${inSecondary.toFixed(3).replace(/\.?0+$/, '')} ${secondary}, which must be a whole number.\n\n` +
          `With 1 ${primary} = ${R} ${secondary}, only quantities that multiply to whole ${secondary}s are allowed (e.g. 1 ${primary} = ${R} ${secondary}, 1.5 ${primary} = ${1.5 * R} ${secondary} only if that is whole).${hint}\n\n` +
          `Please change the quantity on this screen.`,
      };
    }
    return { ok: true };
  }

  if (uom === 'secondary') {
    const rounded = Math.round(quantity);
    if (Math.abs(quantity - rounded) > EPS) {
      return {
        ok: false,
        message: `When selling by ${secondary}, enter a whole number only (no decimals).`,
      };
    }
    return { ok: true };
  }

  if (uom === 'tertiary') {
    const tR = parseConversionRatio(item.tertiaryConversionRatio);
    const sR = parseConversionRatio(item.conversionRatio);
    if (tR && sR) {
      const inSecondary = quantity * tR;
      const roundedS = Math.round(inSecondary);
      if (Math.abs(inSecondary - roundedS) > EPS) {
        return {
          ok: false,
          message: `This quantity doesn't convert to a whole number of ${secondary}. Please enter a valid quantity.`,
        };
      }
    }
    const rounded = Math.round(quantity);
    if (Math.abs(quantity - rounded) > EPS) {
      return {
        ok: false,
        message: `Enter a whole number when using ${item.tertiaryUnit || 'this unit'}.`,
      };
    }
  }

  return { ok: true };
}

/** Decimals allowed in cart quantity input for this line. */
export function cartQuantityDecimalsForItem(item: CompoundCartItem & { quantityDecimals?: number }): number {
  const uom = item.selectedUoM || 'primary';
  if (uom === 'secondary' || uom === 'tertiary') return 0;
  if (uom === 'primary' && isCompoundProduct(item)) return 3;
  return 0;
}

export function validateCompoundStockQuantity(
  quantity: number,
  stockUoM: 'primary' | 'secondary' | 'tertiary',
  primaryUnit: string,
  secondaryUnit: string,
  conversionRatio: string,
  tertiaryUnit?: string,
  tertiaryConversionRatio?: string
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(quantity) || quantity < 0) return { ok: false, message: 'Invalid quantity.' };
  const item: CompoundCartItem = {
    selectedUoM: stockUoM,
    primaryUnit,
    secondaryUnit,
    conversionRatio,
    tertiaryUnit,
    tertiaryConversionRatio,
  };
  if (quantity === 0) return { ok: true };
  return validateCompoundCartQuantity(quantity, item);
}
