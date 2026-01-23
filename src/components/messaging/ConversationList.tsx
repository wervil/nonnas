import { Conversation } from './types';

interface ConversationListProps {
    conversations: Conversation[];
    currentUserId: string;
    onSelect: (conversation: Conversation) => void;
    isLoading: boolean;
}

export const ConversationList = ({ conversations, currentUserId, onSelect, isLoading }: ConversationListProps) => {
    if (isLoading) {
        return <div className="p-4 text-center text-stone-500">Loading chats...</div>;
    }

    if (conversations.length === 0) {
        return (
            <div className="p-4 text-center text-stone-500">
                <p>No messages yet.</p>
                <p className="text-sm mt-2">Visit a profile to start a chat.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col divide-y divide-stone-200">
            {conversations.map((convo) => {
                const otherUserId = convo.user1_id === currentUserId ? convo.user2_id : convo.user1_id;

                return (
                    <button
                        key={convo.id}
                        onClick={() => onSelect(convo)}
                        className="p-4 hover:bg-stone-50 transition-colors text-left flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold shrink-0">
                            {otherUserId.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-semibold truncate">User {otherUserId.substring(0, 8)}...</div>
                            <div className="text-sm text-stone-500 truncate">
                                {new Date(convo.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
