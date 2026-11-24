import { PrismaClient, Role, CampaignStatus, AssetStatus, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Password hash (10 rounds bcrypt)
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Users (Idempotent upsert)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@proofline.dev' },
    update: { passwordHash, role: Role.ADMIN, name: 'Alex Rivera (Admin)' },
    create: {
      email: 'admin@proofline.dev',
      name: 'Alex Rivera (Admin)',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const marketer = await prisma.user.upsert({
    where: { email: 'marketer@proofline.dev' },
    update: { passwordHash, role: Role.MARKETER, name: 'Morgan Vance (Marketer)' },
    create: {
      email: 'marketer@proofline.dev',
      name: 'Morgan Vance (Marketer)',
      passwordHash,
      role: Role.MARKETER,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@proofline.dev' },
    update: { passwordHash, role: Role.CLIENT, name: 'Casey Taylor (Client)' },
    create: {
      email: 'client@proofline.dev',
      name: 'Casey Taylor (Client)',
      passwordHash,
      role: Role.CLIENT,
    },
  });

  console.log('✅ Seeded users:', { admin: admin.email, marketer: marketer.email, client: client.email });

  // 3. Campaigns
  // Campaign 1: Assigned to client@proofline.dev
  let campaign1 = await prisma.campaign.findFirst({
    where: { name: 'Q4 Holiday Paid Social' },
  });

  if (!campaign1) {
    campaign1 = await prisma.campaign.create({
      data: {
        name: 'Q4 Holiday Paid Social',
        clientName: 'Aurora Retail Inc.',
        description: 'Multi-channel social campaign for seasonal Q4 promotion.',
        status: CampaignStatus.ACTIVE,
        members: {
          create: [{ userId: client.id }],
        },
        auditLogs: {
          create: [
            {
              actorId: admin.id,
              action: AuditAction.CAMPAIGN_CREATED,
              metadata: { name: 'Q4 Holiday Paid Social', clientName: 'Aurora Retail Inc.' },
            },
          ],
        },
      },
    });
  } else {
    // Ensure membership
    await prisma.campaignMember.upsert({
      where: {
        campaignId_userId: {
          campaignId: campaign1.id,
          userId: client.id,
        },
      },
      update: {},
      create: {
        campaignId: campaign1.id,
        userId: client.id,
      },
    });
  }

  // Campaign 2: Unassigned to client (for testing RBAC scoping)
  let campaign2 = await prisma.campaign.findFirst({
    where: { name: 'Internal Brand Refresh' },
  });

  if (!campaign2) {
    campaign2 = await prisma.campaign.create({
      data: {
        name: 'Internal Brand Refresh',
        clientName: 'Proofline Internal',
        description: 'Corporate brand visual identity refresh assets.',
        status: CampaignStatus.ACTIVE,
        auditLogs: {
          create: [
            {
              actorId: admin.id,
              action: AuditAction.CAMPAIGN_CREATED,
              metadata: { name: 'Internal Brand Refresh' },
            },
          ],
        },
      },
    });
  }

  console.log('✅ Seeded campaigns:', { campaign1: campaign1.name, campaign2: campaign2.name });

  // 4. Assets & Versions for Campaign 1
  // Asset 1: IN_REVIEW with v1 and v2 (Side-by-side compare ready)
  const existingAsset1 = await prisma.asset.findFirst({
    where: { campaignId: campaign1.id, title: 'Hero Carousel Banner' },
  });

  if (!existingAsset1) {
    const asset1 = await prisma.asset.create({
      data: {
        campaignId: campaign1.id,
        title: 'Hero Carousel Banner',
        description: 'Main promotional banner for mobile and desktop display.',
        status: AssetStatus.IN_REVIEW,
        currentVersion: 2,
        versions: {
          create: [
            {
              versionNumber: 1,
              fileName: 'hero-banner-v1.png',
              fileKey: `${campaign1.id}/hero-banner-v1.png`,
              fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
              mimeType: 'image/png',
              fileSizeBytes: 1420000,
              changeNotes: 'Initial creative exploration',
              uploadedById: marketer.id,
              comments: {
                create: [
                  {
                    authorId: client.id,
                    body: 'The typography is a bit tight on mobile. Can we boost contrast and add 20px padding?',
                  },
                ],
              },
            },
            {
              versionNumber: 2,
              fileName: 'hero-banner-v2.png',
              fileKey: `${campaign1.id}/hero-banner-v2.png`,
              fileUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
              mimeType: 'image/png',
              fileSizeBytes: 1530000,
              changeNotes: 'Addressed feedback: enlarged typography, boosted contrast on CTA',
              uploadedById: marketer.id,
              comments: {
                create: [
                  {
                    authorId: marketer.id,
                    body: 'Updated CTA button to high contrast zinc-900 per request. Ready for sign-off.',
                  },
                ],
              },
            },
          ],
        },
        auditLogs: {
          create: [
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.ASSET_CREATED,
              metadata: { title: 'Hero Carousel Banner' },
            },
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.VERSION_UPLOADED,
              metadata: { versionNumber: 1 },
            },
            {
              campaignId: campaign1.id,
              actorId: client.id,
              action: AuditAction.CHANGES_REQUESTED,
              metadata: { reason: 'Typography contrast and padding adjustment needed' },
            },
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.VERSION_UPLOADED,
              metadata: { versionNumber: 2 },
            },
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.ASSET_SUBMITTED,
              metadata: { fromStatus: 'CHANGES_REQUESTED', toStatus: 'IN_REVIEW' },
            },
          ],
        },
      },
    });
    console.log('✅ Seeded Asset 1 (IN_REVIEW, v1 + v2):', asset1.id);
  }

  // Asset 2: CHANGES_REQUESTED with client feedback comment
  const existingAsset2 = await prisma.asset.findFirst({
    where: { campaignId: campaign1.id, title: 'Story Video Teaser Poster' },
  });

  if (!existingAsset2) {
    const asset2 = await prisma.asset.create({
      data: {
        campaignId: campaign1.id,
        title: 'Story Video Teaser Poster',
        description: 'Vertical 9:16 static poster for Instagram Stories teaser.',
        status: AssetStatus.CHANGES_REQUESTED,
        currentVersion: 1,
        versions: {
          create: [
            {
              versionNumber: 1,
              fileName: 'story-poster-v1.png',
              fileKey: `${campaign1.id}/story-poster-v1.png`,
              fileUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1080&auto=format&fit=crop&q=80',
              mimeType: 'image/png',
              fileSizeBytes: 980000,
              changeNotes: 'First pass vertical poster',
              uploadedById: marketer.id,
              comments: {
                create: [
                  {
                    authorId: client.id,
                    body: 'Please remove the holiday discount badge from this teaser—it spoils the reveal.',
                  },
                ],
              },
            },
          ],
        },
        auditLogs: {
          create: [
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.ASSET_CREATED,
              metadata: { title: 'Story Video Teaser Poster' },
            },
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.VERSION_UPLOADED,
              metadata: { versionNumber: 1 },
            },
            {
              campaignId: campaign1.id,
              actorId: client.id,
              action: AuditAction.CHANGES_REQUESTED,
              metadata: { reason: 'Remove holiday discount badge from teaser' },
            },
          ],
        },
      },
    });
    console.log('✅ Seeded Asset 2 (CHANGES_REQUESTED):', asset2.id);
  }

  // Asset 3: APPROVED with full audit trail
  const existingAsset3 = await prisma.asset.findFirst({
    where: { campaignId: campaign1.id, title: 'Seasonal Brand Guidelines PDF' },
  });

  if (!existingAsset3) {
    const asset3 = await prisma.asset.create({
      data: {
        campaignId: campaign1.id,
        title: 'Seasonal Brand Guidelines PDF',
        description: 'Approved seasonal color specifications and copy guidelines.',
        status: AssetStatus.APPROVED,
        currentVersion: 1,
        versions: {
          create: [
            {
              versionNumber: 1,
              fileName: 'brand-guidelines-q4.pdf',
              fileKey: `${campaign1.id}/brand-guidelines-q4.pdf`,
              fileUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
              mimeType: 'application/pdf',
              fileSizeBytes: 2400000,
              changeNotes: 'Final signed-off guidelines document',
              uploadedById: marketer.id,
            },
          ],
        },
        auditLogs: {
          create: [
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.ASSET_CREATED,
              metadata: { title: 'Seasonal Brand Guidelines PDF' },
            },
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.VERSION_UPLOADED,
              metadata: { versionNumber: 1 },
            },
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.ASSET_SUBMITTED,
              metadata: { fromStatus: 'DRAFT', toStatus: 'IN_REVIEW' },
            },
            {
              campaignId: campaign1.id,
              actorId: client.id,
              action: AuditAction.ASSET_APPROVED,
              metadata: { fromStatus: 'IN_REVIEW', toStatus: 'APPROVED' },
            },
          ],
        },
      },
    });
    console.log('✅ Seeded Asset 3 (APPROVED):', asset3.id);
  }

  // Asset 4: DRAFT ready to be submitted
  const existingAsset4 = await prisma.asset.findFirst({
    where: { campaignId: campaign1.id, title: 'Search Ad Creative Mockup' },
  });

  if (!existingAsset4) {
    const asset4 = await prisma.asset.create({
      data: {
        campaignId: campaign1.id,
        title: 'Search Ad Creative Mockup',
        description: 'Responsive display creative mockup for Google Ads.',
        status: AssetStatus.DRAFT,
        currentVersion: 1,
        versions: {
          create: [
            {
              versionNumber: 1,
              fileName: 'ad-mockup-v1.png',
              fileKey: `${campaign1.id}/ad-mockup-v1.png`,
              fileUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1200&auto=format&fit=crop&q=80',
              mimeType: 'image/png',
              fileSizeBytes: 890000,
              changeNotes: 'Initial draft copy & creative layout',
              uploadedById: marketer.id,
            },
          ],
        },
        auditLogs: {
          create: [
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.ASSET_CREATED,
              metadata: { title: 'Search Ad Creative Mockup' },
            },
            {
              campaignId: campaign1.id,
              actorId: marketer.id,
              action: AuditAction.VERSION_UPLOADED,
              metadata: { versionNumber: 1 },
            },
          ],
        },
      },
    });
    console.log('✅ Seeded Asset 4 (DRAFT):', asset4.id);
  }

  console.log('🎉 Seed complete!');
}

if (process.env.NODE_ENV !== 'test') {
  seed()
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
