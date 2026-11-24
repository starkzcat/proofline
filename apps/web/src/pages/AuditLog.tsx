import { useState } from 'react';
import { useAuditLogs } from '../api/queries.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { Input } from '../components/ui/input.js';
import { History, Search } from 'lucide-react';

export function AuditLogPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAuditLogs({ limit: 50 });

  const logs = data?.logs || [];
  const filteredLogs = search.trim()
    ? logs.filter(
        (log) =>
          log.actor.name.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          log.campaign?.name.toLowerCase().includes(search.toLowerCase()) ||
          log.asset?.title.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            System Audit Log
          </h1>
          <p className="text-xs text-slate-500">
            Immutable chronological record of approvals, uploads, and status transitions.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            placeholder="Filter audit events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <History className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">No audit events</p>
              <p className="text-xs text-slate-500">
                System activities will be logged here automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">TIMESTAMP</th>
                  <th className="py-2.5 px-4 font-medium">ACTOR</th>
                  <th className="py-2.5 px-4 font-medium">ACTION</th>
                  <th className="py-2.5 px-4 font-medium">TARGET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{log.actor.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          ({log.actor.role})
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 inline-block">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.asset?.title ? (
                        <span>Asset: {log.asset.title}</span>
                      ) : log.campaign?.name ? (
                        <span>Campaign: {log.campaign.name}</span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
