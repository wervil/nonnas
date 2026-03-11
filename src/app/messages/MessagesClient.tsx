'use client';

import { Header } from '@/components/Header';
import { MessagingInterface } from '@/components/messaging/MessagingInterface';
import { useUser } from '@stackframe/stack';

export const MessagesClient = () => {
    const user = useUser();
    let hasPermissions = false;

    if (user) {
        const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '');
        hasPermissions = team ? !!user.usePermission(team, 'team_member') : false;
    }

    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
            <Header
                hasAdminAccess={hasPermissions}
                user={user}
                className="bg-white/80! border-b border-gray-200 backdrop-blur-md shrink-0"
                // Pass undefined explicitly to hide search and country selector
                countriesOptions={undefined}
                selectedCountry={undefined}
                setSelectedCountry={undefined}
                search={undefined}
                setSearch={undefined}
            />
            <main className="flex-1 flex flex-col w-full relative min-h-0 overflow-hidden">
                <MessagingInterface />
            </main>
        </div>
    );
};
