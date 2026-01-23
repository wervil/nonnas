import { useState, useRef, useEffect } from 'react';
import { Message, AttachmentType } from './types';
import { Paperclip, Send, X, FileAudio, Link as LinkIcon } from 'lucide-react';

interface ChatWindowProps {
    messages: Message[];
    currentUserId: string;
    onSendMessage: (content: string, attachmentUrl?: string, attachmentType?: AttachmentType) => Promise<void>;
    onBack: () => void;
    otherUserId: string;
}

export const ChatWindow = ({ messages, currentUserId, onSendMessage, onBack, otherUserId }: ChatWindowProps) => {
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [attachment, setAttachment] = useState<{ file: File; type: AttachmentType; preview: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            let type: AttachmentType = 'link'; // default fallback
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            const preview = URL.createObjectURL(file);
            setAttachment({ file, type, preview });
        }
    };

    const uploadToCloudinary = async (file: File): Promise<string> => {
        // Generate timestamp ONCE
        const timestamp = Math.floor(Date.now() / 1000);

        // 1. Get signature
        const signRes = await fetch('/api/cloudinary/sign', {
            method: 'POST',
            body: JSON.stringify({ paramsToSign: { timestamp } })
        });
        const { signature } = await signRes.json();

        // 2. Upload
        const formData = new FormData();
        formData.append('file', file);
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
        const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;

        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);

        // Note: 'auto' resource type usually works, or specific.
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await uploadRes.json();
        if (data.error) throw new Error(data.error.message);
        return data.secure_url;
    }

    const handleSend = async () => {
        if ((!inputText.trim() && !attachment) || isSending) return;
        setIsSending(true);

        try {
            let attachmentUrl = undefined;
            let attachmentType = undefined;

            if (attachment) {
                // Upload
                // check if CLOUDINARY env vars exist, else mock or error
                if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
                    alert('Cloudinary not configured');
                    setIsSending(false);
                    return;
                }
                attachmentUrl = await uploadToCloudinary(attachment.file);
                attachmentType = attachment.type;
            }

            await onSendMessage(inputText, attachmentUrl, attachmentType);
            setInputText('');
            setAttachment(null);
        } catch (e) {
            console.error(e);
            alert('Failed to send');
        } finally {
            setIsSending(false);
        }
    };

    const renderAttachment = (msg: Message) => {
        if (!msg.attachment_url || !msg.attachment_type) return null;

        switch (msg.attachment_type) {
            case 'image':
                return <img src={msg.attachment_url} alt="attachment" className="max-w-[200px] rounded-lg mt-2" />;
            case 'video':
                return <video src={msg.attachment_url} controls className="max-w-[200px] rounded-lg mt-2" />;
            case 'audio':
                return <audio src={msg.attachment_url} controls className="mt-2 w-full max-w-[250px]" />;
            case 'link':
                return <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-blue-500 underline break-all mt-1 block">{msg.attachment_url}</a>;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center">
                <button
                    onClick={onBack}
                    className="group inline-flex items-center gap-1 text-gray-400 font-serif hover:text-gray-900 transition-colors"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    <span className="font-[var(--font-bell)]">Back</span>
                </button>
                <div className="ml-6 font-[var(--font-bell)] text-xl font-bold text-gray-900">
                    Chat with {otherUserId.substring(0, 6)}...
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl p-3 ${isMe ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-900'}`}>
                                {msg.content && <p>{msg.content}</p>}
                                {renderAttachment(msg)}
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-amber-100' : 'text-stone-400'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Input */}
            {attachment && (
                <div className="px-4 py-2 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {attachment.type === 'image' ? (
                            <img src={attachment.preview} alt="Preview" className="h-12 w-12 object-cover rounded-md" />
                        ) : attachment.type === 'video' ? (
                            <video src={attachment.preview} className="h-12 w-12 object-cover rounded-md" />
                        ) : (
                            <div className="h-12 w-12 bg-stone-200 rounded-md flex items-center justify-center text-stone-500">
                                {attachment.type === 'audio' ? <FileAudio size={20} /> : <LinkIcon size={20} />}
                            </div>
                        )}
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate max-w-[150px]">{attachment.file.name}</span>
                            <span className="text-xs text-stone-500 uppercase">{attachment.type}</span>
                        </div>
                    </div>
                    <button onClick={() => setAttachment(null)} className="p-1 hover:bg-stone-200 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}
            <div className="p-3 border-t border-stone-200 flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-stone-400 hover:text-amber-600">
                    <Paperclip size={20} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                // accept="image/*,video/*,audio/*" // allow all
                />
                <input
                    className="flex-1 bg-stone-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                    disabled={isSending || (!inputText && !attachment)}
                    onClick={handleSend}
                    className="p-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 disabled:opacity-50"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};
