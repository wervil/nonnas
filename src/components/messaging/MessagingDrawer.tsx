'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/stack';
import { io, Socket } from 'socket.io-client';
import { Conversation, Message, AttachmentType } from './types';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { X, MessageCircle } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export const MessagingDrawer = () => {
    const user = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [loading, setLoading] = useState(false);

    // Deep link handler
    useEffect(() => {
        if (!searchParams) return;
        const chatWith = searchParams.get('chatWith');
        if (chatWith && user && !activeConvo) {
            startChat(chatWith);
        }
    }, [searchParams, user]);

    const startChat = async (targetId: string) => {
        setIsOpen(true);
        // Clean URL
        if (searchParams) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('chatWith');
            router.replace(`${pathname}?${params.toString()}`);
        }

        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                body: JSON.stringify({ targetUserId: targetId })
            });
            if (res.ok) {
                const convo = await res.json();
                setActiveConvo(convo);
                fetchConversations(); // refresh list
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Initializer socket
    useEffect(() => {
        // Only connect if user is logged in
        if (!user) return;

        // Hit the API route to start the socket server
        fetch('/api/socket');

        const s = io({
            path: '/api/socket',
            addTrailingSlash: false,
        });

        s.on('connect', () => {
            console.log('Socket connected');
        });

        setSocket(s);

        return () => { s.disconnect() };
    }, [user]);

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        const handler = (msg: Message) => {
            console.log('Received msg', msg);
            // If active convo matches, append
            if (activeConvo && msg.conversation_id === activeConvo.id) {
                setMessages(prev => {
                    // avoid duplicates just in case
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }
        };

        socket.on('new-message', handler);
        return () => { socket.off('new-message', handler) };
    }, [socket, activeConvo]);

    // Join room when active convo changes
    useEffect(() => {
        if (socket && activeConvo) {
            socket.emit('join-conversation', activeConvo.id.toString());
        }
    }, [socket, activeConvo]);

    // Fetch conversations when drawer opens
    useEffect(() => {
        if (isOpen && user) {
            fetchConversations();
        }
    }, [isOpen, user]);

    // Fetch messages when entering chat
    useEffect(() => {
        if (activeConvo) {
            fetchMessages(activeConvo.id);
        }
    }, [activeConvo]);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/conversations');
            const data = await res.json();
            if (Array.isArray(data)) setConversations(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const fetchMessages = async (id: number) => {
        try {
            const res = await fetch(`/api/conversations/${id}/messages`);
            const data = await res.json();
            if (Array.isArray(data)) setMessages(data);
        } catch (e) { console.error(e) }
    }

    const handleSendMessage = async (content: string, url?: string, type?: AttachmentType) => {
        if (!activeConvo || !user) return;

        const payload = {
            conversation_id: activeConvo.id,
            content,
            attachment_url: url,
            attachment_type: type
        };

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedMsg = await res.json();
                setMessages(prev => [...prev, savedMsg]);

                // Emit to socket for others
                socket?.emit('send-message', savedMsg);
            }
        } catch (error) {
            console.error(error);
        }
    }

    if (!user) return null;

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[9999] p-4 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 transition"
            >
                <MessageCircle size={24} />
            </button>

            {/* Drawer Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex justify-end bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        {!activeConvo && (
                            <div className="p-4 border-b flex justify-between items-center">
                                <h2 className="font-bold text-lg">Messages</h2>
                                <button onClick={() => setIsOpen(false)}><X /></button>
                            </div>
                        )}

                        <div className="flex-1 overflow-hidden relative">
                            {activeConvo ? (
                                <ChatWindow
                                    messages={messages}
                                    currentUserId={user.id}
                                    otherUserId={activeConvo.user1_id === user.id ? activeConvo.user2_id : activeConvo.user1_id}
                                    onBack={() => setActiveConvo(null)}
                                    onSendMessage={handleSendMessage}
                                />
                            ) : (
                                <ConversationList
                                    conversations={conversations}
                                    currentUserId={user.id}
                                    onSelect={setActiveConvo}
                                    isLoading={loading}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
