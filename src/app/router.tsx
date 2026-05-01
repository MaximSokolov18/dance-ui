import {Route, Switch} from 'wouter';

import {ClientsPage} from '@/pages/clients';
import {GroupsPage} from '@/pages/groups';
import {HomePage} from '@/pages/home';
import {SubsPage} from '@/pages/subs';
import {SettingsPage} from '@/pages/settings';
import {AppShell} from '@/widgets/app-shell';

export default function Router() {
    return (
        <AppShell>
            <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/clients" component={ClientsPage} />
                <Route path="/groups" component={GroupsPage} />
                <Route path="/subs" component={SubsPage} />
                <Route path="/settings" component={SettingsPage} />
            </Switch>
        </AppShell>
    );
}
