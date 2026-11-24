import { AssetStatus, Role } from './enums.js';

export type PermissionAction =
  | 'campaign:create'
  | 'campaign:edit'
  | 'campaign:archive'
  | 'campaign:assign'
  | 'campaign:view_all'
  | 'campaign:view_assigned'
  | 'asset:create'
  | 'asset:upload_version'
  | 'asset:submit'
  | 'asset:approve'
  | 'asset:request_changes'
  | 'asset:archive'
  | 'comment:create'
  | 'audit:view_all'
  | 'audit:view_assigned';

/**
 * RBAC permission check according to Section 3.2 RBAC Matrix
 */
export function hasPermission(role: Role, action: PermissionAction): boolean {
  switch (action) {
    case 'campaign:create':
    case 'campaign:edit':
    case 'campaign:archive':
    case 'campaign:assign':
    case 'asset:archive':
      return role === 'ADMIN';

    case 'campaign:view_all':
    case 'audit:view_all':
      return role === 'ADMIN' || role === 'MARKETER';

    case 'campaign:view_assigned':
    case 'audit:view_assigned':
      return true; // All roles can view campaigns they are assigned to (or all if admin/marketer)

    case 'asset:create':
    case 'asset:upload_version':
    case 'asset:submit':
      return role === 'ADMIN' || role === 'MARKETER';

    case 'asset:approve':
    case 'asset:request_changes':
      return role === 'ADMIN' || role === 'CLIENT';

    case 'comment:create':
      return true; // All roles can post comments on accessible assets

    default:
      return false;
  }
}

export interface TransitionValidationOptions {
  currentVersion?: number;
  hasReason?: boolean;
}

export interface TransitionValidationResult {
  allowed: boolean;
  code?: 'INVALID_STATE_TRANSITION' | 'FORBIDDEN' | 'VALIDATION_ERROR';
  message?: string;
}

/**
 * Validates state transition according to Section 5.1 & 5.2
 */
export function validateStateTransition(
  currentStatus: AssetStatus,
  targetStatus: AssetStatus,
  role: Role,
  options: TransitionValidationOptions = {}
): TransitionValidationResult {
  // Archived assets cannot transition to anything
  if (currentStatus === AssetStatus.ARCHIVED) {
    return {
      allowed: false,
      code: 'INVALID_STATE_TRANSITION',
      message: 'Archived assets cannot be transitioned to any other state.',
    };
  }

  // Same status transition is disallowed
  if (currentStatus === targetStatus) {
    return {
      allowed: false,
      code: 'INVALID_STATE_TRANSITION',
      message: `Asset is already in ${currentStatus} status.`,
    };
  }

  // Archival transition: Any non-archived -> ARCHIVED by ADMIN
  if (targetStatus === AssetStatus.ARCHIVED) {
    if (role !== Role.ADMIN) {
      return {
        allowed: false,
        code: 'FORBIDDEN',
        message: 'Only ADMIN users can archive assets.',
      };
    }
    return { allowed: true };
  }

  // DRAFT -> IN_REVIEW
  if (currentStatus === AssetStatus.DRAFT && targetStatus === AssetStatus.IN_REVIEW) {
    if (role !== Role.ADMIN && role !== Role.MARKETER) {
      return {
        allowed: false,
        code: 'FORBIDDEN',
        message: 'Only ADMIN and MARKETER users can submit assets for review.',
      };
    }
    const currentVersion = options.currentVersion ?? 0;
    if (currentVersion < 1) {
      return {
        allowed: false,
        code: 'INVALID_STATE_TRANSITION',
        message: 'Asset must have at least one version (currentVersion >= 1) to be submitted.',
      };
    }
    return { allowed: true };
  }

  // IN_REVIEW -> APPROVED
  if (currentStatus === AssetStatus.IN_REVIEW && targetStatus === AssetStatus.APPROVED) {
    if (role !== Role.ADMIN && role !== Role.CLIENT) {
      return {
        allowed: false,
        code: 'FORBIDDEN',
        message: 'Only ADMIN and CLIENT users can approve assets.',
      };
    }
    return { allowed: true };
  }

  // IN_REVIEW -> CHANGES_REQUESTED
  if (currentStatus === AssetStatus.IN_REVIEW && targetStatus === AssetStatus.CHANGES_REQUESTED) {
    if (role !== Role.ADMIN && role !== Role.CLIENT) {
      return {
        allowed: false,
        code: 'FORBIDDEN',
        message: 'Only ADMIN and CLIENT users can request changes on assets.',
      };
    }
    if (!options.hasReason) {
      return {
        allowed: false,
        code: 'VALIDATION_ERROR',
        message: 'Requesting changes requires a non-empty reason.',
      };
    }
    return { allowed: true };
  }

  // CHANGES_REQUESTED -> IN_REVIEW (via upload new version)
  if (
    currentStatus === AssetStatus.CHANGES_REQUESTED &&
    targetStatus === AssetStatus.IN_REVIEW
  ) {
    if (role !== Role.ADMIN && role !== Role.MARKETER) {
      return {
        allowed: false,
        code: 'FORBIDDEN',
        message: 'Only ADMIN and MARKETER users can upload new versions to re-submit.',
      };
    }
    return { allowed: true };
  }

  // Any other transition is invalid
  return {
    allowed: false,
    code: 'INVALID_STATE_TRANSITION',
    message: `Cannot transition asset from ${currentStatus} to ${targetStatus}.`,
  };
}
