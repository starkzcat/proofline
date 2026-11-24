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
import { useRequestChanges } from '../../api/queries.js';
import { Loader2 } from 'lucide-react';

const requestChangesSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(1000),
});

type RequestChangesFormData = z.infer<typeof requestChangesSchema>;

interface RequestChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
}

export function RequestChangesModal({
  open,
  onOpenChange,
  assetId,
}: RequestChangesModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const requestMutation = useRequestChanges(assetId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestChangesFormData>({
    resolver: zodResolver(requestChangesSchema),
    defaultValues: { reason: '' },
  });

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    onOpenChange(false);
  };

  const onSubmit = async (data: RequestChangesFormData) => {
    try {
      setErrorMsg(null);
      await requestMutation.mutateAsync({ reason: data.reason });
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request changes.';
      setErrorMsg(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
          <DialogDescription>
            Provide detailed feedback describing what needs to be changed in the next iteration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="reason">
              Reason / Revision Instructions
            </label>
            <textarea
              id="reason"
              rows={4}
              placeholder="e.g. Please update the logo to the high-res monochrome version and increase headline contrast."
              className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-[11px] text-rose-600">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={requestMutation.isPending}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Submitting...
                </>
              ) : (
                'Request Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
