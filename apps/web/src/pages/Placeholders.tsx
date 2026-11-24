import { useAuth } from '../context/AuthContext.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { FolderKanban, Plus } from 'lucide-react';
import { hasPermission } from '@proofline/shared';

export function CampaignsPage() {
  const { user } = useAuth();
  const canCreate = user ? hasPermission(user.role, 'campaign:create') : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Campaigns
          </h1>
          <p className="text-xs text-slate-500">
            Manage creative campaigns, versioned assets, and approval workflows.
          </p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>New Campaign</span>
          </Button>
        )}
      </div>

      {/* Placeholder campaigns grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="hover:border-slate-300 transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm">Q4 Holiday Paid Social</CardTitle>
              <Badge status="ACTIVE" />
            </div>
            <CardDescription className="line-clamp-2">
              Holiday promotional creative assets for Instagram and TikTok.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 font-mono">
            4 assets · 2 pending review
          </CardContent>
        </Card>

        {user?.role !== 'CLIENT' && (
          <Card className="hover:border-slate-300 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">Internal Brand Refresh</CardTitle>
                <Badge status="ACTIVE" />
              </div>
              <CardDescription className="line-clamp-2">
                Agency brand identity guidelines, brand book and logos.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-slate-500 font-mono">
              2 assets · 0 pending review
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export function PendingReviewPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Pending Review
        </h1>
        <p className="text-xs text-slate-500">
          Creative assets awaiting review and approval decisions.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
            <FolderKanban className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-slate-800">
            Phase 6 Review Workspace
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Full side-by-side asset compare, image/PDF stage, and pinned comments will arrive in Phase 6.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditLogPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Audit Log
        </h1>
        <p className="text-xs text-slate-500">
          Immutable system log of all campaign, asset, and approval actions.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
            <FolderKanban className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-slate-800">
            Audit Trail Explorer
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Full chronological audit explorer with filters will be enabled in Phase 6.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
