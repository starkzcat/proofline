import { Link } from 'react-router-dom';
import { usePendingReviewAssets } from '../api/queries.js';
import { Badge } from '../components/ui/badge.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Clock, Image as ImageIcon, MessageSquare } from 'lucide-react';

export function PendingReviewPage() {
  const { data, isLoading } = usePendingReviewAssets();
  const assets = data?.assets || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Pending Review
          </h1>
          <p className="text-xs text-slate-500">
            Creative deliverables awaiting review and decision.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
              <Skeleton className="aspect-video w-full rounded" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Clock className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">All caught up!</p>
              <p className="text-xs text-slate-500">
                There are no assets currently awaiting review.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assets.map((asset) => {
            const isPdf = asset.latestVersion?.mimeType === 'application/pdf';

            return (
              <Link
                key={asset.id}
                to={`/assets/${asset.id}`}
                className="group block rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors"
              >
                {/* 16:9 Thumbnail Area */}
                <div className="aspect-video w-full bg-slate-100 border-b border-slate-200 relative flex items-center justify-center overflow-hidden">
                  {asset.latestVersion?.fileUrl && !isPdf ? (
                    <img
                      src={asset.latestVersion.fileUrl}
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

                {/* Details */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-xs font-semibold text-slate-900 group-hover:text-black line-clamp-1">
                      {asset.title}
                    </h3>
                    <Badge status={asset.status} />
                  </div>

                  <p className="text-xs text-slate-500 mb-3 truncate">
                    Campaign: <span className="font-medium text-slate-700">{asset.campaignName}</span>
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate max-w-[140px]">{asset.latestVersion?.fileName || 'Asset'}</span>
                    <div className="flex items-center gap-1 text-slate-400">
                      <MessageSquare className="w-3 h-3" />
                      <span>{asset.commentCount}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
