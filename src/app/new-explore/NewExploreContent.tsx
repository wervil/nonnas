"use client";

import { Header } from "@/components/Header";
import GlobeShell from "@/features/new-explore/components/GlobeShell";
import NewExploreProviders from "@/features/new-explore/providers/NewExploreProviders";
import { useUser } from "@stackframe/stack";

type ExploreMode = "globe" | "map";

type ExploreState = {
  mode: ExploreMode;
  selectedRegion?: string | null;
  selectedContinent?: string | null;
};

export default function NewExploreContent() {
  const user = useUser();
  let hasPermissions = false;

  if (user) {
    const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || "");
    hasPermissions = team ? !!user.usePermission(team, "team_member") : false;
  }

  const exploreState: ExploreState = {
    mode: "globe",
    selectedRegion: null,
    selectedContinent: null,
  };

  return (
    <div
      className="flex flex-col w-full bg-black overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <div className="shrink-0">
        <Header
          hasAdminAccess={hasPermissions}
          user={user}
          isExplorePage={true}
          exploreState={exploreState.mode}
        />
      </div>

      <div className="flex-1 relative overflow-hidden min-h-0">
        <NewExploreProviders>
          <GlobeShell />
        </NewExploreProviders>
      </div>
    </div>
  );
}
