import {toast} from 'sonner';

import {useAppStore} from '@/app/store/useAppStore';
import {Badge} from '@/shared/ui/badge';
import {Button} from '@/shared/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/shared/ui/card';
import {Separator} from '@/shared/ui/separator';

export function HomePage() {
    const isOnline = useAppStore(s => s.isOnline);
    const syncStatus = useAppStore(s => s.syncStatus);

    return (
        <div className="flex flex-col items-center justify-center min-h-full gap-6 p-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Hello, Dance Manager 💃
                </h1>
                <p className="text-muted-foreground text-sm">
                    Your studio, always in your pocket.
                </p>
            </div>

            <div className="flex gap-2 flex-wrap justify-center">
                <Badge variant="outline">PWA ready</Badge>
                <Badge variant="outline">Offline-ready</Badge>
                <Badge variant={isOnline ? 'default' : 'secondary'}>
                    {isOnline ? 'Online' : 'Offline'}
                </Badge>
            </div>

            <Button
                onClick={() => toast.success('Toasts are working!')}
                className="w-full max-w-xs"
            >
                Test toast notification
            </Button>

            {import.meta.env.DEV && (
                <>
                    <Separator className="max-w-xs w-full" />
                    <Card className="w-full max-w-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Debug state</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="text-xs text-muted-foreground font-mono space-y-1">
                                {JSON.stringify({
                                    isOnline,
                                    syncStatus,
                                }, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </>
            )}

        </div>
    );
}
