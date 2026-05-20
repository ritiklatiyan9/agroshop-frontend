import { Capacitor } from '@capacitor/core';

/**
 * Opens the bill print page.
 * - In Capacitor (Android app): navigates within the WebView so window.print() fires natively
 * - In browser: opens in a new tab
 */
export function openBillPrint(
  billId: string,
  navigate: (path: string) => void,
  closeSheet?: () => void,
) {
  if (closeSheet) closeSheet();
  if (Capacitor.isNativePlatform()) {
    navigate(`/bills/print/${billId}`);
  } else {
    window.open(`/bills/print/${billId}`, '_blank');
  }
}
