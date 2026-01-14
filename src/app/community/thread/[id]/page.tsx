import { stackServerApp } from '@/stack'
import ThreadView from '@/components/Threads/ThreadView'
import { redirect } from 'next/navigation'

export default async function ThreadPage({
    params,
}: {
    params: { id: string }
}) {
    const user = await stackServerApp.getUser()
    const isAuthenticated = !!user

    const threadId = parseInt(params.id)

    if (isNaN(threadId)) {
        redirect('/community')
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <ThreadView
                threadId={threadId}
                currentUserId={user?.id || undefined}
                isAuthenticated={isAuthenticated}
            />
        </div>
    )
}
