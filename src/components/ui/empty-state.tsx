import { cn } from '@/lib/utils';

interface Props {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-4',
        className,
      )}
    >
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
          <Icon className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
