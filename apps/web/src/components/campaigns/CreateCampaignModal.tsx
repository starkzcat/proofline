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
import { useCreateCampaign } from '../../api/queries.js';
import { Loader2 } from 'lucide-react';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  clientName: z.string().min(1, 'Client name is required').max(100),
  description: z.string().max(500).optional(),
});

type CreateCampaignFormData = z.infer<typeof createCampaignSchema>;

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignModal({
  open,
  onOpenChange,
}: CreateCampaignModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createMutation = useCreateCampaign();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: '',
      clientName: '',
      description: '',
    },
  });

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    onOpenChange(false);
  };

  const onSubmit = async (data: CreateCampaignFormData) => {
    try {
      setErrorMsg(null);
      await createMutation.mutateAsync(data);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create campaign.';
      setErrorMsg(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
          <DialogDescription>
            Create a campaign space for assets, feedback, and client approvals.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="name">
              Campaign Name
            </label>
            <Input
              id="name"
              placeholder="e.g. Q4 Holiday Paid Social"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-[11px] text-rose-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="clientName">
              Client Name
            </label>
            <Input
              id="clientName"
              placeholder="e.g. Acme Corp"
              {...register('clientName')}
            />
            {errors.clientName && (
              <p className="text-[11px] text-rose-600">{errors.clientName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="description">
              Description (Optional)
            </label>
            <Input
              id="description"
              placeholder="Campaign objectives and channels"
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
