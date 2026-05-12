import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Receipt,
  FileText,
  History,
  Truck,
  Warehouse,
  Users,
  Wallet,
  BarChart3,
  FileSpreadsheet,
  PackageSearch,
  Settings,
  Database,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Products', to: '/products', icon: Package },
      { label: 'Categories', to: '/categories', icon: Tags },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'New Bill (GST)', to: '/bills/new-gst', icon: Receipt },
      { label: 'New Bill (Non-GST)', to: '/bills/new', icon: FileText },
      { label: 'Bill History', to: '/bills', icon: History },
      { label: 'Stock IN (Purchase)', to: '/purchases', icon: Truck },
      { label: 'Inventory', to: '/inventory', icon: Warehouse },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { label: 'Parties', to: '/parties', icon: Users },
      { label: 'Outstanding', to: '/outstanding', icon: Wallet },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales Report', to: '/reports/sales', icon: BarChart3 },
      { label: 'Purchase Report', to: '/reports/purchases', icon: BarChart3 },
      { label: 'Outstanding Report', to: '/reports/outstanding', icon: Wallet },
      { label: 'GST Report', to: '/reports/gst', icon: FileSpreadsheet },
      { label: 'Stock Report', to: '/reports/stock', icon: PackageSearch },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Supervisors', to: '/admin/supervisors', icon: UserCog, roles: ['owner'] },
      { label: 'Shop Profile', to: '/settings/shop', icon: Settings, roles: ['owner'] },
      { label: 'Bill Settings', to: '/settings/bill', icon: Receipt, roles: ['owner'] },
      { label: 'Backup', to: '/settings/backup', icon: Database, roles: ['owner'] },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role) ?? 'supervisor';

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
          A
        </div>
        <span className="text-base font-semibold text-slate-900">AgroShop</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        {visibleGroups.map((group) => (
          <div key={group.label} className="px-3 pb-4">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
