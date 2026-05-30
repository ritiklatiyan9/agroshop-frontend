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
  Shield,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { ShopSwitcher } from './ShopSwitcher';
import type { Role, ModuleKey } from '@/types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  module?: ModuleKey;
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
      { label: 'Products', to: '/products', icon: Package, module: 'products' },
      { label: 'Categories', to: '/categories', icon: Tags, module: 'categories' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'New Bill (GST)', to: '/bills/new-gst', icon: Receipt, module: 'bills_gst' },
      { label: 'New Bill (Non-GST)', to: '/bills/new', icon: FileText, module: 'bills_nongst' },
      { label: 'Bill History', to: '/bills', icon: History, module: 'bills_history' },
      { label: 'Stock IN (Purchase)', to: '/purchases', icon: Truck, module: 'purchases' },
      { label: 'Inventory', to: '/inventory', icon: Warehouse, module: 'inventory' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { label: 'Parties', to: '/parties', icon: Users, module: 'parties' },
      { label: 'Outstanding', to: '/outstanding', icon: Wallet, module: 'outstanding' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales Report', to: '/reports/sales', icon: BarChart3, module: 'reports_sales' },
      { label: 'Purchase Report', to: '/reports/purchases', icon: BarChart3, module: 'reports_purchases' },
      { label: 'Outstanding Report', to: '/reports/outstanding', icon: Wallet, module: 'reports_outstanding' },
      { label: 'GST Report', to: '/reports/gst', icon: FileSpreadsheet, module: 'reports_gst' },
      { label: 'Stock Report', to: '/reports/stock', icon: PackageSearch, module: 'reports_stock' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Shop Management', to: '/admin/shops', icon: Store, roles: ['owner'] },
      { label: 'Supervisors', to: '/admin/supervisors', icon: UserCog, roles: ['owner'] },
      { label: 'Permissions', to: '/admin/permissions', icon: Shield, roles: ['owner'] },
      { label: 'Shop Profile', to: '/settings/shop', icon: Settings, roles: ['owner'] },
      { label: 'Bill Settings', to: '/settings/bill', icon: Receipt, roles: ['owner'] },
      { label: 'Backup', to: '/settings/backup', icon: Database, roles: ['owner'] },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role) ?? 'supervisor';
  const permissions = useAuthStore((s) => s.permissions);

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.roles && !item.roles.includes(role)) return false;
        if (role === 'supervisor' && item.module) {
          const perm = permissions?.find((p) => p.module === item.module);
          return perm?.visible === true;
        }
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      <ShopSwitcher onNavigate={onNavigate} />
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
