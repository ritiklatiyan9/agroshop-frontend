import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
