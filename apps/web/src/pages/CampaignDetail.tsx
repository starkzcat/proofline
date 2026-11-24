import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useCampaign } from '../api/queries.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { Card, CardContent } from '../components/ui/card.js';
import { UploadAssetModal } from '../components/assets/UploadAssetModal.js';
import { Plus, Image as ImageIcon, MessageSquare, ArrowLeft } from 'lucide-react';
import { hasPermission } from '@proofline/shared';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data, isLoading, error } = useCampaign(id || '');
  const campaign = data?.campaign;

  const canUpload = user ? hasPermission(user.role, 'asset:create') : false;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-medium text-slate-800">Campaign not found</p>
        <p className="text-xs text-slate-500">
          The requested campaign either does not exist or you do not have permission to view it.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/campaigns">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Campaigns
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Details Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/campaigns" className="text-xs text-slate-500 hover:text-slate-900">
              Campaigns
            </Link>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs text-slate-900 font-medium">{campaign.name}</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {campaign.name}
            </h1>
            <Badge status={campaign.status} />
          </div>

          <p className="text-xs text-slate-500">
            Client: <span className="font-medium text-slate-700">{campaign.clientName}</span>
            {campaign.description && <span> · {campaign.description}</span>}
          </p>
        </div>

        {canUpload && (
          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Upload Asset</span>
          </Button>
        )}
      </div>

      {/* Assets Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Assets ({campaign.assets?.length || 0})
          </h2>
        </div>

        {(!campaign.assets || campaign.assets.length === 0) ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <ImageIcon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">No assets in this campaign</p>
                <p className="text-xs text-slate-500">
                  Upload creative deliverables (PNG, JPG, PDF) to start the review process.
                </p>
              </div>
              {canUpload && (
                <Button size="sm" onClick={() => setIsUploadOpen(true)} className="gap-1.5 mt-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Asset</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaign.assets.map((asset) => {
              const latestVersion = asset.versions?.[0];
              const commentCount = latestVersion?._count?.comments ?? 0;
              const isPdf = latestVersion?.mimeType === 'application/pdf';

              return (
                <Link
                  key={asset.id}
                  to={`/assets/${asset.id}`}
                  className="group block rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors"
                >
                  {/* 16:9 Thumbnail Area with subtle checkerboard */}
                  <div className="aspect-video w-full bg-slate-100 border-b border-slate-200 relative flex items-center justify-center overflow-hidden">
                    {latestVersion?.fileUrl && !isPdf ? (
                      <img
                        src={latestVersion.fileUrl}
                        alt={asset.title}
                        className="object-contain w-full h-full"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center p-3">
                        <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <span className="text-[11px] font-mono text-slate-500 uppercase">
                          {isPdf ? 'PDF Document' : 'Preview'}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="bg-zinc-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-medium">
                        v{asset.currentVersion}
                      </span>
                    </div>
                  </div>

                  {/* Asset Details */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xs font-semibold text-slate-900 group-hover:text-black line-clamp-1">
                        {asset.title}
                      </h3>
                      <Badge status={asset.status} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{latestVersion?.fileName || 'Asset'}</span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <MessageSquare className="w-3 h-3" />
                        <span>{commentCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadAssetModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        campaignId={campaign.id}
      />
    </div>
  );
}
