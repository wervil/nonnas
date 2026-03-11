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
            <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-3 font-(--font-bell)">
                <div className="w-6 h-6 border-2 border-[#6D2924] border-t-transparent rounded-full animate-spin"></div>
                <div>Loading chats...</div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 font-(--font-bell)">
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
                        className={`relative flex items-center gap-3 md:gap-4 p-3 md:p-6 rounded-lg cursor-pointer transition-colors
                            ${isActive ? 'bg-white shadow-sm border-l-4 border-[#6D2924]' : 'bg-[#f9fafb] hover:bg-gray-100'}
                        `}
                    >
                        <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border text-sm md:text-xl ${isActive
                            ? 'bg-white text-(--color-yellow-main) border-l border-[#6D2924]'
                            : 'bg-(--color-yellow-bg) text-(--color-yellow-main) border-[#6D2924]'
                            }`}>
                            {initials}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <div className={`font-(--font-bell) text-sm md:text-lg truncate ${isActive ? 'text-(--color-yellow-main)' : 'text-gray-900'}`}>{displayName}</div>
                            <div className="text-xs md:text-base text-gray-500 truncate font-(--font-bell)">
                                {new Date(convo.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
