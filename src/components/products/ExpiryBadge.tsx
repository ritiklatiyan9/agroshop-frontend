import { Badge } from '@/components/ui/badge';

interface Props {
  date: string | null | undefined;
}

export function ExpiryBadge({ date }: Props) {
  if (!date) return <span className="text-slate-400 text-xs">—</span>;
  const exp = new Date(date);
  const today = new Date();
  const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  const formatted = exp.toLocaleDateString('en-IN');

  if (days < 0) return <Badge variant="danger">Expired · {formatted}</Badge>;
  if (days <= 30) return <Badge variant="danger">{formatted} ({days}d)</Badge>;
  if (days <= 60) return <Badge variant="warning">{formatted} ({days}d)</Badge>;
  return <Badge variant="outline">{formatted}</Badge>;
}
