import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, User as UserIcon, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, refreshToken } = useAuthStore();

  async function handleLogout() {
    try {
      if (refreshToken) await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch {
      /* ignore */
    }
    logout();
    navigate('/login', { replace: true });
  }

  const initials = (user?.name || user?.email || 'A')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {user?.logo_url ? (
            <img src={user.logo_url} alt="Shop logo" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 font-semibold">
              {user?.shop_name?.[0]?.toUpperCase() || 'A'}
            </div>
          )}
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              {user?.shop_name || 'AgroShop Manager'}
            </div>
            {user?.shop_gstin && (
              <div className="text-[11px] text-slate-500">GSTIN: {user.shop_gstin}</div>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-50 transition-colors">
            <Avatar className="h-9 w-9">
              {user?.logo_url && <AvatarImage src={user.logo_url} alt={user.name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left md:block">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-slate-900">{user?.name}</div>
                {user?.role && (
                  <Badge variant={user.role === 'owner' ? 'success' : 'info'}>{user.role}</Badge>
                )}
              </div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user?.role === 'owner' && (
            <>
              <DropdownMenuItem onClick={() => navigate('/settings/shop')}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/shop')}>
                <Settings className="mr-2 h-4 w-4" />
                Shop settings
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
