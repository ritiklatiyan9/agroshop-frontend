import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-60 max-w-[80vw]">
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
