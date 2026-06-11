"use client";

import type { SearchResult } from "../types";

export default function ExploreSearchBar({
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  showSearchResults,
  onSelectResult,
  onFocus,
  onBlur,
  searchInputRef,
  isMobile,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  showSearchResults: boolean;
  onSelectResult: (result: SearchResult) => void;
  onFocus: () => void;
  onBlur: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  isMobile?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: isMobile ? "12px" : "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        width: isMobile ? "calc(100% - 24px)" : "420px",
        maxWidth: "90vw",
      }}
    >
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Search for a place..."
        style={{
          width: "100%",
          padding: isMobile ? "12px 16px" : "14px 20px",
          borderRadius: "999px",
          border: "1.5px solid rgba(94,234,212,0.4)",
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(12px)",
          color: "white",
          fontSize: isMobile ? "14px" : "15px",
          outline: "none",
        }}
      />
      {showSearchResults && searchResults.length > 0 && (
        <div
          style={{
            marginTop: "8px",
            borderRadius: "16px",
            background: "rgba(0,0,0,0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
            maxHeight: "280px",
            overflowY: "auto",
          }}
        >
          {searchResults.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onMouseDown={() => onSelectResult(result)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "14px" }}>
                {result.main_text || result.description}
              </div>
              {result.secondary_text && (
                <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "2px" }}>
                  {result.secondary_text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {isSearching && (
        <div
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.6)",
            fontSize: "12px",
          }}
        >
          ...
        </div>
      )}
    </div>
  );
}
