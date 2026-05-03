import {
    CalendarCheck,
    CreditCard,
    LayoutGrid,
    Settings,
    Users,
} from 'lucide-react';
import {useLocation} from 'wouter';

import {useAppStore} from '@/app/store/useAppStore';
import {cn} from '@/shared/lib/utils';

const NAV_ITEMS = [
    {label: 'Clients', href: '/clients', Icon: Users},
    {label: 'Groups', href: '/groups', Icon: LayoutGrid},
    {label: 'Subscriptions', href: '/subs', Icon: CreditCard},
    {label: 'Sessions', href: '/sessions', Icon: CalendarCheck},
    {label: 'Settings', href: '/settings', Icon: Settings},
];

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({children}: AppShellProps) {
    const [location, navigate] = useLocation();
    const isOnline = useAppStore(s => s.isOnline);
    const syncStatus = useAppStore(s => s.syncStatus);
    const pendingMutations = useAppStore(s => s.pendingMutations);

    return (
        <div className="flex flex-col min-h-dvh">
            {/* ── Top bar ── */}
            <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm border-b border-border">
                <span className="font-semibold tracking-tight text-foreground">
                    Dance Manager
                </span>
                <div className="flex items-center gap-1.5">
                    {syncStatus === 'syncing' && (
                        <span className="text-xs text-muted-foreground animate-pulse">Syncing…</span>
                    )}
                    {!isOnline && pendingMutations > 0 && (
                        <span className="text-xs text-amber-500">{pendingMutations} pending</span>
                    )}
                    <span
                        className={cn(
                            'h-2 w-2 rounded-full',
                            isOnline ? 'bg-green-500' : 'bg-amber-500',
                        )}
                        aria-label={isOnline ? 'Online' : 'Offline'}
                    />
                </div>
            </header>

            {/* ── Scrollable content ── */}
            <main className="flex-1 overflow-y-auto pt-14 pb-16">
                {children}
            </main>

            {/* ── Bottom nav ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center bg-background/80 backdrop-blur-sm border-t border-border">
                {NAV_ITEMS.map(({label, href, Icon}) => {
                    const isActive = location === href || (href !== '/' && location.startsWith(href));
                    return (
                        <button
                            key={href}
                            onClick={() => navigate(href)}
                            className={cn(
                                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                                isActive ? 'text-primary' : 'text-muted-foreground',
                            )}
                        >
                            <Icon className="h-5 w-5" aria-hidden />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
