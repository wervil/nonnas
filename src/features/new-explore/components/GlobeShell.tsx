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

    const assets = ["continents", "countries", "states"] as const;
    assets.forEach((asset) => {
      void queryClient.prefetchQuery({
        queryKey: globeKeys.geojson(asset),
        queryFn: () => fetchGeoJsonAsset(asset),
      });
    });
  }, [queryClient]);

  return <EarthMap3D />;
}
