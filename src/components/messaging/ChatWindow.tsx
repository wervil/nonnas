
import { FileAudio, Link as LinkIcon, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ImagesModal } from '../ui/ImagesModal';
import { AttachmentType, Message } from './types';

interface ChatWindowProps {
    messages: Message[];
    currentUserId: string;
    onSendMessage: (content: string, attachmentUrl?: string, attachmentType?: AttachmentType) => Promise<void>;
    onBack: () => void;
    otherUserId: string;
    otherUserName?: string;
}

export const ChatWindow = ({ messages, currentUserId, onSendMessage, onBack, otherUserId, otherUserName }: ChatWindowProps) => {
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [attachment, setAttachment] = useState<{ file: File; type: AttachmentType; preview: string } | null>(null);
    const [clickedImage, setClickedImage] = useState<string | null>(null);
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
                // eslint-disable-next-line @next/next/no-img-element
                return (
                    <img
                        src={msg.attachment_url}
                        alt="attachment"
                        className="max-w-[200px] rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setClickedImage(msg.attachment_url!)}
                    />
                );
            case 'video':
                return <video src={msg.attachment_url} controls className="max-w-[200px] rounded-lg mt-2" />;
            case 'audio':
                return <audio src={msg.attachment_url} controls className="mt-2 w-full max-w-[250px]" />;
            case 'link':
                return <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-[var(--color-yellow-light)] underline break-all mt-1 block hover:text-[var(--color-success-main)] transition-colors">{msg.attachment_url}</a>;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-brown-pale)] min-h-0 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--color-primary-border)]/20 flex items-center bg-[var(--color-brown-light)]/30 shrink-0">
                <button
                    onClick={onBack}
                    className="group inline-flex items-center gap-1 text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] transition-colors"
                >
                    <span className="group-hover:-translate-x-1 transition-transform font-[var(--font-bell)]">←</span>
                    <span className="font-[var(--font-bell)]">Back</span>
                </button>
                <div className="ml-6 font-[var(--font-bell)] text-xl font-bold text-[var(--color-yellow-light)]">
                    Chat with {otherUserName || "--"}...
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-brown-dark)] min-h-0" ref={scrollRef}>
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl p-3 font-[var(--font-bell)] ${isMe ? '!bg-[var(--color-green-dark)] !text-[var(--color-yellow-light)]' : 'bg-[var(--color-brown-pale)] text-[var(--color-text-pale)] border border-[var(--color-primary-border)]/20'}`}>
                                {msg.content && <p className="break-words">{msg.content}</p>}
                                {renderAttachment(msg)}
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-[var(--color-yellow-light)]/70' : 'text-[var(--color-text-pale)]/70'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <ImagesModal
                images={clickedImage ? [clickedImage] : null}
                onClose={() => setClickedImage(null)}
            />

            {/* Input */}
            {attachment && (
                <div className="px-4 py-2 border-t border-[var(--color-primary-border)]/20 bg-[var(--color-brown-light)]/30 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {attachment.type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={attachment.preview} alt="Preview" className="h-12 w-12 object-cover rounded-md" />
                        ) : attachment.type === 'video' ? (
                            <video src={attachment.preview} className="h-12 w-12 object-cover rounded-md" />
                        ) : (
                            <div className="h-12 w-12 bg-[var(--color-brown-pale)] rounded-md flex items-center justify-center text-[var(--color-text-pale)] border border-[var(--color-primary-border)]/20">
                                {attachment.type === 'audio' ? <FileAudio size={20} /> : <LinkIcon size={20} />}
                            </div>
                        )}
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate max-w-[150px] text-[var(--color-yellow-light)] font-[var(--font-bell)]">{attachment.file.name}</span>
                            <span className="text-xs text-[var(--color-text-pale)] uppercase font-[var(--font-bell)]">{attachment.type}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setAttachment(null)}
                        className="p-1 hover:bg-[var(--color-brown-pale)] rounded-full transition-colors text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)]"
                        aria-label="Remove attachment"
                        title="Remove attachment"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            <div className="p-3 border-t border-[var(--color-primary-border)]/20 bg-[var(--color-brown-light)]/30 flex items-center gap-2 shrink-0">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] transition-colors"
                    aria-label="Attach file"
                    title="Attach file"
                >
                    <Paperclip size={20} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    aria-label="File input"
                // accept="image/*,video/*,audio/*" // allow all
                />
                <textarea
                    className="flex-1 bg-[var(--color-brown-pale)] border border-[var(--color-primary-border)]/30 rounded-md px-4 py-2 text-[var(--color-text-pale)] placeholder-[var(--color-text-pale)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-green-dark)]/50 focus:border-[var(--color-green-dark)]/50 font-[var(--font-bell)]"
                    placeholder="Type a message..."
                    maxLength={5000}
                    rows={2}
                    value={inputText}
                    disabled={isSending}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />

                <button
                    disabled={isSending || (!inputText && !attachment)}
                    onClick={handleSend}
                    className="p-2 !bg-[var(--color-green-dark)] !text-[var(--color-yellow-light)] rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    aria-label="Send message"
                    title="Send message"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};
