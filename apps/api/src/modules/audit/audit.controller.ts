import type { Request, Response } from 'express';
import { Role, type AuditLogQueryInput } from '@proofline/shared';
import { prisma } from '../../config/prisma.js';

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { campaignId, assetId, limit, cursor } = req.query as unknown as AuditLogQueryInput;

  const take = limit || 20;
  const where: Record<string, unknown> = {};

  if (user.role === Role.CLIENT) {
    const assignedMemberships = await prisma.campaignMember.findMany({
      where: { userId: user.userId },
      select: { campaignId: true },
    });
    const assignedCampaignIds = assignedMemberships.map((m) => m.campaignId);

    if (campaignId) {
      if (!assignedCampaignIds.includes(campaignId)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to audit logs for this campaign.',
          },
        });
        return;
      }
      where.campaignId = campaignId;
    } else {
      where.campaignId = { in: assignedCampaignIds };
    }
  } else {
    // Admin & Marketer can filter by campaignId if provided
    if (campaignId) {
      where.campaignId = campaignId;
    }
  }

  if (assetId) {
    where.assetId = assetId;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    take: take + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: { id: true, name: true, email: true, role: true },
      },
      campaign: {
        select: { id: true, name: true, clientName: true },
      },
      asset: {
        select: { id: true, title: true, currentVersion: true },
      },
    },
  });

  let nextCursor: string | null = null;
  if (logs.length > take) {
    const nextItem = logs.pop();
    nextCursor = nextItem ? nextItem.id : null;
  }

  res.status(200).json({
    auditLogs: logs,
    nextCursor,
  });
}
