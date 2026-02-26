"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

// Define the specific levels of navigation for our gamified Earth experience
export type ZoomLevel =
    | "EARTH"
    | "CONTINENT"
    | "COUNTRY"
    | "STATE"
    | "CITY"
    | "NONNA";

// Optional: Define ranges for programmatic flying
export const ZOOM_RANGES: Record<ZoomLevel, number> = {
    EARTH: 30000000,
    CONTINENT: 8000000,
    COUNTRY: 3000000,
    STATE: 800000,
    CITY: 50000,
    NONNA: 200, // Very close for the door animation
};

interface EarthState {
    currentLevel: ZoomLevel;
    activeContinent: string | null;
    activeCountry: string | null;
    activeState: string | null;
    activeCity: string | null;
    activeNonnaId: string | null;
    isTransitioning: boolean;
}

interface EarthNavigationContextType extends EarthState {
    setLevel: (level: ZoomLevel) => void;
    setSelection: (selection: Partial<Omit<EarthState, "currentLevel" | "isTransitioning">>) => void;
    setIsTransitioning: (isTransitioning: boolean) => void;
    resetToEarth: () => void;
}

const initialState: EarthState = {
    currentLevel: "EARTH",
    activeContinent: null,
    activeCountry: null,
    activeState: null,
    activeCity: null,
    activeNonnaId: null,
    isTransitioning: false,
};

const EarthNavigationContext = createContext<EarthNavigationContextType | undefined>(undefined);

export function EarthNavigationProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<EarthState>(initialState);

    const setLevel = useCallback((level: ZoomLevel) => {
        setState((prev) => ({ ...prev, currentLevel: level }));
    }, []);

    const setSelection = useCallback((selection: Partial<Omit<EarthState, "currentLevel" | "isTransitioning">>) => {
        setState((prev) => ({ ...prev, ...selection }));
    }, []);

    const setIsTransitioning = useCallback((isTransitioning: boolean) => {
        setState((prev) => ({ ...prev, isTransitioning }));
    }, []);

    const resetToEarth = useCallback(() => {
        setState(initialState);
    }, []);

    const value = useMemo(() => ({
        ...state,
        setLevel,
        setSelection,
        setIsTransitioning,
        resetToEarth,
    }), [state, setLevel, setSelection, setIsTransitioning, resetToEarth]);

    return (
        <EarthNavigationContext.Provider value={value}>
            {children}
        </EarthNavigationContext.Provider>
    );
}

export function useEarthNavigation() {
    const context = useContext(EarthNavigationContext);
    if (context === undefined) {
        throw new Error("useEarthNavigation must be used within an EarthNavigationProvider");
    }
    return context;
}
