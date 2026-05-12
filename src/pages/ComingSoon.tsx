import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <PageHeader title={title} />
      <Card>
        <CardContent className="p-12 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <Construction className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Coming in a later phase</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            This module will be built in Phase 2 (billing, parties, outstanding) or Phase 3 (reports,
            backup). Phase 1 ships auth, products, and inventory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
