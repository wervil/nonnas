// Shared region data and themes
// import { Nonna } from "./sharedTypes";

export const MARKER_COLOR = "#d97706";

export const COUNTRY_NAME_API_MAP: Record<string, string> = {
    "United States of America": "United States",
    // Add more mappings as needed
};

// Region theme colors for dark theme (includes Asia sub-regions)
export const REGION_THEMES: Record<string, { primary: string; secondary: string; highlight: string; bg: string }> = {
    // Africa
    Africa: { primary: "#22c55e", secondary: "#14532d", highlight: "#4ade80", bg: "#052e16" },

    // Asia sub-regions
    "Middle East": { primary: "#f59e0b", secondary: "#451a03", highlight: "#fbbf24", bg: "#1c0a00" },
    "South Asia": { primary: "#f97316", secondary: "#431407", highlight: "#fb923c", bg: "#1a0800" },
    "East Asia": { primary: "#eab308", secondary: "#422006", highlight: "#eab308", bg: "#1a0f00" },
    "Southeast Asia": { primary: "#10b981", secondary: "#064e3b", highlight: "#34d399", bg: "#022c22" },
    "Central Asia": { primary: "#ca8a04", secondary: "#422006", highlight: "#eab308", bg: "#1a0f00" },
    Asia: { primary: "#eab308", secondary: "#422006", highlight: "#facc15", bg: "#1a0f00" }, // Fallback

    // Europe
    Europe: { primary: "#3b82f6", secondary: "#1e3a8a", highlight: "#60a5fa", bg: "#0c1929" },

    // Americas
    "North America": { primary: "#ef4444", secondary: "#450a0a", highlight: "#f87171", bg: "#1a0505" },
    "South America": { primary: "#a855f7", secondary: "#3b0764", highlight: "#c084fc", bg: "#1a0533" },

    // Oceania & Pacific
    Oceania: { primary: "#ec4899", secondary: "#500724", highlight: "#f472b6", bg: "#1a0511" },
    "Pacific Islands": { primary: "#06b6d4", secondary: "#083344", highlight: "#22d3ee", bg: "#051b24" },

    // Antarctica
    Antarctica: { primary: "#64748b", secondary: "#1e293b", highlight: "#94a3b8", bg: "#0f172a" },
};

// Backward compatibility (used by external references)
export const CONTINENT_THEMES = REGION_THEMES;

// Map sub-regions to their parent continents for GeoJSON filtering
export const REGION_TO_CONTINENT: Record<string, string> = {
    "Middle East": "Asia",
    "South Asia": "Asia",
    "East Asia": "Asia",
    "Southeast Asia": "Asia",
    "Central Asia": "Asia",
    "Pacific Islands": "Oceania",
};

// Countries in each sub-region (for filtering)
export const REGION_COUNTRIES: Record<string, string[]> = {
    "Middle East": [
        "Turkey", "Iran", "Iraq", "Saudi Arabia", "Yemen", "Syria", "Jordan",
        "United Arab Emirates", "Israel", "Lebanon", "Oman", "Kuwait", "Qatar",
        "Bahrain", "Cyprus", "Palestine", "Georgia", "Armenia", "Azerbaijan",
    ],
    "South Asia": [
        "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan",
        "Maldives", "Afghanistan",
    ],
    "East Asia": [
        "China", "Japan", "South Korea", "North Korea", "Taiwan", "Mongolia",
        "Russia", "Russian Federation", // Russia grouped with East Asia
    ],
    "Southeast Asia": [
        "Thailand", "Vietnam", "Indonesia", "Philippines", "Malaysia", "Singapore",
        "Myanmar", "Cambodia", "Laos", "Brunei", "Timor-Leste", "East Timor",
    ],
    "Central Asia": [
        "Kazakhstan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan",
    ],
    "Pacific Islands": [
        "Fiji", "Papua New Guinea", "Solomon Islands", "Vanuatu", "New Caledonia",
        "Samoa", "Tonga", "Micronesia", "Marshall Islands", "Palau", "Kiribati",
        "New Zealand",
    ],
};


// Mapping of countries to their regions/continents
// This is critical for deep linking to verify correct map view
const COUNTRY_TO_REGION: Record<string, string> = {
    // Europe
    "Albania": "Europe", "Andorra": "Europe", "Austria": "Europe", "Belarus": "Europe",
    "Belgium": "Europe", "Bosnia and Herzegovina": "Europe", "Bulgaria": "Europe",
    "Croatia": "Europe", "Cyprus": "Europe", "Czech Republic": "Europe", "Denmark": "Europe",
    "Estonia": "Europe", "Finland": "Europe", "France": "Europe", "Germany": "Europe",
    "Greece": "Europe", "Hungary": "Europe", "Iceland": "Europe", "Ireland": "Europe",
    "Italy": "Europe", "Kosovo": "Europe", "Latvia": "Europe", "Liechtenstein": "Europe",
    "Lithuania": "Europe", "Luxembourg": "Europe", "Malta": "Europe", "Moldova": "Europe",
    "Monaco": "Europe", "Montenegro": "Europe", "Netherlands": "Europe", "North Macedonia": "Europe",
    "Norway": "Europe", "Poland": "Europe", "Portugal": "Europe", "Romania": "Europe",
    "Russia": "East Asia", // Mapping to East Asia based on REGION_COUNTRIES logic above, though technically transcontinental
    "San Marino": "Europe", "Serbia": "Europe", "Slovakia": "Europe", "Slovenia": "Europe",
    "Spain": "Europe", "Sweden": "Europe", "Switzerland": "Europe", "Ukraine": "Europe",
    "United Kingdom": "Europe", "Vatican City": "Europe",

    // North America
    "United States": "North America", "Canada": "North America", "Mexico": "North America",
    "Antigua and Barbuda": "North America", "Bahamas": "North America", "Barbados": "North America",
    "Belize": "North America", "Costa Rica": "North America", "Cuba": "North America",
    "Dominica": "North America", "Dominican Republic": "North America", "El Salvador": "North America",
    "Grenada": "North America", "Guatemala": "North America", "Haiti": "North America",
    "Honduras": "North America", "Jamaica": "North America", "Nicaragua": "North America",
    "Panama": "North America", "Saint Kitts and Nevis": "North America", "Saint Lucia": "North America",
    "Saint Vincent and the Grenadines": "North America", "Trinidad and Tobago": "North America",

    // South America
    "Argentina": "South America", "Bolivia": "South America", "Brazil": "South America",
    "Chile": "South America", "Colombia": "South America", "Ecuador": "South America",
    "Guyana": "South America", "Paraguay": "South America", "Peru": "South America",
    "Suriname": "South America", "Uruguay": "South America", "Venezuela": "South America",

    // Oceania (Main, excluding Pacific Islands subregion check)
    "Australia": "Oceania",

    // Africa
    "Algeria": "Africa", "Angola": "Africa", "Benin": "Africa", "Botswana": "Africa",
    "Burkina Faso": "Africa", "Burundi": "Africa", "Cabo Verde": "Africa", "Cameroon": "Africa",
    "Central African Republic": "Africa", "Chad": "Africa", "Comoros": "Africa", "Congo": "Africa",
    "Democratic Republic of the Congo": "Africa", "Djibouti": "Africa", "Egypt": "Africa",
    "Equatorial Guinea": "Africa", "Eritrea": "Africa", "Eswatini": "Africa", "Ethiopia": "Africa",
    "Gabon": "Africa", "Gambia": "Africa", "Ghana": "Africa", "Guinea": "Africa",
    "Guinea-Bissau": "Africa", "Ivory Coast": "Africa", "Kenya": "Africa", "Lesotho": "Africa",
    "Liberia": "Africa", "Libya": "Africa", "Madagascar": "Africa", "Malawi": "Africa",
    "Mali": "Africa", "Mauritania": "Africa", "Mauritius": "Africa", "Morocco": "Africa",
    "Mozambique": "Africa", "Namibia": "Africa", "Niger": "Africa", "Nigeria": "Africa",
    "Rwanda": "Africa", "Sao Tome and Principe": "Africa", "Senegal": "Africa", "Seychelles": "Africa",
    "Sierra Leone": "Africa", "Somalia": "Africa", "South Africa": "Africa", "South Sudan": "Africa",
    "Sudan": "Africa", "Tanzania": "Africa", "Togo": "Africa", "Tunisia": "Africa",
    "Uganda": "Africa", "Zambia": "Africa", "Zimbabwe": "Africa",

    // Antarctica
    "Antarctica": "Antarctica"
};

// Helper to determine region/continent from country name
export function getRegionForCountry(countryName: string): string | null {
    // 1. Check in specific sub-regions
    for (const [region, countries] of Object.entries(REGION_COUNTRIES)) {
        if (countries.includes(countryName)) {
            return region;
        }
    }

    // 2. Check main mapping
    if (COUNTRY_TO_REGION[countryName]) {
        return COUNTRY_TO_REGION[countryName];
    }

    return null;
}
