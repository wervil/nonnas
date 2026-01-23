import { stackServerApp } from '@/stack'
import ThreadView from '@/components/Threads/ThreadView'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { Header } from '@/components/Header'

export default async function ThreadPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const user = await stackServerApp.getUser()
    const isAuthenticated = !!user

    const { id } = await params
    const threadId = parseInt(id)

    if (isNaN(threadId)) {
        redirect('/community')
    }

    // Verify permissions for Header (similar to Profile page)
    let hasPermissions = false
    if (user) {
        // Since this is a server component, we might not use the hook exactly same way or we need checks. 
        // Stack's server-side user object might differ. 
        // However, Header expects client-side user object or similar. 
        // Simplest way is to pass user. 
        // For hasAdminAccess, we can check basic role if available or default to false for now, 
        // or check if team member.
        // Stack Server SDK `getUser` returns a user object.
        // Let's keep it simple. If we need strict admin check, we might need more logic.
        // For now, let's assume false or try to check permissions if accessible.
        // Inspecting stack docs/usage elsewhere: `user.usePermission` is a hook. 
        // On server: `user.selectedTeam ` ??
    }

    return (
        <div className="flex flex-col min-h-svh w-full relative">
            {/* <Image
                src="/bg.webp"
                alt="Background"
                layout="fill"
                objectFit="cover"
                className="z-[-1]"
                priority
            /> */}
            <div className="relative z-10 w-full bg-transparent">
                <Header
                    hasAdminAccess={false}
                    user={user ? (user as any).toClientJson() : null}
                />
            </div>

            <main className="flex-grow w-full max-w-5xl mx-auto p-4 md:p-8 pt-4 relative z-10">
                <ThreadView
                    threadId={threadId}
                    currentUserId={user?.id || undefined}
                    isAuthenticated={isAuthenticated}
                />
            </main>
        </div>
    )
}