import { Badge } from '@/components/ui/badge';

interface Props {
  current: string | number;
  min: string | number;
}

export function LowStockBadge({ current, min }: Props) {
  const c = Number(current);
  const m = Number(min);
  if (Number.isNaN(c) || Number.isNaN(m)) return null;
  if (c <= 0) return <Badge variant="danger">Out of stock</Badge>;
  if (c <= m) return <Badge variant="danger">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}
