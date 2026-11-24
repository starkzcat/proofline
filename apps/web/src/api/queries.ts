import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import type {
  CampaignStatus,
  AssetStatus,
  AuditAction,
  Role,
} from '@proofline/shared';

export interface CampaignSummary {
  id: string;
  name: string;
  clientName: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    user: { id: string; name: string; email: string; role: Role };
  }>;
  assets: Array<{ id: string; status: AssetStatus }>;
  _count: { assets: number };
}

export interface AssetSummary {
  id: string;
  campaignId: string;
  title: string;
  description?: string | null;
  status: AssetStatus;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSizeBytes: number;
    changeNotes?: string | null;
    createdAt: string;
    _count: { comments: number };
  }>;
  _count: { auditLogs: number };
}

export interface CampaignDetail extends CampaignSummary {
  description?: string | null;
  assets: AssetSummary[];
}

export interface CommentItem {
  id: string;
  versionId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface VersionDetail {
  id: string;
  assetId: string;
  versionNumber: number;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  changeNotes?: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  comments: CommentItem[];
}

export interface AuditLogItem {
  id: string;
  action: AuditAction;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  campaign?: { id: string; name: string } | null;
  asset?: { id: string; title: string } | null;
}

export interface AssetDetail {
  id: string;
  campaignId: string;
  title: string;
  description?: string | null;
  status: AssetStatus;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  campaign: {
    id: string;
    name: string;
    clientName: string;
  };
  versions: VersionDetail[];
  auditLogs: AuditLogItem[];
}

// Hooks

export function useCampaigns(params?: { status?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  const qStr = query.toString() ? `?${query.toString()}` : '';

  return useQuery<{ campaigns: CampaignSummary[] }>({
    queryKey: ['campaigns', params],
    queryFn: () => apiClient<{ campaigns: CampaignSummary[] }>(`/campaigns${qStr}`),
  });
}

export function useCampaign(id: string) {
  return useQuery<{ campaign: CampaignDetail }>({
    queryKey: ['campaign', id],
    queryFn: () => apiClient<{ campaign: CampaignDetail }>(`/campaigns/${id}`),
    enabled: Boolean(id),
  });
}

export function useAsset(id: string) {
  return useQuery<{ asset: AssetDetail }>({
    queryKey: ['asset', id],
    queryFn: () => apiClient<{ asset: AssetDetail }>(`/assets/${id}`),
    enabled: Boolean(id),
  });
}

export function useAuditLogs(params?: { campaignId?: string; assetId?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.campaignId) query.set('campaignId', params.campaignId);
  if (params?.assetId) query.set('assetId', params.assetId);
  if (params?.limit) query.set('limit', String(params.limit));
  const qStr = query.toString() ? `?${query.toString()}` : '';

  return useQuery<{ logs: AuditLogItem[]; nextCursor?: string | null }>({
    queryKey: ['audit-logs', params],
    queryFn: () => apiClient<{ logs: AuditLogItem[]; nextCursor?: string | null }>(`/audit${qStr}`),
  });
}

// Mutations

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; clientName: string; description?: string }) =>
      apiClient<{ campaign: CampaignSummary }>('/campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useCreateAsset(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      fileName: string;
      fileKey: string;
      fileUrl: string;
      mimeType: string;
      fileSizeBytes: number;
      changeNotes?: string;
    }) =>
      apiClient<{ asset: AssetSummary }>(`/campaigns/${campaignId}/assets`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUploadNewVersion(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      fileName: string;
      fileKey: string;
      fileUrl: string;
      mimeType: string;
      fileSizeBytes: number;
      changeNotes?: string;
    }) =>
      apiClient<{ asset: AssetDetail }>(`/assets/${assetId}/versions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', assetId] });
    },
  });
}

export function useSubmitAsset(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ asset: AssetDetail }>(`/assets/${assetId}/submit`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', assetId] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useApproveAsset(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ asset: AssetDetail }>(`/assets/${assetId}/approve`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', assetId] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useRequestChanges(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { reason: string }) =>
      apiClient<{ asset: AssetDetail }>(`/assets/${assetId}/request-changes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', assetId] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useAddComment(versionId: string, assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string }) =>
      apiClient<{ comment: CommentItem }>(`/comments/${versionId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', assetId] });
    },
  });
}

export async function uploadFileToPresignedUrl(file: File): Promise<{
  fileKey: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}> {
  // 1. Get presigned upload URL from backend
  const presignRes = await apiClient<{
    uploadUrl: string;
    fileKey: string;
    publicUrl: string;
  }>('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
    }),
  });

  // 2. PUT upload to S3 / R2
  const uploadResponse = await fetch(presignRes.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to storage');
  }

  return {
    fileKey: presignRes.fileKey,
    fileUrl: presignRes.publicUrl,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSizeBytes: file.size,
  };
}
