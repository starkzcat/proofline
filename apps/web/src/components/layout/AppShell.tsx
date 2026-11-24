import { Link, useLocation } from 'react-router-dom';
import {
  FolderKanban,
  Clock,
  History,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Role } from '@proofline/shared';
import { useAuth } from '../../context/AuthContext.js';
import { DemoRoleSwitcher } from './DemoRoleSwitcher.js';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: 'Campaigns',
      href: '/campaigns',
      icon: FolderKanban,
    },
    {
      name: 'Pending Review',
      href: '/pending-review',
      icon: Clock,
      badge: user?.role === Role.CLIENT ? '2' : undefined,
    },
    {
      name: 'Audit Log',
      href: '/audit-log',
      icon: History,
      adminOnly: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 240px Fixed Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30">
        <div>
          {/* Brand header */}
          <div className="h-14 flex items-center px-4 border-b border-slate-200">
            <Link to="/campaigns" className="flex items-center gap-2">
              <span className="h-5 w-5 rounded bg-zinc-900 flex items-center justify-center text-white text-xs font-bold font-mono">
                P
              </span>
              <span className="font-semibold text-sm tracking-tight text-slate-900">
                Proofline
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5">
            {navigation.map((item) => {
              if (item.adminOnly && user?.role !== Role.ADMIN) {
                return null;
              }
              const isActive = location.pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-slate-200/70 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="font-mono text-[10px] tabular-nums bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full border border-amber-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Current user info */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                <UserIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-slate-900 truncate">
                  {user?.name || user?.email || 'Guest'}
                </div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  {user?.role}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              title="Sign out"
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-60 min-w-0">
        {/* Sticky 56px Topbar */}
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/campaigns" className="hover:text-slate-900">
              Proofline
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium capitalize">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <DemoRoleSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
