'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/stack';
import { io, Socket } from 'socket.io-client';
import { Conversation, Message, AttachmentType } from './types';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { useSearchParams } from 'next/navigation';

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
        if (chatWith && user && !activeConvo) {
            startChat(chatWith);
        }
    }, [searchParams, user]);

    const startChat = async (targetId: string) => {
        // No setIsOpen needed
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                body: JSON.stringify({ targetUserId: targetId })
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
            }
        } catch (error) {
            console.error(error);
        }
    }

    if (!user) return <div className="p-8 text-center text-gray-500">Please sign in to view messages.</div>;

    return (
        <div className="flex flex-1 h-full bg-gray-50">
            {/* Sidebar List - Hidden on mobile if activeConvo is selected */}
            <div className={`
                w-full md:w-80 lg:w-96 border-r bg-white flex flex-col
                ${activeConvo ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b">
                    <h2 className="font-bold text-xl text-gray-800">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
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
                flex-1 flex flex-col bg-white
                ${!activeConvo ? 'hidden md:flex' : 'flex'}
            `}>
                {activeConvo ? (
                    <ChatWindow
                        messages={messages}
                        currentUserId={user.id}
                        otherUserId={activeConvo.user1_id === user.id ? activeConvo.user2_id : activeConvo.user1_id}
                        onBack={() => setActiveConvo(null)}
                        onSendMessage={handleSendMessage}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
                        <div className="text-center">
                            <p className="text-lg font-medium">Select a conversation</p>
                            <p className="text-sm">Choose a chat from the list to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
