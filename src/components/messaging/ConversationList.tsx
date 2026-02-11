import { Conversation } from './types';

interface ConversationListProps {
    conversations: Conversation[];
    currentUserId: string;
    onSelect: (conversation: Conversation) => void;
    isLoading?: boolean;
    activeConversationId?: number;
}

export const ConversationList = ({ conversations, currentUserId, onSelect, isLoading, activeConversationId }: ConversationListProps) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-3 font-[var(--font-bell)]">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <div>Loading chats...</div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 font-[var(--font-bell)]">
                <p>No messages yet.</p>
                <p className="text-sm mt-2">Visit a profile to start a chat.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col divide-y divide-gray-200/50">
            {conversations.map((convo) => {
                const otherUserId = convo.user1_id === currentUserId ? convo.user2_id : convo.user1_id;
                let otherUserName = convo.user1_id === currentUserId ? convo.user2_name : convo.user1_name;

                // If the name is just the ID, treat it as null so we fall back to truncated ID display or handle appropriately
                if (otherUserName === otherUserId) {
                    otherUserName = null;
                }

                const displayName = otherUserName || "--";
                const initials = (otherUserName || "--").substring(0, 2).toUpperCase();
                const isActive = activeConversationId === convo.id;

                return (
                    <button
                        key={convo.id}
                        onClick={() => onSelect(convo)}
                        className={`p-4 text-left flex items-center gap-3 transition-colors ${isActive
                                ? 'bg-[var(--color-yellow-bg)] border-l-4 border-amber-200'
                                : 'hover:bg-gray-50 bg-white border-l-4 border-transparent'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border ${isActive
                                ? 'bg-white text-[var(--color-yellow-main)] border-l border-amber-200'
                                : 'bg-[var(--color-yellow-bg)] text-[var(--color-yellow-main)] border-amber-200'
                            }`}>
                            {initials}
                        </div>
                        <div className="overflow-hidden">
                            <div className={`font-semibold truncate font-[var(--font-bell)] ${isActive ? 'text-[var(--color-yellow-main)]' : 'text-gray-900'}`}>{displayName}</div>
                            <div className="text-sm text-gray-500 truncate font-[var(--font-bell)]">
                                {new Date(convo.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
