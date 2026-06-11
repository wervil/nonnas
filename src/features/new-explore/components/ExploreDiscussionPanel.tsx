"use client";

import DiscussionPanel from "@/components/Map/DiscussionPanel";
import type { PanelNonna, ZoomLevel } from "../types";

export default function ExploreDiscussionPanel({
  isOpen,
  onClose,
  region,
  regionDisplayName,
  scope,
  mapZoomLevel,
  country,
  state,
  city,
  nonnas,
  initialTab,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  region: string;
  regionDisplayName: string;
  scope: "continent" | "country" | "state" | "city";
  mapZoomLevel?: ZoomLevel;
  country?: string;
  state?: string;
  city?: string;
  nonnas: PanelNonna[];
  initialTab: "discussion" | "nonnas";
  isLoading: boolean;
}) {
  return (
    <DiscussionPanel
      isOpen={isOpen}
      onClose={onClose}
      region={region}
      regionDisplayName={regionDisplayName}
      scope={scope}
      mapZoomLevel={mapZoomLevel}
      country={country}
      state={state}
      city={city}
      nonnas={nonnas}
      initialTab={initialTab}
      isLoading={isLoading}
    />
  );
}
