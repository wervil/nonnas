import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2, Check, Loader2, X, RefreshCw, FileAudio } from 'lucide-react'

interface AudioRecorderProps {
    onSave: (blob: Blob) => void
    onCancel: () => void
}

export default function AudioRecorder({ onSave, onCancel }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [duration, setDuration] = useState(0)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (audioUrl) URL.revokeObjectURL(audioUrl)
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop()
            }
        }
    }, [audioUrl])

    const startRecording = async () => {
        setError(null)
        try {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Audio recording is not supported in this browser')
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)

            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                setAudioUrl(URL.createObjectURL(blob))

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)

            // Timer
            setDuration(0)
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= 300) { // 5 minutes max
                        stopRecording()
                        return prev
                    }
                    return prev + 1
                })
            }, 1000)

        } catch (err: any) {
            console.error('Error accessing microphone:', err)
            let msg = 'Could not access microphone.'

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'Access denied'
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = 'No mic found'
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                msg = 'Mic error'
            } else if (err.message) {
                // Truncate generic messages
                msg = err.message.length > 20 ? 'Mic error' : err.message
            }

            setError(msg)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    const simulateRecording = () => {
        // Create a dummy audio blob for testing purposes
        // This is useful when no microphone is available but we want to test the upload flow
        const dummyContent = new Uint8Array([0]) // Minimal content
        const blob = new Blob([dummyContent], { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setDuration(5) // Fake 5 seconds duration
        setError(null)
    }

    const togglePlayback = () => {
        if (!audioRef.current || !audioUrl) return

        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSave = () => {
        if (audioBlob) {
            onSave(audioBlob)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Waveform animation state
    const [waveformHeights, setWaveformHeights] = useState<number[]>(new Array(12).fill(15))

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isPlaying) {
            interval = setInterval(() => {
                setWaveformHeights(prev => prev.map(() => Math.max(15, Math.random() * 100)))
            }, 100)
        } else {
            // Reset to a calm state when not playing
            setWaveformHeights(new Array(12).fill(15))
        }
        return () => clearInterval(interval)
    }, [isPlaying])

    // Auto-start recording on mount
    useEffect(() => {
        startRecording()
    }, [])

    if (error) {
        return (
            <div className="flex items-center gap-1 p-1 pl-3 bg-red-50 text-red-600 rounded-full border border-red-200 animate-in fade-in slide-in-from-bottom-2 duration-200 h-[34px]">
                <span className="text-xs font-medium whitespace-nowrap" title={error}>{error}</span>
                <div className="flex items-center shrink-0 ml-1">
                    <button
                        onClick={startRecording}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors"
                        title="Retry"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {/* Simulation Button for Dev/Testing */}
                    <button
                        onClick={simulateRecording}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors text-blue-600 hover:text-blue-700"
                        title="Simulate Recording (Dev)"
                    >
                        <FileAudio className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors"
                        title="Cancel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 p-2 bg-[var(--color-primary-main)]/5 rounded-full border border-[var(--color-primary-border)] animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Recording State */}
            {!audioBlob ? (
                <>
                    <div className="flex items-center gap-2 pl-2">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </div>
                        <span className="text-sm font-medium font-[var(--font-bell)] text-red-600 w-12 tabular-nums">
                            {formatTime(duration)}
                        </span>
                    </div>

                    <button
                        onClick={stopRecording}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors"
                        title="Stop Recording"
                    >
                        <Square className="w-4 h-4 fill-current" />
                    </button>
                </>
            ) : (
                /* Review State */
                <>
                    <button
                        onClick={togglePlayback}
                        className="p-2 bg-[var(--color-primary-main)] text-white rounded-full hover:bg-[var(--color-primary-hover)] transition-colors"
                    >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    {/* Hidden Audio Element */}
                    <audio
                        ref={audioRef}
                        src={audioUrl || ''}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />

                    <div className="h-8 w-32 bg-[var(--color-primary-border)]/20 rounded-md flex items-center justify-center">
                        {/* Fake waveform visualization for UI polish */}
                        <div className="flex items-center gap-0.5 h-full px-2">
                            {waveformHeights.map((height, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-[var(--color-primary-main)]/40 rounded-full transition-all duration-100 ease-in-out"
                                    style={{ height: `${height}%` }}
                                />
                            ))}
                        </div>
                    </div>

                    <span className="text-xs text-[var(--color-text-pale)] font-medium tabular-nums">
                        {formatTime(duration)}
                    </span>

                    <div className="w-px h-6 bg-[var(--color-primary-border)]/30 mx-1" />

                    <button
                        onClick={handleSave}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                        title="Use Recording"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                </>
            )}

            <button
                onClick={onCancel}
                className="p-2 text-[var(--color-text-pale)] hover:bg-gray-100 hover:text-red-500 rounded-full transition-colors"
                title="Cancel"
            >
                {audioBlob ? <Trash2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
        </div>
    )
}
