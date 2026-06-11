"use client";

import { memo } from "react";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import type { EarthMap3DController } from "../hooks/useEarthMap3DController";
import { countryFlag, generateAvatarSvgUri } from "../lib/markers";
import {
  STREET_VIEW_RETURN_STORAGE_KEY,
  TEAL,
  ZOOM_LEVEL_META,
  ZOOM_RANGES,
} from "../constants";
import type { StreetViewReturnPayload, ZoomLevel } from "../types";
import { parseAdminLevelsFromGeocodeResult } from "../lib/geocode";
import { mapRecipesToPanelNonnas } from "../lib/recipes";

const ZoomControls = dynamic(() => import("./ZoomControls"), { ssr: false });
const StreetViewLayer = dynamic(() => import("./StreetViewLayer"), { ssr: false });
const ExploreDiscussionPanel = dynamic(() => import("./ExploreDiscussionPanel"), { ssr: false });
const ExploreCommentsDrawer = dynamic(() => import("./ExploreCommentsDrawer"), { ssr: false });

export type { EarthMap3DController };

function EarthMap3DOverlays(props: EarthMap3DController) {
  const {
    setContainerRef,
    overlayRef,
    map3dRef,
    streetViewContainerRef,
    streetViewPanoramaRef,
    currentNonnaRef,
    geoJsonCacheRef,
    continentGeoJsonCacheRef,
    stateGeoJsonCacheRef,
    currentMarkersRef,
    clearCurrentMarkers,
    user,
    l,
    searchTimeoutRef,
    searchInputRef,
    geocoderRef,
    viewportCountryRef,
    viewportCountryCodeRef,
    viewportContinentRef,
    currentLevelRef,
    streetViewPickModeRef,
    pendingStreetViewRestoreRef,
    hasAppliedStreetViewRestoreRef,
    handleStreetViewButtonClick,
    activateStreetViewAt,
    activateStreetViewAtRef,
    flightStateRef,
    allClustersRef,
    viewportCityRef,
    viewportRegionRef,
    regionFilterFromClickRef,
    cityFilterFromClickRef,
    individualFetchSeqRef,
    filterMarkersNearCenter,
    filterByViewportCountry,
    filterByViewportContinent,
    applyClusterLevel,
    fetchIndividualNonnas,
    beginCityDrill,
    getIndividualMarkerFilters,
    fetchAndDrawBoundaryRef,
    suppressNextLevelHighlightRef,
    drawContinentHighlight,
    highlightingRef,
    followCenterHighlightRef,
    refreshMarkersForLevel,
    updateViewportContext,
    handleClusterClick,
    handleZoomIn,
    handleZoomOut,
    mobileStyles,
    performSearch,
    handleSearchInputChange,
    handleSearchResultClick,
    streetViewActive,
    streetViewPickMode,
    activePlaceName,
    activeCountry,
    hoveredLabel,
    clickedLabel,
    nonnaData,
    mapReady,
    is3DMode,
    isMobile,
    highlightedContinent,
    previousLevel,
    currentLocation,
    searchQuery,
    searchResults,
    isSearching,
    showSearchResults,
    panel,
    commentSection,
    streetViewNonnaPopup,
    streetViewToast,
    currentLevel,
    setLevel,
    setStreetViewActive,
    setStreetViewPickMode,
    setStreetViewNonnaPopup,
    setCommentSection,
    setPanel,
    setIs3DMode,
    setStreetViewToast,
  } = props;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        ref={setContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      />

      {/* Street View overlay — shown at NONNA level when available */}
      <div
        ref={streetViewContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: streetViewActive ? 5 : -1,
          opacity: streetViewActive ? 1 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: streetViewActive ? "auto" : "none",
        }}
      />

      {/* Street View nonna avatar overlay (real DOM, projected from world coords) */}
      {streetViewActive && streetViewPanoramaRef.current && (
        <StreetViewLayer
          streetViewPanorama={streetViewPanoramaRef.current}
          containerRef={streetViewContainerRef}
          nonnaData={nonnaData}
          currentNonnaPhoto={currentNonnaRef.current?.photo ?? null}
          currentNonnaRecipeId={currentNonnaRef.current?.recipeId ?? null}
          onAvatarClick={(nonna) => {
            if (nonna.nonnaCount === 1 && nonna.recipeId) {
              const clickedRecipeId = parseInt(nonna.recipeId.toString(), 10);
              // If this is the nonna we already resolved (with the real photo from
              // the recipe payload), prefer that data over the cluster aggregate —
              // the aggregate's repPhoto can be null even when a real photo exists.
              const cached = currentNonnaRef.current;
              const useCached = cached && cached.recipeId === clickedRecipeId;

              const nonnaName = useCached
                ? cached!.name
                : nonna.representativeName;
              const nonnaTitle = useCached
                ? cached!.title
                : nonna.representativeTitle;
              const nonnaPhoto = useCached
                ? cached!.photo
                : nonna.representativePhoto || null;
              const nonnaCountryName = useCached
                ? cached!.countryName
                : nonna.countryName;
              const nonnaCountryCode = useCached
                ? cached!.countryCode
                : nonna.countryCode;

              // Open the Street View popup
              setStreetViewNonnaPopup({
                open: true,
                recipeId: clickedRecipeId,
                name: nonnaName,
                title: nonnaTitle,
                photo: nonnaPhoto,
                countryName: nonnaCountryName,
                countryCode: nonnaCountryCode,
              });

              // Also open the comment panel for this nonna
              setCommentSection({
                open: true,
                recipeId: clickedRecipeId,
                nonnaDisplayName: nonnaName,
                titleName: nonnaTitle,
                photo: nonnaPhoto,
                countryCode: nonnaCountryCode,
              });
            }
          }}
        />
      )}

      {/* In-Street-View nonna popup card (lives outside the discussion tab) */}
      {streetViewActive && streetViewNonnaPopup.open && (
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? "24px" : "40px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(16px)",
            borderRadius: "20px",
            boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
            border: "1px solid rgba(94,234,212,0.5)",
            padding: isMobile ? "14px 16px" : "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "12px" : "16px",
            maxWidth: isMobile ? "calc(100vw - 32px)" : "440px",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              streetViewNonnaPopup.photo ||
              generateAvatarSvgUri(
                streetViewNonnaPopup.name,
                streetViewNonnaPopup.countryCode,
              )
            }
            alt={streetViewNonnaPopup.name}
            style={{
              width: isMobile ? "56px" : "72px",
              height: isMobile ? "56px" : "72px",
              borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid ${TEAL.light}`,
              flexShrink: 0,
              boxShadow: `0 4px 16px ${TEAL.glow}`,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: isMobile ? "15px" : "17px",
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {streetViewNonnaPopup.name}
            </div>
            {streetViewNonnaPopup.countryName && (
              <div
                style={{
                  fontSize: isMobile ? "11px" : "12px",
                  color: "#6b7280",
                  marginTop: "2px",
                }}
              >
                {countryFlag(streetViewNonnaPopup.countryCode)}{" "}
                {streetViewNonnaPopup.countryName}
              </div>
            )}
            <button
              onClick={() => {
                const panorama = streetViewPanoramaRef.current;
                if (panorama) {
                  const position = panorama.getPosition?.();
                  const pov = panorama.getPov?.();
                  const zoom = Number(panorama.getZoom?.() ?? 1);
                  if (position && pov) {
                    const lat =
                      typeof position.lat === "function"
                        ? position.lat()
                        : position.lat;
                    const lng =
                      typeof position.lng === "function"
                        ? position.lng()
                        : position.lng;
                    const heading = Number(pov.heading ?? 0);
                    const pitch = Number(pov.pitch ?? 0);
                    if (
                      Number.isFinite(lat) &&
                      Number.isFinite(lng) &&
                      Number.isFinite(heading) &&
                      Number.isFinite(pitch) &&
                      Number.isFinite(zoom)
                    ) {
                      const payload: StreetViewReturnPayload = {
                        lat,
                        lng,
                        heading,
                        pitch,
                        zoom,
                        recipeId: streetViewNonnaPopup.recipeId,
                        nonnaName: streetViewNonnaPopup.name,
                        nonnaTitle: streetViewNonnaPopup.title,
                        nonnaPhoto: streetViewNonnaPopup.photo,
                        countryName: streetViewNonnaPopup.countryName,
                        countryCode: streetViewNonnaPopup.countryCode,
                      };
                      window.sessionStorage?.setItem(
                        STREET_VIEW_RETURN_STORAGE_KEY,
                        JSON.stringify(payload),
                      );
                    }
                  }
                }
                window.location.href = `/?recipe=${streetViewNonnaPopup.recipeId}&from=street-view`;
              }}
              style={{
                marginTop: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                background: TEAL.primary,
                color: "white",
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: `0 2px 8px ${TEAL.glow}`,
              }}
            >
              Read Her Story →
            </button>
          </div>
          <button
            onClick={() =>
              setStreetViewNonnaPopup({ ...streetViewNonnaPopup, open: false })
            }
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              padding: "4px",
              alignSelf: "flex-start",
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search Bar - Mobile responsive */}
      <div
        style={{
          position: "absolute",
          left: isMobile ? "12px" : "24px",
          top: isMobile ? "12px" : "24px",
          right: isMobile ? "12px" : "auto",
          zIndex: 100,
          width: isMobile ? "auto" : "320px",
          maxWidth: isMobile ? "calc(100vw - 24px)" : "320px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "6px" : 0,
        }}
      >
        <div
          ref={searchInputRef}
          style={{
            position: "relative",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            border: "1px solid rgba(13, 148, 136, 0.2)",
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                e.preventDefault();
                performSearch(searchQuery);
              }
            }}
            placeholder="Search for a city, country, or region..."
            style={{
              width: "100%",
              padding: isMobile ? "14px 48px 14px 16px" : "16px 52px 16px 20px",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: isMobile ? "16px" : "15px",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              color: "#1f2937",
              borderRadius: "16px",
              WebkitTapHighlightColor: "transparent",
            }}
          />
          {/* Search icon */}
          <div
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              color: isSearching ? TEAL.primary : "#9ca3af",
              fontSize: isMobile ? "16px" : "18px",
              pointerEvents: "none",
            }}
          >
            {isSearching ? "⌛" : "🔍"}
          </div>

          {/* Search results dropdown - Mobile optimized */}
          {showSearchResults && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(16px)",
                borderRadius: "12px",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(13, 148, 136, 0.15)",
                marginTop: "8px",
                maxHeight: isMobile ? "40vh" : "320px",
                overflowY: "auto",
              }}
            >
              {searchResults.map((result, index) => (
                <div
                  key={result.place_id}
                  onClick={() => handleSearchResultClick(result)}
                  style={{
                    padding: isMobile ? "12px 16px" : "14px 20px",
                    borderBottom:
                      index < searchResults.length - 1
                        ? "1px solid rgba(0, 0, 0, 0.06)"
                        : "none",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onTouchStart={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(13, 148, 136, 0.08)";
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent";
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile)
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "rgba(13, 148, 136, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile)
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                  }}
                >
                  <div
                    style={{
                      fontSize: isMobile ? "13px" : "14px",
                      fontWeight: 600,
                      color: "#1f2937",
                      marginBottom: "2px",
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    }}
                  >
                    {result.main_text || result.description.split(",")[0]}
                  </div>
                  {result.secondary_text && (
                    <div
                      style={{
                        fontSize: isMobile ? "11px" : "12px",
                        color: "#6b7280",
                        fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      }}
                    >
                      {result.secondary_text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {isMobile && (
          <p
            style={{
              margin: 0,
              padding: "4px 8px 2px",
              textAlign: "center",
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1.35,
              color: "#3d5c52",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(8px)",
              borderRadius: "10px",
              border: "1px solid rgba(13, 148, 136, 0.2)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              pointerEvents: "none",
            }}
            role="note"
          >
            {l("mapGestureHint")}
          </p>
        )}
      </div>

      {/* Globe ring overlay */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute top-1/2 left-1/2 z-10"
        style={{
          transform: "translate(-50%, -50%)",
          opacity: 0,
          willChange: "width, height, opacity",
        }}
      >
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full"
          style={{
            animation: "spin-reverse 150s linear infinite",
            overflow: "visible",
          }}
        >
          <style>{`
            @keyframes spin-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
            @keyframes fadeInLabel { from { opacity: 0; transform: translateX(-50%) translateY(-6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
          `}</style>
          <defs>
            <path
              id="globePath"
              d="M 40, 200 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0"
            />
          </defs>
          <text
            className="font-bold fill-[#FFF7ED]"
            style={{
              fontSize: "26px",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              textShadow: "0px 4px 15px rgba(0,0,0,0.8)",
            }}
          >
            <textPath
              href="#globePath"
              startOffset="50%"
              textAnchor="middle"
              textLength="920"
              lengthAdjust="spacing"
            >
              NONNAS OF THE WORLD
            </textPath>
          </text>
        </svg>
      </div>

      {/* Street View button — pegman icon, city level and below */}
      {mapReady &&
        !streetViewActive &&
        (currentLevel === "CITY" ||
          currentLevel === "NONNA" ||
          currentLevel === "STATE" ||
          currentLevel === "COUNTRY") && (
          <button
            onClick={handleStreetViewButtonClick}
            title={streetViewPickMode ? "Cancel Street View" : "Street View"}
            style={{
              position: "absolute",
              left: isMobile ? "12px" : "24px",
              bottom: isMobile ? "24px" : "40px",
              zIndex: 50,
              width: isMobile ? "48px" : "56px",
              height: isMobile ? "48px" : "56px",
              borderRadius: "50%",
              background: streetViewPickMode
                ? "rgba(234,179,8,0.9)"
                : "rgba(13,148,136,0.85)",
              border: `2px solid ${streetViewPickMode ? "rgba(253,224,71,0.8)" : "rgba(94,234,212,0.6)"}`,
              backdropFilter: "blur(12px)",
              boxShadow: streetViewPickMode
                ? "0 4px 20px rgba(234,179,8,0.5)"
                : "0 4px 20px rgba(13,148,136,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              transition: "all 0.2s ease",
            }}
          >
            {/* Pegman / person icon */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="4" r="2.5" />
              <path d="M12 7c-1.5 0-2.7.8-3.4 2L6 13l1.8 1 2.2-3v9h2v-4h0v4h2v-9l2.2 3 1.8-1-2.6-4c-.7-1.2-1.9-2-3.4-2z" />
            </svg>
          </button>
        )}

      {/* Street View pick mode instruction */}
      {streetViewPickMode && (
        <div
          style={{
            position: "absolute",
            top: isMobile ? "132px" : "90px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            padding: "10px 20px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "14px",
            fontWeight: 500,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            whiteSpace: isMobile ? "normal" : "nowrap",
            maxWidth: isMobile ? "calc(100vw - 32px)" : undefined,
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          Click on the map to enter Street View
        </div>
      )}

      {/* Exit Street View button */}
      {streetViewActive && (
        <button
          onClick={() => {
            streetViewPanoramaRef.current = null;
            setStreetViewActive(false);
            setStreetViewNonnaPopup((prev) =>
              prev.open ? { ...prev, open: false } : prev,
            );
            setLevel("CITY");
            currentLevelRef.current = "CITY";

            // Update panel region based on current camera center when exiting street view
            const updatePanelForStreetViewExit = async () => {
              const map3d = map3dRef.current;
              const geocoder = geocoderRef.current;
              if (!map3d || !geocoder) return;

              const center = map3d.center;
              if (!center) return;
              const lat = Number(center.lat);
              const lng = Number(center.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

              try {
                const response = await geocoder.geocode({
                  location: { lat, lng },
                });
                const first = response?.results?.[0];
                if (first) {
                  const info = parseAdminLevelsFromGeocodeResult(first);

                  // For street view exit, we're going to CITY level, so get city info
                  const targetName =
                    first.address_components?.find((c: any) =>
                      c.types.includes("locality"),
                    )?.long_name || "";

                  if (targetName) {
                    let regionDisplayName = targetName;
                    if (info.state && info.country) {
                      regionDisplayName = `${info.country} · ${info.state} · ${targetName}`;
                    } else if (info.country) {
                      regionDisplayName = `${info.country} · ${targetName}`;
                    }

                    // Update panel with new region data
                    console.log(
                      "[Earth3D] Street View Exit - Updating panel:",
                      {
                        targetName,
                        regionDisplayName,
                        scope: "city",
                        country: info.country,
                        state: info.state,
                        city: targetName,
                        currentLevel: "CITY",
                      },
                    );
                    setPanel((prev) => ({
                      ...prev,
                      region: targetName,
                      regionDisplayName,
                      scope: "city" as const,
                      country: info.country || undefined,
                      state: info.state || undefined,
                      city: targetName,
                    }));

                    // Fetch fresh data for the new region
                    let url = "/api/recipes?published=true";
                    url += `&country=${encodeURIComponent(info.country || "")}`;
                    if (info.state) {
                      url += `&region=${encodeURIComponent(info.state)}`;
                    }
                    url += `&city=${encodeURIComponent(targetName)}`;

                    const dataResponse = await fetch(url);
                    const data = await dataResponse.json();
                    const nonnas = mapRecipesToPanelNonnas(data.recipes || []);

                    setPanel((prev) => ({
                      ...prev,
                      nonnas,
                      isLoading: false,
                    }));
                  }
                }
              } catch (error) {
                console.error(
                  "[Earth3D] Error updating panel region after street view exit:",
                  error,
                );
                setPanel((prev) => ({ ...prev, isLoading: false }));
              }
            };

            // Always call the update function so panel data is ready when opened
            console.log(
              "[Earth3D] Street View Exit - Updating panel data regardless of panel state",
            );
            updatePanelForStreetViewExit();

            // Fly to CITY level range for appropriate view
            if (map3dRef.current) {
              flightStateRef.current = {
                active: true,
                targetRange: ZOOM_RANGES.CITY,
                targetLevel: "CITY",
                startTime: Date.now(),
                lastRanges: [],
              };
              map3dRef.current.flyCameraTo({
                endCamera: {
                  center: map3dRef.current.center,
                  range: ZOOM_RANGES.CITY,
                  heading: map3dRef.current.heading,
                  tilt: 65,
                },
                durationMillis: 1000,
              });
            }
          }}
          style={{
            position: "absolute",
            top: isMobile ? "12px" : "24px",
            right: isMobile ? "12px" : "24px",
            zIndex: 10,
            padding: isMobile ? "8px 16px" : "10px 20px",
            borderRadius: "999px",
            background: "rgba(0,0,0,0.7)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
            cursor: "pointer",
            color: "white",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          ✕ Exit Street View
        </button>
      )}

      {/* Street View toast */}
      {streetViewToast && (
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            padding: "12px 24px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            color: "#374151",
            fontSize: "14px",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {streetViewToast}
        </div>
      )}

      {mapReady && (
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          currentLevel={currentLevel}
          isMobile={isMobile}
        />
      )}

      {/* 2D/3D Toggle - Mobile responsive */}
      {mapReady && (currentLevel === "CITY" || currentLevel === "NONNA") && (
        <div
          style={{
            position: "absolute",
            right: isMobile ? "8px" : "24px",
            top: isMobile ? "calc(50% + 70px)" : "calc(50% + 90px)",
            zIndex: 50,
          }}
        >
          <button
            onClick={() => {
              if (!map3dRef.current) return;
              const map3d = map3dRef.current;
              const newTilt = map3d.tilt > 10 ? 0 : 65;
              map3d.flyCameraTo({
                endCamera: {
                  center: map3d.center,
                  range: map3d.range,
                  heading: map3d.heading,
                  tilt: newTilt,
                },
                durationMillis: 1000,
              });
              setIs3DMode(newTilt > 10);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "6px" : "8px",
              padding: isMobile ? "10px 16px" : "12px 20px",
              borderRadius: "999px",
              background: is3DMode
                ? "rgba(13,148,136,0.85)"
                : "rgba(0,0,0,0.5)",
              border: `1.5px solid ${is3DMode ? "rgba(94,234,212,0.6)" : "rgba(255,255,255,0.12)"}`,
              backdropFilter: "blur(10px)",
              boxShadow: is3DMode ? `0 4px 20px ${TEAL.glow}` : "none",
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              color: is3DMode ? "white" : "rgba(220,220,220,0.8)",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: 600,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
            onMouseEnter={(e) => {
              if (!isMobile)
                (e.currentTarget as HTMLElement).style.transform =
                  "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              if (!isMobile)
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: isMobile ? "16px" : "18px" }}>
              {is3DMode ? "🌐" : "🗺️"}
            </span>
            <span>{is3DMode ? "3D" : "2D"}</span>
          </button>
        </div>
      )}

      {/* Left-side level navigation — Mobile responsive */}
      {mapReady && (
        <div style={mobileStyles.levelNavContainer}>
          {/* Navigation hint — hover to expand */}
          <div
            style={{
              position: "relative",
              marginBottom: isMobile ? "4px" : "6px",
            }}
            onMouseEnter={(e) => {
              const panel = e.currentTarget.querySelector(
                ".nav-hint-panel",
              ) as HTMLElement;
              if (panel) panel.style.display = "block";
            }}
            onMouseLeave={(e) => {
              const panel = e.currentTarget.querySelector(
                ".nav-hint-panel",
              ) as HTMLElement;
              if (panel) panel.style.display = "none";
            }}
          >
            {/* Trigger label */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(94,234,212,0.15)",
                borderRadius: "8px",
                padding: "5px 10px",
                cursor: "default",
                userSelect: "none",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: TEAL.lighter,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                }}
              >
                How to?
              </span>
            </div>

            {/* Hover panel */}
            <div
              className="nav-hint-panel"
              style={{
                display: "none",
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "6px",
                background: "rgba(10,10,10,0.82)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(94,234,212,0.18)",
                borderRadius: "10px",
                padding: "16px 18px",
                width: "300px",
                zIndex: 70,
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {(
                [
                  { icon: "📍", text: "Click a level or scroll to zoom." },
                  {
                    icon: "📍",
                    text: "Once a region is centred on screen, double clicking it again descends one level.",
                  },
                ] as { icon: string; text: string }[]
              ).map(({ icon, text }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "9px",
                    alignItems: "flex-start",
                    marginBottom: i < 2 ? "9px" : 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    {icon}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "rgba(220,220,220,0.8)",
                      lineHeight: 1.5,
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {(["EARTH", "CONTINENT", "COUNTRY", "STATE", "CITY"] as const).map(
            (lvl) => {
              const LEVEL_ORDER: ZoomLevel[] = [
                "EARTH",
                "CONTINENT",
                "COUNTRY",
                "STATE",
                "CITY",
                "NONNA",
              ];
              const lvlIndex = LEVEL_ORDER.indexOf(lvl);
              const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
              const isActive = currentLevel === lvl;
              // Allow going back to any previous level, or advancing exactly one level forward
              const isDisabled = lvlIndex > currentIndex + 1;
              const meta = ZOOM_LEVEL_META[lvl];
              return (
                <button
                  key={lvl}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!map3dRef.current || isDisabled) return;

                    // Close nonna comment panel when navigating via pills
                    setCommentSection((prev) => ({ ...prev, open: false }));

                    // Update panel region based on current camera center for the new level
                    const updatePanelForNewLevel = async () => {
                      const map3d = map3dRef.current;
                      const geocoder = geocoderRef.current;
                      if (!map3d || !geocoder) return;

                      const center = map3d.center;
                      if (!center) return;
                      const lat = Number(center.lat);
                      const lng = Number(center.lng);
                      if (!Number.isFinite(lat) || !Number.isFinite(lng))
                        return;

                      try {
                        const response = await geocoder.geocode({
                          location: { lat, lng },
                        });
                        const first = response?.results?.[0];
                        if (first && panel.open) {
                          const info = parseAdminLevelsFromGeocodeResult(first);

                          // Determine the appropriate feature type and region name for this level
                          let targetName = "";
                          let featureType:
                            | "continent"
                            | "country"
                            | "state"
                            | "city" = "country";

                          if (lvl === "CONTINENT") {
                            // For continent level, try to get continent from country info
                            if (info.country) {
                              const { getCountryInfoWithFallback } =
                                await import("@/lib/countryData");
                              targetName =
                                getCountryInfoWithFallback(info.country)
                                  .continent || info.country;
                              featureType = "continent";
                            }
                          } else if (lvl === "COUNTRY") {
                            targetName = info.country || "";
                            featureType = "country";
                          } else if (lvl === "STATE") {
                            targetName = info.state || "";
                            featureType = "state";
                          } else if (lvl === "CITY") {
                            targetName =
                              first.address_components?.find((c: any) =>
                                c.types.includes("locality"),
                              )?.long_name || "";
                            featureType = "city";
                          }

                          if (targetName) {
                            let regionDisplayName = targetName;
                            if (featureType === "city") {
                              if (info.state && info.country) {
                                regionDisplayName = `${info.country} · ${info.state} · ${targetName}`;
                              } else if (info.country) {
                                regionDisplayName = `${info.country} · ${targetName}`;
                              }
                            } else if (featureType === "state") {
                              regionDisplayName =
                                `${info.country || ""} · ${targetName}`.replace(
                                  /^ · /,
                                  "",
                                );
                            }

                            // Update panel with new region data
                            setPanel((prev) => ({
                              ...prev,
                              region: targetName,
                              regionDisplayName,
                              scope: featureType,
                              country: info.country || undefined,
                              state: info.state || undefined,
                              city:
                                featureType === "city" ? targetName : undefined,
                            }));

                            // Fetch fresh data for the new region
                            let url = "/api/recipes?published=true";
                            if (featureType === "continent") {
                              const { getCountryInfoWithFallback } =
                                await import("@/lib/countryData");
                              const continent = getCountryInfoWithFallback(
                                info.country || "",
                              ).continent;
                              url += `&continent=${encodeURIComponent(continent)}`;
                            } else if (featureType === "country") {
                              url += `&country=${encodeURIComponent(info.country || "")}`;
                            } else if (featureType === "state") {
                              url += `&country=${encodeURIComponent(info.country || "")}`;
                              url += `&region=${encodeURIComponent(targetName)}`;
                            } else if (featureType === "city") {
                              url += `&country=${encodeURIComponent(info.country || "")}`;
                              if (info.state) {
                                url += `&region=${encodeURIComponent(info.state)}`;
                              }
                              url += `&city=${encodeURIComponent(targetName)}`;
                            }

                            const dataResponse = await fetch(url);
                            const data = await dataResponse.json();
                            const nonnas = mapRecipesToPanelNonnas(
                              data.recipes || [],
                            );

                            setPanel((prev) => ({
                              ...prev,
                              nonnas,
                              isLoading: false,
                            }));
                          }
                        }
                      } catch (error) {
                        console.error(
                          "[Earth3D] Error updating panel region for level navigation:",
                          error,
                        );
                        setPanel((prev) => ({ ...prev, isLoading: false }));
                      }
                    };

                    // Call the update function if panel is open
                    if (panel.open) {
                      updatePanelForNewLevel();
                    }

                    // Set flight state to pause scroll-based detection during animation
                    flightStateRef.current = {
                      active: true,
                      targetRange: ZOOM_RANGES[lvl],
                      targetLevel: lvl,
                      startTime: Date.now(),
                      lastRanges: [],
                    };

                    setLevel(lvl); // Explicitly set the level for active state
                    let targetTilt = 0; // No tilt for navigation buttons (NONNA is handled separately)
                    if (lvl === "CITY") {
                      targetTilt = 65; // 3D tilt for CITY level
                    }

                    map3dRef.current.flyCameraTo({
                      endCamera: {
                        center: map3dRef.current.center,
                        range: ZOOM_RANGES[lvl],
                        heading: map3dRef.current.heading,
                        tilt: targetTilt,
                      },
                      durationMillis: 1500,
                    });
                  }}
                  title={
                    isDisabled
                      ? `Drill down through ${LEVEL_ORDER[currentIndex + 1] ? ZOOM_LEVEL_META[LEVEL_ORDER[currentIndex + 1]].label : ""} first`
                      : meta.description
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? "6px" : "10px",
                    padding: isMobile ? "8px 12px" : "10px 16px",
                    borderRadius: "999px",
                    background: isActive
                      ? "rgba(13,148,136,0.85)"
                      : isDisabled
                        ? "rgba(0,0,0,0.2)"
                        : "rgba(0,0,0,0.5)",
                    border: `1.5px solid ${isActive ? "rgba(94,234,212,0.6)" : isDisabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)"}`,
                    backdropFilter: "blur(10px)",
                    boxShadow: isActive ? `0 4px 20px ${TEAL.glow}` : "none",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    transform: isActive ? "scale(1.06)" : "scale(1)",
                    transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                    color: isActive
                      ? "white"
                      : isDisabled
                        ? "rgba(220,220,220,0.3)"
                        : "rgba(220,220,220,0.8)",
                    fontSize: isMobile ? "11px" : "13px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    userSelect: "none",
                    WebkitTapHighlightColor: "transparent",
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                  onTouchStart={(e) => {
                    if (!isActive && !isDisabled)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(13,148,136,0.4)";
                  }}
                  onTouchEnd={(e) => {
                    if (!isActive && !isDisabled)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(0,0,0,0.5)";
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile && !isActive && !isDisabled)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(13,148,136,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile && !isActive && !isDisabled)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(0,0,0,0.5)";
                  }}
                >
                  <span>{meta.label}</span>
                  {isActive && (
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: TEAL.lighter,
                        boxShadow: `0 0 6px ${TEAL.lighter}`,
                        marginLeft: "2px",
                      }}
                    />
                  )}
                </button>
              );
            },
          )}
          {/* NONNA tile removed per Brendan's feedback — Street View opens automatically
              when a single-nonna marker is clicked, so the manual NONNA pill is redundant.
              NONNA still exists as an internal level used by activateStreetViewAt. */}
        </div>
      )}

      {/* Discussion Panel toggle button - hidden in Street View */}
      <button
        onClick={() => setPanel((prev) => ({ ...prev, open: !prev.open }))}
        style={{
          position: "fixed",
          right: panel.open && !isMobile ? "calc(500px + 16px)" : "16px",
          top: "50%",
          transform: "translateY(-50%)",
          borderRadius: "999px",
          background: panel.open
            ? "rgba(15,118,110,0.9)"
            : "rgba(13,148,136,0.85)",
          border: `1.5px solid ${panel.open ? "rgba(94,234,212,0.45)" : "rgba(94,234,212,0.6)"}`,
          backdropFilter: "blur(10px)",
          boxShadow: `0 4px 20px ${TEAL.glow}`,
          cursor: "pointer",
          display:
            streetViewActive || (isMobile && panel.open) || commentSection.open
              ? "none"
              : "flex",
          alignItems: "center",
          gap: isMobile ? "6px" : "10px",
          padding: isMobile ? "8px 12px" : "10px 16px",
          zIndex: 100000,
          transition:
            "right 0.3s ease, all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          maxWidth: isMobile ? "180px" : "240px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          color: "white",
          fontSize: isMobile ? "11px" : "13px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <svg
          width={isMobile ? "14" : "15"}
          height={isMobile ? "14" : "15"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, opacity: 0.9 }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: isMobile ? "110px" : "160px",
          }}
        >
          {panel.open
            ? "Close"
            : panel.regionDisplayName || panel.region || "Discussions"}
        </span>
        {!panel.open && (
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: TEAL.lighter,
              boxShadow: `0 0 6px ${TEAL.lighter}`,
              flexShrink: 0,
            }}
          />
        )}
      </button>

      {/* Discussion Panel */}
      <ExploreDiscussionPanel
        isOpen={panel.open}
        onClose={() => setPanel({ ...panel, open: false })}
        region={panel.region}
        regionDisplayName={panel.regionDisplayName}
        scope={panel.scope}
        mapZoomLevel={currentLevel}
        country={panel.country}
        state={panel.state}
        city={panel.city}
        nonnas={panel.nonnas}
        initialTab={panel.initialTab}
        isLoading={panel.isLoading}
      />

      {commentSection.open && (
        <div className="fixed top-0 right-0 h-screen w-full md:w-125 bg-white shadow-lg z-[9999] border-l border-gray-200 flex flex-col pt-[63px] sm:pt-[80px]">
          <ExploreCommentsDrawer
            open={commentSection.open}
            recipeId={commentSection.recipeId}
            userId={user?.id}
            titleName={commentSection.titleName}
            nonnaDisplayName={commentSection.nonnaDisplayName}
            photo={
              commentSection.photo ||
              generateAvatarSvgUri(
                [commentSection.titleName, commentSection.nonnaDisplayName]
                  .filter(Boolean)
                  .join(" "),
                commentSection.countryCode,
              )
            }
            countryCode={commentSection.countryCode}
            onClose={() =>
              setCommentSection({ ...commentSection, open: false, recipeId: 0 })
            }
          />
        </div>
      )}
    </div>
  );
}

export default memo(EarthMap3DOverlays);
