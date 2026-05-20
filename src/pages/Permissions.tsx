import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shield, Loader2, Info } from 'lucide-react';
import { api } from '@/lib/axios';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModulePermission, Supervisor } from '@/types';

const MODULES_CONFIG = [
  { key: 'products',             label: 'Products',              group: 'Catalogue'   },
  { key: 'categories',           label: 'Categories',            group: 'Catalogue'   },
  { key: 'bills_gst',            label: 'New Bill (GST)',         group: 'Operations'  },
  { key: 'bills_nongst',         label: 'New Bill (Non-GST)',     group: 'Operations'  },
  { key: 'bills_history',        label: 'Bill History',          group: 'Operations'  },
  { key: 'purchases',            label: 'Stock IN (Purchase)',   group: 'Operations'  },
  { key: 'inventory',            label: 'Inventory',             group: 'Operations'  },
  { key: 'parties',              label: 'Parties',               group: 'Accounts'    },
  { key: 'outstanding',          label: 'Outstanding',           group: 'Accounts'    },
  { key: 'reports_sales',        label: 'Sales Report',          group: 'Reports'     },
  { key: 'reports_purchases',    label: 'Purchase Report',       group: 'Reports'     },
  { key: 'reports_outstanding',  label: 'Outstanding Report',    group: 'Reports'     },
  { key: 'reports_gst',          label: 'GST Report',            group: 'Reports'     },
  { key: 'reports_stock',        label: 'Stock Report',          group: 'Reports'     },
] as const;

const GROUP_ORDER = ['Catalogue', 'Operations', 'Accounts', 'Reports'];

export function PermissionsPage() {
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [localPerms, setLocalPerms] = useState<ModulePermission[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();

  const { data: supervisors = [], isLoading: supervisorsLoading } = useQuery({
    queryKey: ['supervisors'],
    queryFn: async () => {
      const res = await api.get<{ data: Supervisor[] }>('/users/supervisors');
      return res.data.data;
    },
  });

  const { isLoading: permsLoading } = useQuery({
    queryKey: ['supervisor-permissions', selectedSupervisorId],
    queryFn: async () => {
      const res = await api.get<{ data: ModulePermission[] }>(
        `/users/supervisors/${selectedSupervisorId}/permissions`,
      );
      setLocalPerms(res.data.data);
      setIsDirty(false);
      return res.data.data;
    },
    enabled: !!selectedSupervisorId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/users/supervisors/${selectedSupervisorId}/permissions`, {
        permissions: localPerms,
      });
    },
    onSuccess: () => {
      toast.success('Permissions saved');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['supervisor-permissions', selectedSupervisorId] });
    },
    onError: () => toast.error('Failed to save permissions'),
  });

  function handleSupervisorChange(id: string) {
    setSelectedSupervisorId(id);
    setLocalPerms(null);
    setIsDirty(false);
  }

  function togglePerm(
    moduleKey: string,
    field: 'visible' | 'can_edit' | 'can_delete',
    value: boolean,
  ) {
    setLocalPerms((prev) => {
      if (!prev) return prev;
      return prev.map((p) => {
        if (p.module !== moduleKey) return p;
        const updated = { ...p, [field]: value };
        if (field === 'visible' && !value) {
          updated.can_edit = false;
          updated.can_delete = false;
        }
        if ((field === 'can_edit' || field === 'can_delete') && value) {
          updated.visible = true;
        }
        return updated;
      });
    });
    setIsDirty(true);
  }

  function toggleGroupVisible(group: string, value: boolean) {
    setLocalPerms((prev) => {
      if (!prev) return prev;
      const groupKeys = MODULES_CONFIG.filter((m) => m.group === group).map((m) => m.key);
      return prev.map((p) => {
        if (!groupKeys.includes(p.module as typeof groupKeys[number])) return p;
        return value
          ? { ...p, visible: true }
          : { ...p, visible: false, can_edit: false, can_delete: false };
      });
    });
    setIsDirty(true);
  }

  const selectedSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);
  const activeSupervisors = supervisors.filter((s) => s.is_active);

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: MODULES_CONFIG.filter((m) => m.group === group),
  }));

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Permissions"
          description="Control which sidebar items each supervisor can access and what actions they can perform."
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 md:p-6 flex flex-col h-full overflow-hidden gap-5">

          {/* Supervisor selector */}
          <div className="flex-shrink-0 flex flex-wrap items-center gap-3">
            <div className="w-64">
              <Select
                value={selectedSupervisorId ?? ''}
                onValueChange={handleSupervisorChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={supervisorsLoading ? 'Loading…' : 'Select a supervisor'} />
                </SelectTrigger>
                <SelectContent>
                  {activeSupervisors.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">No active supervisors</div>
                  ) : (
                    activeSupervisors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedSupervisor && (
              <Badge variant="outline" className="text-slate-500">
                {selectedSupervisor.email}
              </Badge>
            )}
          </div>

          {/* Empty state */}
          {!selectedSupervisorId && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Shield className="h-14 w-14 mx-auto mb-3 opacity-15" />
                <p className="text-sm font-medium">Select a supervisor to manage their permissions</p>
                <p className="text-xs mt-1">By default supervisors have no access to any module.</p>
              </div>
            </div>
          )}

          {/* Permission matrix */}
          {selectedSupervisorId && (
            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
              {permsLoading || !localPerms ? (
                <div className="space-y-2">
                  {[...Array(14)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Info banner */}
                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 flex-shrink-0">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Visible</strong> shows the item in the supervisor's sidebar.{' '}
                      <strong>Can Edit</strong> allows creating &amp; modifying records.{' '}
                      <strong>Can Delete</strong> allows removing records. Edit/Delete require Visible to be enabled.
                    </span>
                  </div>

                  {/* Groups */}
                  <div className="space-y-4 pb-2">
                    {grouped.map(({ group, items }) => {
                      const groupPerms = items.map((m) =>
                        localPerms.find((p) => p.module === m.key),
                      );
                      const allVisible = groupPerms.every((p) => p?.visible);

                      return (
                        <div key={group} className="rounded-lg border border-slate-200 overflow-hidden">
                          {/* Group header */}
                          <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {group}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleGroupVisible(group, !allVisible)}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              {allVisible ? 'Hide all' : 'Show all'}
                            </button>
                          </div>

                          {/* Column headers (only on first group) */}
                          {group === GROUP_ORDER[0] && (
                            <div className="grid grid-cols-[1fr_100px_100px_100px] bg-white border-b border-slate-100 px-4 py-2">
                              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Item</div>
                              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center">Visible</div>
                              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center">Can Edit</div>
                              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center">Can Delete</div>
                            </div>
                          )}

                          {/* Rows */}
                          <div className="divide-y divide-slate-100">
                            {items.map((mod) => {
                              const perm = localPerms.find((p) => p.module === mod.key);
                              if (!perm) return null;
                              return (
                                <div
                                  key={mod.key}
                                  className={`grid grid-cols-[1fr_100px_100px_100px] items-center px-4 py-3 transition-colors ${
                                    perm.visible ? 'bg-white hover:bg-emerald-50/30' : 'bg-slate-50/40'
                                  }`}
                                >
                                  <div className="font-medium text-slate-800 text-sm">{mod.label}</div>
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={perm.visible}
                                      onCheckedChange={(v) => togglePerm(mod.key, 'visible', v)}
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={perm.can_edit}
                                      onCheckedChange={(v) => togglePerm(mod.key, 'can_edit', v)}
                                      disabled={!perm.visible}
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={perm.can_delete}
                                      onCheckedChange={(v) => togglePerm(mod.key, 'can_delete', v)}
                                      disabled={!perm.visible}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end flex-shrink-0">
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending || !isDirty}
                    >
                      {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isDirty ? 'Save permissions' : 'No changes'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
