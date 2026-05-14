import { NavLink } from 'react-router-dom';
import { FileText, HomeIcon, MoreHorizontal, Receipt, Users, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onMoreClick: () => void;
}

const NAV_ITEMS = [
  { label: 'GST Bill', to: '/bills/new-gst', icon: Receipt },
  { label: 'Inventory', to: '/inventory', icon: Warehouse },
  { label: 'Home', to: '/dashboard', icon: HomeIcon },
  
  { label: 'Parties', to: '/parties', icon: Users },
] as const;

export function MobileBottomNav({ onMoreClick }: Props) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white flex h-16 items-stretch">
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-emerald-600' : 'text-slate-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 inset-x-3 h-0.5 rounded-b-full bg-emerald-500" />
              )}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                  isActive ? 'bg-emerald-50' : '',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={onMoreClick}
        className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl">
          <MoreHorizontal className="h-5 w-5" />
        </div>
        <span>More</span>
      </button>
    </nav>
  );
}
