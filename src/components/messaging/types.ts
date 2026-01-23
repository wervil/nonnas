export type AttachmentType = 'image' | 'video' | 'audio' | 'link';

export interface Message {
    id: number;
    conversation_id: number;
    sender_id: string;
    content: string | null;
    attachment_url: string | null;
    attachment_type: AttachmentType | null;
    is_read: boolean;
    created_at: string; // serialized date
}

export interface Conversation {
    id: number;
    user1_id: string;
    user2_id: string;
    updated_at: string;
    // enriched fields
    otherUser?: {
        id: string;
        name?: string; // If we can fetch it
    };
    lastMessage?: Message;
}
