import { describe, it, expect } from 'vitest';
import { hasPermission, validateStateTransition } from '../src/rbac.js';
import { ASSET_STATUSES, AssetStatus, Role } from '../src/enums.js';

describe('RBAC Matrix', () => {
  describe('hasPermission', () => {
    it('enforces campaign management permissions (ADMIN only)', () => {
      expect(hasPermission(Role.ADMIN, 'campaign:create')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'campaign:create')).toBe(false);
      expect(hasPermission(Role.CLIENT, 'campaign:create')).toBe(false);

      expect(hasPermission(Role.ADMIN, 'campaign:edit')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'campaign:edit')).toBe(false);
      expect(hasPermission(Role.CLIENT, 'campaign:edit')).toBe(false);

      expect(hasPermission(Role.ADMIN, 'campaign:assign')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'campaign:assign')).toBe(false);
      expect(hasPermission(Role.CLIENT, 'campaign:assign')).toBe(false);
    });

    it('enforces asset creation and upload permissions (ADMIN & MARKETER)', () => {
      expect(hasPermission(Role.ADMIN, 'asset:create')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'asset:create')).toBe(true);
      expect(hasPermission(Role.CLIENT, 'asset:create')).toBe(false);

      expect(hasPermission(Role.ADMIN, 'asset:upload_version')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'asset:upload_version')).toBe(true);
      expect(hasPermission(Role.CLIENT, 'asset:upload_version')).toBe(false);

      expect(hasPermission(Role.ADMIN, 'asset:submit')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'asset:submit')).toBe(true);
      expect(hasPermission(Role.CLIENT, 'asset:submit')).toBe(false);
    });

    it('enforces approval and change request permissions (ADMIN & CLIENT only, NOT Marketer)', () => {
      expect(hasPermission(Role.ADMIN, 'asset:approve')).toBe(true);
      expect(hasPermission(Role.CLIENT, 'asset:approve')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'asset:approve')).toBe(false);

      expect(hasPermission(Role.ADMIN, 'asset:request_changes')).toBe(true);
      expect(hasPermission(Role.CLIENT, 'asset:request_changes')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'asset:request_changes')).toBe(false);
    });

    it('enforces asset archiving (ADMIN only)', () => {
      expect(hasPermission(Role.ADMIN, 'asset:archive')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'asset:archive')).toBe(false);
      expect(hasPermission(Role.CLIENT, 'asset:archive')).toBe(false);
    });

    it('allows comments for all active roles', () => {
      expect(hasPermission(Role.ADMIN, 'comment:create')).toBe(true);
      expect(hasPermission(Role.MARKETER, 'comment:create')).toBe(true);
      expect(hasPermission(Role.CLIENT, 'comment:create')).toBe(true);
    });
  });

  describe('validateStateTransition', () => {
    it('allows DRAFT -> IN_REVIEW for ADMIN and MARKETER when currentVersion >= 1', () => {
      expect(
        validateStateTransition(AssetStatus.DRAFT, AssetStatus.IN_REVIEW, Role.MARKETER, {
          currentVersion: 1,
        })
      ).toEqual({ allowed: true });

      expect(
        validateStateTransition(AssetStatus.DRAFT, AssetStatus.IN_REVIEW, Role.ADMIN, {
          currentVersion: 2,
        })
      ).toEqual({ allowed: true });
    });

    it('rejects DRAFT -> IN_REVIEW if currentVersion < 1', () => {
      const result = validateStateTransition(
        AssetStatus.DRAFT,
        AssetStatus.IN_REVIEW,
        Role.MARKETER,
        { currentVersion: 0 }
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('rejects DRAFT -> IN_REVIEW for CLIENT', () => {
      const result = validateStateTransition(
        AssetStatus.DRAFT,
        AssetStatus.IN_REVIEW,
        Role.CLIENT,
        { currentVersion: 1 }
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('FORBIDDEN');
    });

    it('allows IN_REVIEW -> APPROVED for ADMIN and CLIENT', () => {
      expect(
        validateStateTransition(AssetStatus.IN_REVIEW, AssetStatus.APPROVED, Role.CLIENT)
      ).toEqual({ allowed: true });
      expect(
        validateStateTransition(AssetStatus.IN_REVIEW, AssetStatus.APPROVED, Role.ADMIN)
      ).toEqual({ allowed: true });
    });

    it('rejects IN_REVIEW -> APPROVED for MARKETER', () => {
      const result = validateStateTransition(
        AssetStatus.IN_REVIEW,
        AssetStatus.APPROVED,
        Role.MARKETER
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('FORBIDDEN');
    });

    it('allows IN_REVIEW -> CHANGES_REQUESTED when non-empty reason is provided', () => {
      expect(
        validateStateTransition(
          AssetStatus.IN_REVIEW,
          AssetStatus.CHANGES_REQUESTED,
          Role.CLIENT,
          { hasReason: true }
        )
      ).toEqual({ allowed: true });
    });

    it('rejects IN_REVIEW -> CHANGES_REQUESTED if reason is missing', () => {
      const result = validateStateTransition(
        AssetStatus.IN_REVIEW,
        AssetStatus.CHANGES_REQUESTED,
        Role.CLIENT,
        { hasReason: false }
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('allows CHANGES_REQUESTED -> IN_REVIEW on new version upload by MARKETER or ADMIN', () => {
      expect(
        validateStateTransition(
          AssetStatus.CHANGES_REQUESTED,
          AssetStatus.IN_REVIEW,
          Role.MARKETER
        )
      ).toEqual({ allowed: true });
      expect(
        validateStateTransition(
          AssetStatus.CHANGES_REQUESTED,
          AssetStatus.IN_REVIEW,
          Role.ADMIN
        )
      ).toEqual({ allowed: true });
    });

    it('rejects CHANGES_REQUESTED -> IN_REVIEW for CLIENT', () => {
      const result = validateStateTransition(
        AssetStatus.CHANGES_REQUESTED,
        AssetStatus.IN_REVIEW,
        Role.CLIENT
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('FORBIDDEN');
    });

    it('allows ADMIN to archive any non-archived asset', () => {
      for (const status of [
        AssetStatus.DRAFT,
        AssetStatus.IN_REVIEW,
        AssetStatus.CHANGES_REQUESTED,
        AssetStatus.APPROVED,
      ]) {
        expect(
          validateStateTransition(status, AssetStatus.ARCHIVED, Role.ADMIN)
        ).toEqual({ allowed: true });
      }
    });

    it('rejects archiving by non-ADMIN users', () => {
      const result = validateStateTransition(
        AssetStatus.IN_REVIEW,
        AssetStatus.ARCHIVED,
        Role.MARKETER
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('FORBIDDEN');
    });

    it('rejects any transition from ARCHIVED state', () => {
      for (const target of ASSET_STATUSES) {
        const result = validateStateTransition(
          AssetStatus.ARCHIVED,
          target,
          Role.ADMIN
        );
        expect(result.allowed).toBe(false);
        expect(result.code).toBe('INVALID_STATE_TRANSITION');
      }
    });

    it('rejects illegal jumps (e.g. DRAFT -> APPROVED)', () => {
      const result = validateStateTransition(
        AssetStatus.DRAFT,
        AssetStatus.APPROVED,
        Role.ADMIN
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('INVALID_STATE_TRANSITION');
    });
  });
});
