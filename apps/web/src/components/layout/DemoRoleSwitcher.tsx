import { useState } from 'react';
import { Role } from '@proofline/shared';
import { useAuth } from '../../context/AuthContext.js';
import { cn } from '../../lib/utils.js';

const ROLES: { role: Role; label: string }[] = [
  { role: Role.ADMIN, label: 'Admin' },
  { role: Role.MARKETER, label: 'Marketer' },
  { role: Role.CLIENT, label: 'Client' },
];

export function DemoRoleSwitcher() {
  const { user, demoSwitch } = useAuth();
  const [switching, setSwitching] = useState<Role | null>(null);

  const handleSwitch = async (role: Role) => {
    if (user?.role === role || switching) return;
    try {
      setSwitching(role);
      await demoSwitch(role);
    } catch (err) {
      console.error('Failed to switch demo role', err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div
      role="group"
      aria-label="Demo Role Switcher"
      className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium"
    >
      <span className="px-2 py-0.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider font-mono">
        Role:
      </span>
      {ROLES.map(({ role, label }) => {
        const isActive = user?.role === role;
        const isLoadingThis = switching === role;

        return (
          <button
            key={role}
            type="button"
            disabled={Boolean(switching)}
            onClick={() => handleSwitch(role)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors select-none cursor-pointer',
              isActive
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50',
              isLoadingThis && 'opacity-60 cursor-wait'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
