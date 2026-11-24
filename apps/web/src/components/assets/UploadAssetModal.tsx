import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { useCreateAsset, useUploadNewVersion, uploadFileToPresignedUrl } from '../../api/queries.js';
import { UploadCloud, Loader2 } from 'lucide-react';

const assetUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  changeNotes: z.string().max(500).optional(),
});

type AssetUploadFormData = z.infer<typeof assetUploadSchema>;

interface UploadAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  assetId?: string; // If present, uploading a new version; if omitted, creating new asset
  currentVersion?: number;
}

export function UploadAssetModal({
  open,
  onOpenChange,
  campaignId,
  assetId,
  currentVersion,
}: UploadAssetModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createAssetMutation = useCreateAsset(campaignId);
  const uploadVersionMutation = useUploadNewVersion(assetId || '');

  const isNewVersion = Boolean(assetId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetUploadFormData>({
    resolver: zodResolver(assetUploadSchema),
    defaultValues: {
      title: isNewVersion ? 'Version Update' : '',
      description: '',
      changeNotes: '',
    },
  });

  const handleClose = () => {
    reset();
    setFile(null);
    setErrorMsg(null);
    onOpenChange(false);
  };

  const onSubmit = async (formData: AssetUploadFormData) => {
    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg(null);

      // Upload file directly to S3 / Cloudflare R2
      const uploaded = await uploadFileToPresignedUrl(file);

      if (isNewVersion && assetId) {
        await uploadVersionMutation.mutateAsync({
          fileName: uploaded.fileName,
          fileKey: uploaded.fileKey,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSizeBytes: uploaded.fileSizeBytes,
          changeNotes: formData.changeNotes,
        });
      } else {
        await createAssetMutation.mutateAsync({
          title: formData.title,
          description: formData.description,
          fileName: uploaded.fileName,
          fileKey: uploaded.fileKey,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSizeBytes: uploaded.fileSizeBytes,
          changeNotes: formData.changeNotes,
        });
      }

      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isNewVersion
              ? `Upload Version ${Number(currentVersion || 1) + 1}`
              : 'Upload New Creative Asset'}
          </DialogTitle>
          <DialogDescription>
            {isNewVersion
              ? 'Upload an iteration (PNG, JPG, WebP, or PDF) to address client feedback.'
              : 'Select a creative file to start the review workflow.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">File</label>
            <div className="border border-dashed border-slate-300 rounded-md p-4 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) setFile(selected);
                }}
              />
              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" strokeWidth={1.5} />
              {file ? (
                <div className="text-xs">
                  <span className="font-medium text-slate-900">{file.name}</span>
                  <span className="font-mono text-slate-500 block text-[11px]">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-600">
                  <span className="font-medium text-slate-900">Click to select file</span> or drag & drop
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    PNG, JPG, WebP, or PDF (up to 50MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isNewVersion && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700" htmlFor="title">
                Asset Title
              </label>
              <Input
                id="title"
                placeholder="e.g. Hero Banner 1200x628"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-[11px] text-rose-600">{errors.title.message}</p>
              )}
            </div>
          )}

          {!isNewVersion && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700" htmlFor="description">
                Description (Optional)
              </label>
              <Input
                id="description"
                placeholder="Context or placement details"
                {...register('description')}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="changeNotes">
              {isNewVersion ? 'Change Notes' : 'Initial Version Notes (Optional)'}
            </label>
            <Input
              id="changeNotes"
              placeholder={isNewVersion ? 'e.g. Fixed CTA button contrast' : 'Initial export from Figma'}
              {...register('changeNotes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !file}>
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Uploading...
                </>
              ) : isNewVersion ? (
                'Upload Version'
              ) : (
                'Create Asset'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
