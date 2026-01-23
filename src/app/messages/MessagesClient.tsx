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
        <div className="flex flex-col h-screen bg-[var(--color-brown-dark)] overflow-hidden">
            <Header
                hasAdminAccess={hasPermissions}
                user={user}
                className="!bg-[var(--color-brown-dark)]/80 border-b border-[var(--color-primary-border)]/20 shrink-0"
                // Pass undefined explicitly to hide search and country selector
                countriesOptions={undefined}
                selectedCountry={undefined}
                setSelectedCountry={undefined}
                search={undefined}
                setSearch={undefined}
            />
            <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full relative min-h-0 overflow-hidden px-4 py-4">
                <MessagingInterface />
            </main>
        </div>
    );
};
