'use client';

import { useUser } from '@stackframe/stack';
import { Header } from '@/components/Header';
import { MessagingInterface } from '@/components/messaging/MessagingInterface';

export const MessagesClient = () => {
    const user = useUser();
    let hasPermissions = false;

    if (user) {
        const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '');
        hasPermissions = team ? !!user.usePermission(team, 'team_member') : false;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header
                hasAdminAccess={hasPermissions}
                user={user}
                // Pass undefined explicitly to hide search and country selector
                countriesOptions={undefined}
                selectedCountry={undefined}
                setSelectedCountry={undefined}
                search={undefined}
                setSearch={undefined}
            />
            <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full relative">
                <MessagingInterface />
            </main>
        </div>
    );
};
