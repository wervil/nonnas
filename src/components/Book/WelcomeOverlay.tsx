'use client'

import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/Typography'
import Button from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

const WELCOME_DISMISSED_KEY = 'welcome_dismissed_home_v2'

export const WelcomeOverlay = () => {
    const l = useTranslations('labels')
    const [isVisible, setIsVisible] = useState(true)

    const handleEnter = () => {
        setIsVisible(false)
        sessionStorage.setItem(WELCOME_DISMISSED_KEY, 'true')
    }

    useEffect(() => {
        if (sessionStorage.getItem(WELCOME_DISMISSED_KEY) === 'true') {
            setIsVisible(false)
        }
    }, [])

    useEffect(() => {
        const openOverlay = () => setIsVisible(true)
        window.addEventListener('open-welcome-overlay', openOverlay)
        return () => {
            window.removeEventListener('open-welcome-overlay', openOverlay)
        }
    }, [])

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-[5000] flex items-start md:items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-in fade-in duration-500 overflow-y-auto">
            <div className="relative w-full max-w-[100vw] md:max-w-[500px] h-[90%] md:h-auto aspect-[3/4] animate-in duration-500 my-4">


                <div className="absolute inset-0 flex items-center justify-center ">
                    <button
                        type="button"
                        onClick={handleEnter}
                        className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                        aria-label="Close welcome overlay"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="info-wrap flex flex-col items-center justify-center text-center !px-6 !rounded-[20px] w-full h-full overflow-y-auto">
                        {/* Logo */}
                        <div className="mb-4 flex justify-center">
                            <Image
                                src="/logoMain.svg"      // or /logo.png
                                alt="App logo"
                                width={148}
                                height={88}
                                priority
                            />
                        </div>
                        <Typography  weight="bold" color="white" className="mb-4 md:mb-6 font-imprint drop-shadow-lg sm:text-[24px] text-[17px]">
                            {l('infoTitle')}
                        </Typography>
                        <div className="space-y-4 md:space-y-6 max-h-[50vh] overflow-y-auto">
                            <Typography size="body" color="white" className="leading-relaxed drop-shadow-md text-sm md:text-base">
                                {l('infoDescr')}
                            </Typography>
                            <Typography size="body" color="white" className="leading-relaxed drop-shadow-md text-sm md:text-base">
                                {l('infoDescrAdd')}
                            </Typography>
                        </div>
                        <div className="mt-8 md:mt-10">
                            <Button
                                onClick={handleEnter}
                                className="px-8 py-3 text-lg bg-amber-900/40 hover:bg-amber-900/60 border-amber-200/40 hover:border-amber-200/60 text-amber-50 shadow-lg transition-all transform hover:scale-105"
                            >
                                Enter Book
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
