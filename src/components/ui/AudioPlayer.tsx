import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react'

interface AudioPlayerProps {
    src: string
    className?: string
}

export default function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateProgress = () => {
            setCurrentTime(audio.currentTime)
            setProgress((audio.currentTime / audio.duration) * 100)
        }

        const handleLoadedMetadata = () => {
            setDuration(audio.duration)
        }

        const handleEnded = () => {
            setIsPlaying(false)
            setProgress(0)
            setCurrentTime(0)
        }

        audio.addEventListener('timeupdate', updateProgress)
        audio.addEventListener('loadedmetadata', handleLoadedMetadata)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', updateProgress)
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    const togglePlay = () => {
        if (!audioRef.current) return
        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return
        const newTime = (Number(e.target.value) / 100) * duration
        audioRef.current.currentTime = newTime
        setProgress(Number(e.target.value))
    }

    const toggleMute = () => {
        if (!audioRef.current) return
        const newMuted = !isMuted
        audioRef.current.muted = newMuted
        setIsMuted(newMuted)
    }

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00'
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className={`flex items-center gap-3 bg-[var(--color-primary-main)]/5 border border-[var(--color-primary-border)] rounded-full px-3 py-2 w-full max-w-md shadow-sm ${className}`}>
            <audio ref={audioRef} src={src} preload="metadata" />

            <button
                onClick={togglePlay}
                className="p-2 bg-[var(--color-primary-main)] text-white rounded-full hover:bg-[var(--color-primary-hover)] transition-colors shrink-0"
                title={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress || 0}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-[var(--color-primary-border)]/30 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary-main)]"
                    style={{
                        backgroundSize: `${progress}% 100%`,
                    }}
                />
                <div className="flex justify-between text-[10px] text-[var(--color-text-pale)] font-medium tabular-nums font-[var(--font-bell)]">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <button
                onClick={toggleMute}
                className="p-1.5 text-[var(--color-text-pale)] hover:bg-[var(--color-primary-border)]/10 rounded-full transition-colors shrink-0"
                title={isMuted ? "Unmute" : "Mute"}

            >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
        </div>
    )
}
