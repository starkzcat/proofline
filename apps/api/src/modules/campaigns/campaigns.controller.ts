import type { Request, Response } from 'express';
import { AuditAction, Role, type CampaignQueryInput, type CreateCampaignInput, type UpdateCampaignInput } from '@proofline/shared';
import { prisma } from '../../config/prisma.js';
import { canUserAccessCampaign } from '../../utils/access.js';

export async function listCampaigns(req: Request, res: Response): Promise<void> {
  const { status, search } = req.query as unknown as CampaignQueryInput;
  const user = req.user!;

  const where: Record<string, unknown> = {};

  if (user.role === Role.CLIENT) {
    where.members = {
      some: {
        userId: user.userId,
      },
    };
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      assets: {
        select: {
          id: true,
          status: true,
        },
      },
      _count: {
        select: {
          assets: true,
        },
      },
    },
  });

  const formatted = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    clientName: c.clientName,
    description: c.description,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    members: c.members.map((m) => m.user),
    assetCount: c._count.assets,
    pendingReviewCount: c.assets.filter((a) => a.status === 'IN_REVIEW').length,
  }));

  res.status(200).json({ campaigns: formatted });
}

export async function createCampaign(req: Request, res: Response): Promise<void> {
  const { name, clientName, description, memberIds } = req.body as CreateCampaignInput;
  const user = req.user!;

  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        name,
        clientName,
        description,
        members:
          memberIds && memberIds.length > 0
            ? {
                create: memberIds.map((userId) => ({ userId })),
              }
            : undefined,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId: campaign.id,
        actorId: user.userId,
        action: AuditAction.CAMPAIGN_CREATED,
        metadata: { name, clientName },
      },
    });

    return campaign;
  });

  res.status(201).json({ campaign: result });
}

export async function getCampaignById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const hasAccess = await canUserAccessCampaign(user.userId, user.role, id);
  if (!hasAccess) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this campaign.',
      },
    });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      assets: {
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            select: {
              id: true,
              versionNumber: true,
              fileUrl: true,
              mimeType: true,
              fileName: true,
            },
          },
          _count: {
            select: {
              versions: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
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

  const formattedAssets = campaign.assets.map((asset) => {
    const latestVersion = asset.versions[0];
    return {
      id: asset.id,
      campaignId: asset.campaignId,
      title: asset.title,
      description: asset.description,
      status: asset.status,
      currentVersion: asset.currentVersion,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      thumbnailUrl: latestVersion?.fileUrl || null,
      latestVersion: latestVersion || null,
    };
  });

  res.status(200).json({
    campaign: {
      ...campaign,
      members: campaign.members.map((m) => m.user),
      assets: formattedAssets,
    },
  });
}

export async function updateCampaign(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, clientName, description, status, memberIds } = req.body as UpdateCampaignInput;
  const user = req.user!;

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Campaign not found.',
      },
    });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    if (memberIds !== undefined) {
      await tx.campaignMember.deleteMany({
        where: { campaignId: id },
      });
      if (memberIds.length > 0) {
        await tx.campaignMember.createMany({
          data: memberIds.map((userId) => ({ campaignId: id, userId })),
        });
      }
    }

    const updated = await tx.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(clientName !== undefined && { clientName }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId: id,
        actorId: user.userId,
        action: AuditAction.CAMPAIGN_UPDATED,
        metadata: {
          ...(name !== undefined && { name }),
          ...(clientName !== undefined && { clientName }),
          ...(status !== undefined && { status }),
        },
      },
    });

    return updated;
  });

  res.status(200).json({
    campaign: {
      ...result,
      members: result.members.map((m) => m.user),
    },
  });
}
