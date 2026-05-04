import {AlertCircle, CalendarCheck, Users} from 'lucide-react';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import {useLocation} from 'wouter';

import {useAppStore} from '@/app/store/useAppStore';
import {Skeleton} from '@/shared/ui/skeleton';

interface DashboardStats {
    totalActiveClients: number;
    upcomingSessions: Array<{
        id?: string;
        sessionDate?: string;
        groupId?: string;
        sessionTime?: string;
        cancelled?: boolean;
    }>;
    expiringSubscriptions: Array<{
        subscription: {
            id?: string;
            clientId?: string;
            groupId?: string;
            classesUsed?: number;
            classesTotal?: number;
        };
        client: {id?: string; name?: string};
    }>;
    clientsWithNoActiveSubscription: Array<{id?: string; name?: string}>;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

async function fetchDashboard(): Promise<DashboardStats> {
    const r = await fetch(`${BASE_URL}/dashboard/`);
    if (!r.ok) throw new Error('Failed to load dashboard');
    return r.json() as Promise<DashboardStats>;
}

export function HomePage() {
    const [, navigate] = useLocation();
    const isOnline = useAppStore(s => s.isOnline);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = () => {
            fetchDashboard()
                .then(setStats)
                .catch((err: Error) => toast.error(err.message))
                .finally(() => setLoading(false));
        };
        load();
        const onVisibilityChange = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    return (
        <div className="flex flex-col gap-6 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Dance Manager</p>
                </div>
                <span
                    className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
                >
                    <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    loading={loading}
                    icon={<Users className="h-5 w-5" />}
                    label="Active clients"
                    value={stats?.totalActiveClients ?? 0}
                    onClick={() => navigate('/clients')}
                />
                <StatCard
                    loading={loading}
                    icon={<CalendarCheck className="h-5 w-5" />}
                    label="Upcoming sessions"
                    value={stats?.upcomingSessions?.length ?? 0}
                    sublabel="next 7 days"
                    onClick={() => navigate('/sessions')}
                />
            </div>

            {/* Expiring subscriptions */}
            <Section
                loading={loading}
                title="Expiring soon"
                icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                emptyText="No subscriptions expiring"
                onClick={() => navigate('/subs')}
            >
                {stats?.expiringSubscriptions?.map(({subscription, client}) => (
                    <div key={subscription.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{client.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {subscription.classesUsed ?? 0}&nbsp;/&nbsp;{subscription.classesTotal ?? '?'} used
                        </span>
                    </div>
                ))}
            </Section>

            {/* Clients without subscription */}
            <Section
                loading={loading}
                title="No active subscription"
                icon={<AlertCircle className="h-4 w-4 text-destructive" />}
                emptyText="All clients have subscriptions"
                onClick={() => navigate('/clients')}
            >
                {stats?.clientsWithNoActiveSubscription?.map(client => (
                    <div key={client.id} className="py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{client.name}</span>
                    </div>
                ))}
            </Section>
        </div>
    );
}

function StatCard({
    loading,
    icon,
    label,
    value,
    sublabel,
    onClick,
}: {
    loading: boolean;
    icon: React.ReactNode;
    label: string;
    value: number;
    sublabel?: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted/50"
        >
            <div className="text-muted-foreground">{icon}</div>
            {loading ? (
                <Skeleton className="h-8 w-16" />
            ) : (
                <span className="text-3xl font-bold">{value}</span>
            )}
            <div>
                <p className="text-sm font-medium">{label}</p>
                {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
            </div>
        </button>
    );
}

function Section({
    loading,
    title,
    icon,
    emptyText,
    children,
    onClick,
}: {
    loading: boolean;
    title: string;
    icon: React.ReactNode;
    emptyText: string;
    children: React.ReactNode;
    onClick: () => void;
}) {
    const items = Array.isArray(children) ? children : children ? [children] : [];
    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={onClick}
                className="flex items-center gap-2 text-left"
            >
                {icon}
                <span className="text-sm font-semibold">{title}</span>
                {!loading && items.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
                )}
            </button>
            <div className="rounded-xl border bg-card px-4">
                {loading ? (
                    <div className="py-4 flex flex-col gap-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ) : items.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
