import { PurchaseEditor } from './PurchaseEditor';
export function EditPurchaseDialog({ purchaseId, open, onOpenChange }: { purchaseId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) { return <PurchaseEditor purchaseId={purchaseId} open={open} onOpenChange={onOpenChange} />; }
