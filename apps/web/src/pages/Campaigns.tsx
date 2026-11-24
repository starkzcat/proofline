import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useCampaigns } from '../api/queries.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { CreateCampaignModal } from '../components/campaigns/CreateCampaignModal.js';
import { Plus, Search, FolderKanban } from 'lucide-react';
import { hasPermission } from '@proofline/shared';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;

export function CampaignsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canCreate = user ? hasPermission(user.role, 'campaign:create') : false;

  const { data, isLoading } = useCampaigns({
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    search: search.trim() || undefined,
  });

  const campaigns = data?.campaigns || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Campaigns
          </h1>
          <p className="text-xs text-slate-500">
            Active creative workspaces, versioned asset reviews, and client sign-offs.
          </p>
        </div>
        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>New Campaign</span>
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Status Pills */}
        <div className="inline-flex rounded-md bg-slate-100 p-0.5 text-slate-600">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedStatus(s)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none ${
                selectedStatus === s
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s === 'ALL' ? 'All Campaigns' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            placeholder="Search campaigns or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <FolderKanban className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">No campaigns found</p>
              <p className="text-xs text-slate-500">
                {search ? 'Try adjusting your search query or filters.' : 'Create your first campaign to get started.'}
              </p>
            </div>
            {canCreate && !search && (
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 mt-2">
                <Plus className="w-3.5 h-3.5" />
                <span>Create Campaign</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {campaigns.map((camp) => {
            const inReviewCount = camp.assets.filter((a) => a.status === 'IN_REVIEW').length;
            const approvedCount = camp.assets.filter((a) => a.status === 'APPROVED').length;

            return (
              <Link
                key={camp.id}
                to={`/campaigns/${camp.id}`}
                className="group block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-black line-clamp-1">
                    {camp.name}
                  </h3>
                  <Badge status={camp.status} />
                </div>

                <div className="text-xs text-slate-500 mb-4">
                  Client: <span className="font-medium text-slate-700">{camp.clientName}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>
                    {approvedCount} Approved · {inReviewCount} In Review
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {new Date(camp.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CreateCampaignModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
