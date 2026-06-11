import NewExploreContent from "./NewExploreContent";

export const metadata = {
  title: "Nonnas of the World - Interactive Globe",
};

export default function NewExplorePage() {
  return (
    <>
      <link rel="preload" href="/textures/earth_day_clouds.jpg" as="image" />
      <link
        rel="preload"
        href="/geo/ne_admin0_countries.geojson"
        as="fetch"
        crossOrigin="anonymous"
      />
      <NewExploreContent />
    </>
  );
}
