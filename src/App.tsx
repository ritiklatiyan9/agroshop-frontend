import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GuestRoute } from '@/components/auth/GuestRoute';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { DashboardPage } from '@/pages/Dashboard';
import { ProductsPage } from '@/pages/Products';
import { InventoryPage } from '@/pages/Inventory';
import { ShopProfilePage } from '@/pages/ShopProfile';
import { BillSettingsPage } from '@/pages/BillSettings';
import { BackupPage } from '@/pages/Backup';
import { SupervisorsPage } from '@/pages/Supervisors';
import { PermissionsPage } from '@/pages/Permissions';
import { NewBillPage } from '@/pages/NewBill';
import { BillHistoryPage } from '@/pages/BillHistory';
import { BillPrintPage } from '@/pages/BillPrint';
import { OutstandingPage } from '@/pages/Outstanding';
import { CategoriesPage } from '@/pages/Categories';
import { PartiesPage } from '@/pages/Parties';
import { PartyLedgerPage } from '@/pages/PartyLedger';
import { SalesReportPage } from '@/pages/reports/SalesReport';
import { GstReportPage } from '@/pages/reports/GstReport';
import { StockReportPage } from '@/pages/reports/StockReport';
import { PurchaseReportPage } from '@/pages/reports/PurchaseReport';
import { OutstandingReportPage } from '@/pages/reports/OutstandingReport';
import { PurchasesPage } from '@/pages/Purchases';
import { useCapacitorApp } from '@/hooks/useCapacitorApp';

function CapacitorInit() {
  useCapacitorApp();
  return null;
}

export default function App() {
  return (
    <>
      <CapacitorInit />
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        <Route path="/bills/print/:id" element={<ProtectedRoute><BillPrintPage /></ProtectedRoute>} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />

          <Route path="/bills" element={<BillHistoryPage />} />
          <Route path="/bills/new-gst" element={<NewBillPage billType="gst" />} />
          <Route path="/bills/new" element={<NewBillPage billType="non_gst" />} />
          <Route path="/outstanding" element={<OutstandingPage />} />

          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/parties/:id/ledger" element={<PartyLedgerPage />} />

          <Route path="/reports/sales" element={<SalesReportPage />} />
          <Route path="/reports/gst" element={<GstReportPage />} />
          <Route path="/reports/stock" element={<StockReportPage />} />
          <Route path="/reports/purchases" element={<PurchaseReportPage />} />
          <Route path="/reports/outstanding" element={<OutstandingReportPage />} />

          <Route path="/settings/shop" element={<RoleRoute allow={['owner']}><ShopProfilePage /></RoleRoute>} />
          <Route path="/admin/supervisors" element={<RoleRoute allow={['owner']}><SupervisorsPage /></RoleRoute>} />
          <Route path="/admin/permissions" element={<RoleRoute allow={['owner']}><PermissionsPage /></RoleRoute>} />
          <Route path="/settings/bill" element={<RoleRoute allow={['owner']}><BillSettingsPage /></RoleRoute>} />
          <Route path="/settings/backup" element={<RoleRoute allow={['owner']}><BackupPage /></RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
