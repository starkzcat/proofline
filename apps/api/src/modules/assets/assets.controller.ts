import type { Request, Response } from 'express';
import {
  AssetStatus,
  AuditAction,
  type CreateAssetInput,
  type CreateVersionInput,
  type RequestChangesInput,
} from '@proofline/shared';
import { prisma } from '../../config/prisma.js';
import { canUserAccessCampaign } from '../../utils/access.js';

export async function createAsset(req: Request, res: Response): Promise<void> {
  const { campaignId } = req.params;
  const user = req.user!;
  const data = req.body as CreateAssetInput;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Campaign not found.',
      },
    });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        campaignId,
        title: data.title,
        description: data.description,
        status: AssetStatus.DRAFT,
        currentVersion: 1,
        versions: {
          create: {
            versionNumber: 1,
            fileName: data.fileName,
            fileKey: data.fileKey,
            fileUrl: data.fileUrl,
            mimeType: data.mimeType,
            fileSizeBytes: data.fileSizeBytes,
            changeNotes: data.changeNotes,
            uploadedById: user.userId,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId,
        assetId: asset.id,
        actorId: user.userId,
        action: AuditAction.ASSET_CREATED,
        metadata: { title: data.title },
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId,
        assetId: asset.id,
        actorId: user.userId,
        action: AuditAction.VERSION_UPLOADED,
        metadata: { versionNumber: 1 },
      },
    });

    return asset;
  });

  res.status(201).json({ asset: result });
}

export async function getAssetById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      campaign: {
        select: { id: true, name: true, clientName: true },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
    },
  });

  if (!asset) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  const hasAccess = await canUserAccessCampaign(user.userId, user.role, asset.campaignId);
  if (!hasAccess) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to view assets in this campaign.',
      },
    });
    return;
  }

  res.status(200).json({ asset });
}

export async function uploadNewVersion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;
  const data = req.body as CreateVersionInput;

  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  if (asset.status === AssetStatus.ARCHIVED) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: 'Cannot upload new version to an archived asset.',
      },
    });
    return;
  }

  const newVersionNumber = asset.currentVersion + 1;
  const nextStatus =
    asset.status === AssetStatus.CHANGES_REQUESTED
      ? AssetStatus.IN_REVIEW
      : asset.status;

  const result = await prisma.$transaction(async (tx) => {
    const version = await tx.assetVersion.create({
      data: {
        assetId: id,
        versionNumber: newVersionNumber,
        fileName: data.fileName,
        fileKey: data.fileKey,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        changeNotes: data.changeNotes,
        uploadedById: user.userId,
      },
    });

    const updatedAsset = await tx.asset.update({
      where: { id },
      data: {
        currentVersion: newVersionNumber,
        status: nextStatus,
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId: asset.campaignId,
        assetId: id,
        actorId: user.userId,
        action: AuditAction.VERSION_UPLOADED,
        metadata: { versionNumber: newVersionNumber },
      },
    });

    if (asset.status === AssetStatus.CHANGES_REQUESTED) {
      await tx.auditLog.create({
        data: {
          campaignId: asset.campaignId,
          assetId: id,
          actorId: user.userId,
          action: AuditAction.ASSET_SUBMITTED,
          metadata: {
            fromStatus: AssetStatus.CHANGES_REQUESTED,
            toStatus: AssetStatus.IN_REVIEW,
            versionNumber: newVersionNumber,
          },
        },
      });
    }

    return { asset: updatedAsset, version };
  });

  res.status(201).json(result);
}

export async function submitAsset(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  if (asset.status !== AssetStatus.DRAFT) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot submit asset with status ${asset.status}. Only DRAFT assets can be submitted.`,
      },
    });
    return;
  }

  if (asset.currentVersion < 1) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: 'Asset must have at least one version before being submitted.',
      },
    });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.asset.update({
      where: { id },
      data: { status: AssetStatus.IN_REVIEW },
    });

    await tx.auditLog.create({
      data: {
        campaignId: asset.campaignId,
        assetId: id,
        actorId: user.userId,
        action: AuditAction.ASSET_SUBMITTED,
        metadata: {
          fromStatus: AssetStatus.DRAFT,
          toStatus: AssetStatus.IN_REVIEW,
          versionNumber: asset.currentVersion,
        },
      },
    });

    return a;
  });

  res.status(200).json({ asset: updated });
}

export async function approveAsset(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  const hasAccess = await canUserAccessCampaign(user.userId, user.role, asset.campaignId);
  if (!hasAccess) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to approve assets in this campaign.',
      },
    });
    return;
  }

  if (asset.status !== AssetStatus.IN_REVIEW) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot approve asset with status ${asset.status}. Only IN_REVIEW assets can be approved.`,
      },
    });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.asset.update({
      where: { id },
      data: { status: AssetStatus.APPROVED },
    });

    await tx.auditLog.create({
      data: {
        campaignId: asset.campaignId,
        assetId: id,
        actorId: user.userId,
        action: AuditAction.ASSET_APPROVED,
        metadata: {
          fromStatus: AssetStatus.IN_REVIEW,
          toStatus: AssetStatus.APPROVED,
          versionNumber: asset.currentVersion,
        },
      },
    });

    return a;
  });

  res.status(200).json({ asset: updated });
}

export async function requestChanges(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;
  const { reason } = req.body as RequestChangesInput;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
    },
  });

  if (!asset) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  const hasAccess = await canUserAccessCampaign(user.userId, user.role, asset.campaignId);
  if (!hasAccess) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to request changes on assets in this campaign.',
      },
    });
    return;
  }

  if (asset.status !== AssetStatus.IN_REVIEW) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot request changes on asset with status ${asset.status}. Only IN_REVIEW assets can be requested for changes.`,
      },
    });
    return;
  }

  const latestVersion = asset.versions[0];
  if (!latestVersion) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: 'Asset has no versions to comment on.',
      },
    });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.asset.update({
      where: { id },
      data: { status: AssetStatus.CHANGES_REQUESTED },
    });

    await tx.comment.create({
      data: {
        assetVersionId: latestVersion.id,
        authorId: user.userId,
        body: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId: asset.campaignId,
        assetId: id,
        actorId: user.userId,
        action: AuditAction.CHANGES_REQUESTED,
        metadata: {
          fromStatus: AssetStatus.IN_REVIEW,
          toStatus: AssetStatus.CHANGES_REQUESTED,
          reason,
          versionNumber: asset.currentVersion,
        },
      },
    });

    return a;
  });

  res.status(200).json({ asset: updated });
}

export async function archiveAsset(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  if (asset.status === AssetStatus.ARCHIVED) {
    res.status(409).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: 'Asset is already archived.',
      },
    });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.asset.update({
      where: { id },
      data: { status: AssetStatus.ARCHIVED },
    });

    await tx.auditLog.create({
      data: {
        campaignId: asset.campaignId,
        assetId: id,
        actorId: user.userId,
        action: AuditAction.ASSET_ARCHIVED,
        metadata: {
          fromStatus: asset.status,
          toStatus: AssetStatus.ARCHIVED,
        },
      },
    });

    return a;
  });

  res.status(200).json({ asset: updated });
}
