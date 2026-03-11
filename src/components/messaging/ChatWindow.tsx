import { FileAudio, Link as LinkIcon, Paperclip, User, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import AudioPlayer from '../ui/AudioPlayer';
import { ImagesModal } from '../ui/ImagesModal';
import { AttachmentType, Message } from './types';

interface ChatWindowProps {
    messages: Message[];
    currentUserId: string;
    onSendMessage: (content: string, attachmentUrl?: string, attachmentType?: AttachmentType) => Promise<void>;
    onBack: () => void;
    otherUserId: string;
    otherUserName?: string;
    isLoading?: boolean;
}

export const ChatWindow = ({ messages, currentUserId, onSendMessage, onBack, otherUserName, isLoading }: ChatWindowProps) => {
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
    }, [messages, isLoading]); // scroll on loading change too

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
                return (
                    <Image
                        src={msg.attachment_url}
                        alt="attachment"
                        className="max-w-50 rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setClickedImage(msg.attachment_url!)}
                        width={200}
                        height={200}
                    />
                );
            case 'video':
                return <video src={msg.attachment_url} controls className="max-w-50 rounded-lg mt-2" />;
            case 'audio':
                return <AudioPlayer src={msg.attachment_url} className="mt-2 w-full max-w-62.5" />;
            case 'link':
                return <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-(--color-yellow-light) underline break-all mt-1 block hover:text-(--color-success-main) transition-colors">{msg.attachment_url}</a>;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white min-h-0 overflow-hidden">
            {/* Header */}
            <div className="p-3 md:p-6 lg:p-8 border-b border-gray-200 flex items-center justify-between bg-white shrink-0 gap-2 md:gap-4">
                <button
                    onClick={onBack}
                    className="group inline-flex items-center gap-2 md:gap-3 text-gray-500 hover:text-gray-900 transition-colors shrink-0"
                >
                    <span className="group-hover:-translate-x-1 transition-transform text-lg md:text-xl">←</span>
                    <span className="text-sm md:text-base lg:text-lg font-medium">Back</span>
                </button>
                <div className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 truncate">
                    {otherUserName || "User"}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 space-y-3 md:space-y-4 lg:space-y-6 bg-white min-h-0" ref={scrollRef}>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-[#6D2924] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 md:gap-4`}>
                                {!isMe && (
                                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-14 lg:h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm md:text-lg lg:text-xl shrink-0 shadow-sm">
                                        {(otherUserName || "U").substring(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div className={`max-w-[80%] md:max-w-[70%] lg:max-w-[60%] rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-5 shadow-sm ${isMe ? 'bg-[#F9FAFB] text-gray-900' : 'bg-[#FFCCC8] text-gray-900'}`}>
                                    {msg.content && <p className="wrap-break-word text-sm md:text-base lg:text-lg leading-relaxed">{msg.content}</p>}
                                    {renderAttachment(msg)}
                                    <div className={`text-xs md:text-sm lg:text-base mt-2 md:mt-3 ${isMe ? 'text-gray-600' : 'text-gray-500'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                {isMe && (
                                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-14 lg:h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm md:text-lg lg:text-xl shrink-0 shadow-sm">
                                        <User size={16} className="md:size-20 lg:size-24" />
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            <ImagesModal
                images={clickedImage ? [clickedImage] : null}
                onClose={() => setClickedImage(null)}
            />

            {/* Input */}
            {attachment && (
                <div className="px-3 py-2 md:px-4 lg:px-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                        {attachment.type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={attachment.preview} alt="Preview" className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 object-cover rounded-lg border border-gray-200" />
                        ) : attachment.type === 'video' ? (
                            <video src={attachment.preview} className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 object-cover rounded-lg border border-gray-200" />
                        ) : (
                            <div className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 bg-white rounded-lg flex items-center justify-center text-gray-500 border border-gray-200">
                                {attachment.type === 'audio' ? <FileAudio size={16} className="md:size-20 lg:size-24" /> : <LinkIcon size={16} className="md:size-20 lg:size-24" />}
                            </div>
                        )}
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm md:text-base font-medium truncate max-w-30 md:max-w-50 lg:max-w-62.5 text-gray-900">{attachment.file.name}</span>
                            <span className="text-xs md:text-sm text-gray-500 uppercase">{attachment.type}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setAttachment(null)}
                        className="p-2 md:p-3 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                        aria-label="Remove attachment"
                        title="Remove attachment"
                    >
                        <X size={16} className="md:size-18 lg:size-20" />
                    </button>
                </div>
            )}
            <div className="p-2 md:p-3 lg:p-4 border-t border-gray-200 bg-white flex items-center gap-2 md:gap-4 shrink-0">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 md:p-3 lg:p-4 text-gray-500 hover:text-amber-600 transition-colors"
                    aria-label="Attach file"
                    title="Attach file"
                >
                    <Paperclip size={16} className="size-10" />
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
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 md:px-4 md:py-3 lg:px-5 lg:py-4 text-sm md:text-base lg:text-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none shadow-sm"
                    placeholder="Share your thoughts about this recipe..."
                    maxLength={5000}
                    rows={1}
                    style={{ minHeight: '40px md:48px lg:60px' }}
                    value={inputText}
                    disabled={isSending}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />

                <button
                    disabled={isSending || (!inputText && !attachment)}
                    onClick={handleSend}
                    className="px-3 py-2 md:px-4 md:py-3 lg:px-6 lg:py-3 bg-[#FFCCC8] text-gray-900 rounded-full hover:bg-[#ffb8b3] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md font-medium text-sm md:text-base"
                    aria-label="Send message"
                    title="Send message"
                >
                    Send
                </button>
            </div>
        </div>
    );
};
