// src/app/map/page.tsx
import Globe2D3DShell from "@/components/clickable-globe/Globe2D3DShell";
import type { ClusterPoint } from "@/components/clickable-globe/sharedTypes";

// Sample data for testing - in production, this would come from your database
const samplePoints: ClusterPoint[] = [
  // Europe - Italy
  {
    id: "it-1",
    lat: 41.9028,
    lng: 12.4964,
    continent: "Europe",
    countryCode: "IT",
    countryName: "Italy",
    stateName: "Lazio",
    nonnas: [
      { id: "n1", name: "Nonna Maria", age: 82, origin: "Rome", tagline: "La pasta è vita!" },
      { id: "n2", name: "Nonna Lucia", age: 78, origin: "Rome", tagline: "Mangia, mangia!" },
    ],
  },
  {
    id: "it-2",
    lat: 45.4642,
    lng: 9.19,
    continent: "Europe",
    countryCode: "IT",
    countryName: "Italy",
    stateName: "Lombardy",
    nonnas: [
      { id: "n3", name: "Nonna Rosa", age: 85, origin: "Milan", tagline: "Il risotto perfetto" },
    ],
  },
  {
    id: "it-3",
    lat: 43.7696,
    lng: 11.2558,
    continent: "Europe",
    countryCode: "IT",
    countryName: "Italy",
    stateName: "Tuscany",
    nonnas: [
      { id: "n4", name: "Nonna Elena", age: 79, origin: "Florence", tagline: "Ribollita della nonna" },
      { id: "n5", name: "Nonna Beatrice", age: 88, origin: "Siena", tagline: "Pici fatti in casa" },
      { id: "n6", name: "Nonna Chiara", age: 75, origin: "Pisa", tagline: "Cacciucco tradizionale" },
    ],
  },
  // Europe - France
  {
    id: "fr-1",
    lat: 48.8566,
    lng: 2.3522,
    continent: "Europe",
    countryCode: "FR",
    countryName: "France",
    stateName: "Île-de-France",
    nonnas: [
      { id: "n7", name: "Grand-mère Marguerite", age: 81, origin: "Paris", tagline: "Croissants comme autrefois" },
    ],
  },
  {
    id: "fr-2",
    lat: 43.2965,
    lng: 5.3698,
    continent: "Europe",
    countryCode: "FR",
    countryName: "France",
    stateName: "Provence",
    nonnas: [
      { id: "n8", name: "Mémé Colette", age: 84, origin: "Marseille", tagline: "Bouillabaisse authentique" },
      { id: "n9", name: "Grand-mère Sophie", age: 77, origin: "Nice", tagline: "Ratatouille de ma mère" },
    ],
  },
  // Europe - Spain
  {
    id: "es-1",
    lat: 40.4168,
    lng: -3.7038,
    continent: "Europe",
    countryCode: "ES",
    countryName: "Spain",
    stateName: "Madrid",
    nonnas: [
      { id: "n10", name: "Abuela Carmen", age: 83, origin: "Madrid", tagline: "Paella valenciana" },
    ],
  },
  // Asia - India
  {
    id: "in-1",
    lat: 28.6139,
    lng: 77.209,
    continent: "Asia",
    countryCode: "IN",
    countryName: "India",
    stateName: "Delhi",
    nonnas: [
      { id: "n11", name: "Dadi Kamla", age: 76, origin: "New Delhi", tagline: "Biryani with love" },
      { id: "n12", name: "Nani Shanti", age: 82, origin: "Old Delhi", tagline: "Paratha champion" },
    ],
  },
  {
    id: "in-2",
    lat: 19.076,
    lng: 72.8777,
    continent: "Asia",
    countryCode: "IN",
    countryName: "India",
    stateName: "Maharashtra",
    nonnas: [
      { id: "n13", name: "Aaji Sunita", age: 79, origin: "Mumbai", tagline: "Vada pav queen" },
    ],
  },
  // Asia - Japan
  {
    id: "jp-1",
    lat: 35.6762,
    lng: 139.6503,
    continent: "Asia",
    countryCode: "JP",
    countryName: "Japan",
    stateName: "Tokyo",
    nonnas: [
      { id: "n14", name: "Obāchan Yuki", age: 85, origin: "Tokyo", tagline: "Ramen secrets" },
    ],
  },
  // Africa - Morocco
  {
    id: "ma-1",
    lat: 31.6295,
    lng: -7.9811,
    continent: "Africa",
    countryCode: "MA",
    countryName: "Morocco",
    stateName: "Marrakech-Safi",
    nonnas: [
      { id: "n15", name: "Jedda Fatima", age: 80, origin: "Marrakech", tagline: "Tagine traditionnel" },
      { id: "n16", name: "Jedda Khadija", age: 74, origin: "Marrakech", tagline: "Couscous du vendredi" },
    ],
  },
  // North America - Mexico
  {
    id: "mx-1",
    lat: 19.4326,
    lng: -99.1332,
    continent: "North America",
    countryCode: "MX",
    countryName: "Mexico",
    stateName: "Mexico City",
    nonnas: [
      { id: "n17", name: "Abuelita Rosa", age: 78, origin: "Mexico City", tagline: "Mole de la abuela" },
      { id: "n18", name: "Abuelita Lupita", age: 82, origin: "Mexico City", tagline: "Tamales navideños" },
    ],
  },
  {
    id: "mx-2",
    lat: 20.9674,
    lng: -89.5926,
    continent: "North America",
    countryCode: "MX",
    countryName: "Mexico",
    stateName: "Yucatán",
    nonnas: [
      { id: "n19", name: "Abuelita Concepción", age: 86, origin: "Mérida", tagline: "Cochinita pibil" },
    ],
  },
  // North America - USA
  {
    id: "us-1",
    lat: 40.7128,
    lng: -74.006,
    continent: "North America",
    countryCode: "US",
    countryName: "United States",
    stateName: "New York",
    nonnas: [
      { id: "n20", name: "Grandma Betty", age: 79, origin: "Brooklyn", tagline: "Apple pie like mom used to make" },
    ],
  },
  {
    id: "us-2",
    lat: 34.0522,
    lng: -118.2437,
    continent: "North America",
    countryCode: "US",
    countryName: "United States",
    stateName: "California",
    nonnas: [
      { id: "n21", name: "Nana Gloria", age: 81, origin: "Los Angeles", tagline: "Sunday roast tradition" },
      { id: "n22", name: "Grandmother Pearl", age: 88, origin: "San Diego", tagline: "Biscuits and gravy" },
    ],
  },
  // South America - Argentina
  {
    id: "ar-1",
    lat: -34.6037,
    lng: -58.3816,
    continent: "South America",
    countryCode: "AR",
    countryName: "Argentina",
    stateName: "Buenos Aires",
    nonnas: [
      { id: "n23", name: "Abuela Marta", age: 77, origin: "Buenos Aires", tagline: "Empanadas argentinas" },
      { id: "n24", name: "Abuela Teresa", age: 84, origin: "La Plata", tagline: "Asado familiar" },
    ],
  },
  // South America - Brazil
  {
    id: "br-1",
    lat: -23.5505,
    lng: -46.6333,
    continent: "South America",
    countryCode: "BR",
    countryName: "Brazil",
    stateName: "São Paulo",
    nonnas: [
      { id: "n25", name: "Vovó Helena", age: 80, origin: "São Paulo", tagline: "Feijoada da vovó" },
    ],
  },
  // Oceania - Australia
  {
    id: "au-1",
    lat: -33.8688,
    lng: 151.2093,
    continent: "Oceania",
    countryCode: "AU",
    countryName: "Australia",
    stateName: "New South Wales",
    nonnas: [
      { id: "n26", name: "Gran Dorothy", age: 83, origin: "Sydney", tagline: "Lamingtons and pavlova" },
    ],
  },
];

export default function MapPage() {
  return (
    <div className="w-screen h-screen bg-white">
      <Globe2D3DShell points={samplePoints} />
    </div>
  );
}
