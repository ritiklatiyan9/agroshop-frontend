const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function threeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(ONES[h] + ' Hundred');
  if (r) parts.push(twoDigit(r));
  return parts.join(' ');
}

export function inrInWords(num: number): string {
  if (num < 0) return 'Minus ' + inrInWords(-num);
  if (num === 0) return 'Rupees Zero Only';

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  const segments: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remaining = rupees % 1000;

  if (crore) segments.push((crore < 100 ? twoDigit(crore) : threeDigit(crore)) + ' Crore');
  if (lakh) segments.push(twoDigit(lakh) + ' Lakh');
  if (thousand) segments.push(twoDigit(thousand) + ' Thousand');
  if (remaining) segments.push(threeDigit(remaining));

  let result = 'Rupees ' + (segments.length ? segments.join(' ') : 'Zero');
  if (paise) result += ' and ' + twoDigit(paise) + ' Paise';
  return result + ' Only';
}
