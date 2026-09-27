/** The brand is the name used on bills and purchase documents. */
export function getProductDisplayName(product?: { name: string; brand?: string | null } | null): string {
  return product?.brand?.trim() || product?.name || '—';
}
