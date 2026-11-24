import type { Request, Response } from 'express';
import { AuditAction, type CreateCommentInput } from '@proofline/shared';
import { prisma } from '../../config/prisma.js';
import { canUserAccessCampaign } from '../../utils/access.js';

export async function addCommentToVersion(req: Request, res: Response): Promise<void> {
  const { versionId } = req.params;
  const user = req.user!;
  const { body } = req.body as CreateCommentInput;

  const version = await prisma.assetVersion.findUnique({
    where: { id: versionId },
    include: {
      asset: {
        select: { id: true, campaignId: true },
      },
    },
  });

  if (!version) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Asset version not found.',
      },
    });
    return;
  }

  const hasAccess = await canUserAccessCampaign(user.userId, user.role, version.asset.campaignId);
  if (!hasAccess) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to comment on assets in this campaign.',
      },
    });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        assetVersionId: version.id,
        authorId: user.userId,
        body,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId: version.asset.campaignId,
        assetId: version.asset.id,
        actorId: user.userId,
        action: AuditAction.COMMENT_ADDED,
        metadata: {
          versionNumber: version.versionNumber,
        },
      },
    });

    return comment;
  });

  res.status(201).json({ comment: result });
}
