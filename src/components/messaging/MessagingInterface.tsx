'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/stack';
import { io, Socket } from 'socket.io-client';
import { Conversation, Message, AttachmentType } from './types';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export const MessagingInterface = () => {
    const user = useUser();

    const searchParams = useSearchParams();
    // No isOpen state needed for page view
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [loading, setLoading] = useState(false);

    // Deep link handler
    useEffect(() => {
        if (!searchParams) return;
        const chatWith = searchParams?.get('chatWith');
        const name = searchParams?.get('name');
        if (chatWith && user && !activeConvo) {
            startChat(chatWith, name || undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, user]);

    const startChat = async (targetId: string, targetName?: string) => {
        // No setIsOpen needed
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                body: JSON.stringify({ targetUserId: targetId, targetUserName: targetName })
            });
            if (res.ok) {
                const convo = await res.json();
                setActiveConvo(convo);
                fetchConversations(); // refresh list

                // Optional: Clean URL after successful load
                // const params = new URLSearchParams(searchParams.toString());
                // params.delete('chatWith');
                // router.replace(`${pathname}?${params.toString()}`);
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

    // Fetch conversations on mount
    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user]);

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
            } else {
                if (res.status === 400) {
                    const data = await res.json();
                    toast.error(data.error || 'Failed to send message');
                } else {
                    console.error('Failed to send message');
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    if (!user) return <div className="p-8 text-center text-[var(--color-text-pale)] font-[var(--font-bell)]">Please sign in to view messages.</div>;

    return (
        <div className="flex h-full w-full bg-[var(--color-brown-dark)] min-h-0 overflow-hidden">
            {/* Sidebar List - Hidden on mobile if activeConvo is selected */}
            <div className={`
                w-full md:w-80 lg:w-96 border-r border-[var(--color-primary-border)]/20 bg-[var(--color-brown-pale)] flex flex-col shadow-lg min-w-0 shrink-0
                ${activeConvo ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b border-[var(--color-primary-border)]/20 shrink-0">
                    <h2 className="font-bold text-xl text-[var(--color-yellow-light)] font-[var(--font-bell)]">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                    <ConversationList
                        conversations={conversations}
                        currentUserId={user.id}
                        onSelect={setActiveConvo}
                        isLoading={loading}
                    />
                </div>
            </div>

            {/* Chat Area - Hidden on mobile if no activeConvo */}
            <div className={`
                flex-1 flex flex-col bg-[var(--color-brown-pale)] min-w-0 min-h-0
                ${!activeConvo ? 'hidden md:flex' : 'flex'}
            `}>
                {activeConvo ? (() => {
                    const convoUserId = activeConvo.user1_id === user.id ? activeConvo.user2_id : activeConvo.user1_id;
                    const rawUserName = activeConvo.user1_id === user.id ? activeConvo.user2_name : activeConvo.user1_name;
                    const displayUserName = (rawUserName && rawUserName !== convoUserId) ? rawUserName : undefined;

                    return (
                        <ChatWindow
                            messages={messages}
                            currentUserId={user.id}
                            otherUserId={convoUserId}
                            otherUserName={displayUserName}
                            onBack={() => setActiveConvo(null)}
                            onSendMessage={handleSendMessage}
                        />
                    );
                })() : (
                    <div className="flex-1 flex items-center justify-center text-[var(--color-text-pale)] bg-[var(--color-brown-dark)]">
                        <div className="text-center">
                            <p className="text-lg font-medium text-[var(--color-yellow-light)] font-[var(--font-bell)]">Select a conversation</p>
                            <p className="text-sm font-[var(--font-bell)]">Choose a chat from the list to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
