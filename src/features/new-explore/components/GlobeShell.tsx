"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { fetchAllClusters } from "../api/globe-api";
import { fetchGeoJsonAsset } from "../api/geojson-api";
import { globeKeys } from "../query-keys";
import GlobeLoadingFallback from "./GlobeLoadingFallback";

const EarthMap3D = dynamic(() => import("./EarthMap3D"), {
  ssr: false,
  loading: () => <GlobeLoadingFallback />,
});

export default function GlobeShell() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: globeKeys.allClusters(),
      queryFn: fetchAllClusters,
    });

    // Continents only at boot — countries/states load when the user zooms in
    void queryClient.prefetchQuery({
      queryKey: globeKeys.geojson("continents"),
      queryFn: () => fetchGeoJsonAsset("continents"),
    });
  }, [queryClient]);

  return <EarthMap3D />;
}
