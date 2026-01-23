import { Conversation } from './types';

interface ConversationListProps {
    conversations: Conversation[];
    currentUserId: string;
    onSelect: (conversation: Conversation) => void;
    isLoading: boolean;
}

export const ConversationList = ({ conversations, currentUserId, onSelect, isLoading }: ConversationListProps) => {
    if (isLoading) {
        return <div className="p-4 text-center text-[var(--color-text-pale)] font-[var(--font-bell)]">Loading chats...</div>;
    }

    if (conversations.length === 0) {
        return (
            <div className="p-4 text-center text-[var(--color-text-pale)] font-[var(--font-bell)]">
                <p>No messages yet.</p>
                <p className="text-sm mt-2">Visit a profile to start a chat.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col divide-y divide-[var(--color-primary-border)]/10">
            {conversations.map((convo) => {
                const otherUserId = convo.user1_id === currentUserId ? convo.user2_id : convo.user1_id;

                return (
                    <button
                        key={convo.id}
                        onClick={() => onSelect(convo)}
                        className="p-4 hover:bg-[var(--color-brown-light)]/50 transition-colors text-left flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-full !bg-[var(--color-green-dark)] !text-[var(--color-yellow-light)] flex items-center justify-center font-bold shrink-0">
                            {otherUserId.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-semibold truncate !text-[var(--color-yellow-light)] font-[var(--font-bell)]">User {otherUserId.substring(0, 8)}...</div>
                            <div className="text-sm text-[var(--color-text-pale)] truncate font-[var(--font-bell)]">
                                {new Date(convo.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
