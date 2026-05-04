import {Route, Switch} from 'wouter';

import {ClientsPage} from '@/pages/clients';
import {GroupsPage} from '@/pages/groups';
import {HomePage} from '@/pages/home';
import {SessionsPage} from '@/pages/sessions';
import {SettingsPage} from '@/pages/settings';
import {SubsPage} from '@/pages/subs';
import {AppShell} from '@/widgets/app-shell';

function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-5xl font-bold text-muted-foreground">404</p>
            <p className="text-lg font-medium">Page not found</p>
            <a href="/" className="text-sm text-primary underline underline-offset-4">
                Go to home
            </a>
        </div>
    );
}

export default function Router() {
    return (
        <AppShell>
            <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/clients" component={ClientsPage} />
                <Route path="/groups" component={GroupsPage} />
                <Route path="/subs" component={SubsPage} />
                <Route path="/sessions" component={SessionsPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route component={NotFoundPage} />
            </Switch>
        </AppShell>
    );
}
