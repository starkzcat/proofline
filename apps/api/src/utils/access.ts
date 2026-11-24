import { Role } from '@proofline/shared';
import { prisma } from '../config/prisma.js';

export async function canUserAccessCampaign(
  userId: string,
  role: Role,
  campaignId: string
): Promise<boolean> {
  if (role === Role.ADMIN || role === Role.MARKETER) {
    return true;
  }

  // Client role must be an assigned member of the campaign
  const membership = await prisma.campaignMember.findUnique({
    where: {
      campaignId_userId: {
        campaignId,
        userId,
      },
    },
  });

  return !!membership;
}
