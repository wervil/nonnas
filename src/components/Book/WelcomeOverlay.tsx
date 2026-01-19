'use client'

import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/Typography'
import Button from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export const WelcomeOverlay = () => {
    const l = useTranslations('labels')
    const [isVisible, setIsVisible] = useState(true)

    const handleEnter = () => {
        setIsVisible(false)
        sessionStorage.setItem('welcome_dismissed', 'true')
    }

    useEffect(() => {
        if (sessionStorage.getItem('welcome_dismissed') === 'true') {
            setIsVisible(false)
        }
    }, [])

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-in fade-in duration-500">
            <div className="relative w-full max-w-[100vw] md:max-w-[500px] aspect-[3/4] animate-in  duration-500 ">

            
                <div className="absolute inset-0 flex items-center justify-center ">

                    <div className="info-wrap flex flex-col items-center justify-center text-center !px-6 !rounded-[20px] w-full h-full ">
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
                        <Typography size="h3" weight="bold" color="white" className="mb-4 md:mb-6 font-imprint drop-shadow-lg">
                            {l('infoTitle')}
                        </Typography>
                        <div className="space-y-4 md:space-y-6 max-h-[50vh] overflow-y-auto scrollbar-hide">
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
