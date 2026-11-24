import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  useAsset,
  useSubmitAsset,
  useApproveAsset,
  useAddComment,
} from '../api/queries.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { UploadAssetModal } from '../components/assets/UploadAssetModal.js';
import { RequestChangesModal } from '../components/assets/RequestChangesModal.js';
import {
  CheckCircle2,
  XCircle,
  UploadCloud,
  Send,
  Columns,
  Maximize2,
  Minimize2,
  Download,
  ArrowLeft,
  FileText,
  User as UserIcon,
} from 'lucide-react';

export function AssetReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data, isLoading, error } = useAsset(id || '');
  const asset = data?.asset;

  // State
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  const [compareVersionNum, setCompareVersionNum] = useState<number | null>(null);
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [zoomFit, setZoomFit] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRequestChangesOpen, setIsRequestChangesOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Mutations
  const submitMutation = useSubmitAsset(asset?.id || '');
  const approveMutation = useApproveAsset(asset?.id || '');

  // Active version calculation
  const versions = asset?.versions || [];
  const latestVersion = versions[0];
  const activeVersion =
    versions.find((v) => v.versionNumber === selectedVersionNum) || latestVersion;
  const compareVersion =
    versions.find((v) => v.versionNumber === compareVersionNum) || versions[1] || latestVersion;

  const addCommentMutation = useAddComment(
    activeVersion?.id || '',
    asset?.id || ''
  );

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Skeleton className="lg:col-span-8 h-full rounded-lg" />
        <Skeleton className="lg:col-span-4 h-full rounded-lg" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-medium text-slate-800">Asset not found</p>
        <p className="text-xs text-slate-500">
          The requested asset does not exist or you do not have permission to view it.
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

  const role = user?.role;
  const status = asset.status;

  // Actions availability
  const canSubmit = (role === 'ADMIN' || role === 'MARKETER') && status === 'DRAFT';
  const canUploadVersion =
    (role === 'ADMIN' || role === 'MARKETER') &&
    (status === 'CHANGES_REQUESTED' || status === 'IN_REVIEW' || status === 'DRAFT');
  const canDecide = (role === 'ADMIN' || role === 'CLIENT') && status === 'IN_REVIEW';

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeVersion) return;
    try {
      await addCommentMutation.mutateAsync({ content: commentText.trim() });
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const renderStageContent = (ver?: typeof activeVersion) => {
    if (!ver) return null;
    const isPdf = ver.mimeType === 'application/pdf';

    return (
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-white rounded border border-slate-200">
            <FileText className="w-12 h-12 text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-900 mb-1">{ver.fileName}</p>
            <p className="text-[11px] font-mono text-slate-500 mb-4">
              {(ver.fileSizeBytes / 1024 / 1024).toFixed(2)} MB · PDF
            </p>
            <a
              href={ver.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 underline hover:text-black"
            >
              <Download className="w-3.5 h-3.5" />
              Open PDF Document
            </a>
          </div>
        ) : (
          <img
            src={ver.fileUrl}
            alt={asset.title}
            className={`transition-all select-none ${
              zoomFit
                ? 'max-h-full max-w-full object-contain'
                : 'max-h-none max-w-none object-none'
            }`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Asset Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/campaigns" className="hover:text-slate-900">
              Campaigns
            </Link>
            <span>/</span>
            <Link to={`/campaigns/${asset.campaign.id}`} className="hover:text-slate-900">
              {asset.campaign.name}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">{asset.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              {asset.title}
            </h1>
            <Badge status={asset.status} />
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canSubmit && (
            <Button
              size="sm"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </Button>
          )}

          {canUploadVersion && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsUploadOpen(true)}
              className="gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload New Version</span>
            </Button>
          )}

          {canDecide && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsRequestChangesOpen(true)}
                className="gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Request Changes</span>
              </Button>
              <Button
                size="sm"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Asset</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Split-pane Workspace Layout (65% / 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)] min-h-[580px]">
        {/* Left Pane (Creative Stage - 65%) */}
        <div className="lg:col-span-8 flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden">
          {/* Toolbar */}
          <div className="h-11 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {/* Primary version selector */}
              <div className="flex items-center gap-1">
                <span className="font-mono text-slate-500 text-[11px]">Viewing:</span>
                <select
                  value={activeVersion?.versionNumber}
                  onChange={(e) => setSelectedVersionNum(Number(e.target.value))}
                  className="h-7 text-xs font-mono font-medium rounded border border-slate-200 bg-white px-2 focus:outline-none"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.versionNumber}>
                      v{v.versionNumber} {v.versionNumber === asset.currentVersion ? '(Latest)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compare toggle */}
              {versions.length > 1 && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <Button
                    size="sm"
                    variant={isSideBySide ? 'secondary' : 'ghost'}
                    onClick={() => {
                      if (!isSideBySide && !compareVersionNum) {
                        const otherVer = versions.find(
                          (v) => v.versionNumber !== activeVersion?.versionNumber
                        );
                        if (otherVer) setCompareVersionNum(otherVer.versionNumber);
                      }
                      setIsSideBySide(!isSideBySide);
                    }}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </Button>

                  {isSideBySide && (
                    <select
                      value={compareVersion?.versionNumber}
                      onChange={(e) => setCompareVersionNum(Number(e.target.value))}
                      className="h-7 text-xs font-mono font-medium rounded border border-slate-200 bg-white px-2 focus:outline-none"
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.versionNumber}>
                          compare with v{v.versionNumber}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Stage controls */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomFit(!zoomFit)}
                title={zoomFit ? '100% Zoom' : 'Fit to screen'}
                className="h-7 w-7 text-slate-500"
              >
                {zoomFit ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </Button>

              {activeVersion?.fileUrl && (
                <a
                  href={activeVersion.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={activeVersion.fileName}
                  className="h-7 w-7 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Canvas with subtle checkerboard */}
          <div
            className="flex-1 overflow-auto relative"
            style={{
              backgroundColor: '#fafafa',
              backgroundImage:
                'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }}
          >
            {isSideBySide && versions.length > 1 ? (
              <div className="grid grid-cols-2 h-full divide-x divide-slate-200">
                <div className="flex flex-col h-full">
                  <div className="bg-white/90 backdrop-blur-none border-b border-slate-200 px-3 py-1 text-[11px] font-mono text-slate-600 flex justify-between">
                    <span>v{activeVersion?.versionNumber}</span>
                    <span className="truncate max-w-[120px]">{activeVersion?.fileName}</span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {renderStageContent(activeVersion)}
                  </div>
                </div>

                <div className="flex flex-col h-full">
                  <div className="bg-white/90 backdrop-blur-none border-b border-slate-200 px-3 py-1 text-[11px] font-mono text-slate-600 flex justify-between">
                    <span>v{compareVersion?.versionNumber}</span>
                    <span className="truncate max-w-[120px]">{compareVersion?.fileName}</span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {renderStageContent(compareVersion)}
                  </div>
                </div>
              </div>
            ) : (
              renderStageContent(activeVersion)
            )}
          </div>
        </div>

        {/* Right Pane (Review & Activity Panel - 35%) */}
        <div className="lg:col-span-4 flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden">
          <Tabs defaultValue="comments" className="flex-1 flex flex-col">
            {/* Header Tabs */}
            <div className="border-b border-slate-200 px-3 pt-2 bg-slate-50">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="comments" className="text-xs">
                  Comments (v{activeVersion?.versionNumber})
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  Activity Log
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Comments Tab: Strictly filtered to active version */}
            <TabsContent value="comments" className="flex-1 flex flex-col p-0 m-0">
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {activeVersion?.changeNotes && (
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900 font-mono block mb-0.5 text-[11px]">
                      Version Notes (v{activeVersion.versionNumber}):
                    </span>
                    {activeVersion.changeNotes}
                  </div>
                )}

                {activeVersion?.comments?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No comments on version {activeVersion.versionNumber} yet.
                  </div>
                ) : (
                  activeVersion?.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border border-slate-200 rounded-md p-2.5 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          <span>{comment.author.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            ({comment.author.role})
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                          {new Date(comment.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Composer */}
              <form
                onSubmit={handleAddComment}
                className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Comment on v${activeVersion?.versionNumber}...`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="h-8 px-2.5"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </TabsContent>

            {/* Activity Log Tab */}
            <TabsContent value="activity" className="flex-1 p-3 overflow-y-auto space-y-2.5 m-0">
              {asset.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs border-l-2 border-slate-300 pl-2.5 py-0.5 space-y-0.5"
                >
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium text-slate-900">
                      {log.actor.name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700">
                    {log.action.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Upload New Version Modal */}
      <UploadAssetModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        campaignId={asset.campaign.id}
        assetId={asset.id}
        currentVersion={asset.currentVersion}
      />

      {/* Request Changes Modal */}
      <RequestChangesModal
        open={isRequestChangesOpen}
        onOpenChange={setIsRequestChangesOpen}
        assetId={asset.id}
      />
    </div>
  );
}
