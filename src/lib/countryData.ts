// Country data with continent mapping and coordinates
// ISO 3166-1 alpha-2 codes

export type CountryInfo = {
  code: string;
  name: string;
  continent: string;
  lat: number;
  lng: number;
};

// Map country names to their info (case-insensitive lookup)
const countryMap: Record<string, CountryInfo> = {
  // Africa
  "algeria": { code: "DZ", name: "Algeria", continent: "Africa", lat: 28.0339, lng: 1.6596 },
  "angola": { code: "AO", name: "Angola", continent: "Africa", lat: -11.2027, lng: 17.8739 },
  "benin": { code: "BJ", name: "Benin", continent: "Africa", lat: 9.3077, lng: 2.3158 },
  "botswana": { code: "BW", name: "Botswana", continent: "Africa", lat: -22.3285, lng: 24.6849 },
  "burkina faso": { code: "BF", name: "Burkina Faso", continent: "Africa", lat: 12.2383, lng: -1.5616 },
  "burundi": { code: "BI", name: "Burundi", continent: "Africa", lat: -3.3731, lng: 29.9189 },
  "cameroon": { code: "CM", name: "Cameroon", continent: "Africa", lat: 7.3697, lng: 12.3547 },
  "central african republic": { code: "CF", name: "Central African Republic", continent: "Africa", lat: 6.6111, lng: 20.9394 },
  "chad": { code: "TD", name: "Chad", continent: "Africa", lat: 15.4542, lng: 18.7322 },
  "congo": { code: "CG", name: "Congo", continent: "Africa", lat: -0.228, lng: 15.8277 },
  "democratic republic of the congo": { code: "CD", name: "Democratic Republic of the Congo", continent: "Africa", lat: -4.0383, lng: 21.7587 },
  "drc": { code: "CD", name: "Democratic Republic of the Congo", continent: "Africa", lat: -4.0383, lng: 21.7587 },
  "djibouti": { code: "DJ", name: "Djibouti", continent: "Africa", lat: 11.8251, lng: 42.5903 },
  "egypt": { code: "EG", name: "Egypt", continent: "Africa", lat: 26.8206, lng: 30.8025 },
  "equatorial guinea": { code: "GQ", name: "Equatorial Guinea", continent: "Africa", lat: 1.6508, lng: 10.2679 },
  "eritrea": { code: "ER", name: "Eritrea", continent: "Africa", lat: 15.1794, lng: 39.7823 },
  "eswatini": { code: "SZ", name: "Eswatini", continent: "Africa", lat: -26.5225, lng: 31.4659 },
  "ethiopia": { code: "ET", name: "Ethiopia", continent: "Africa", lat: 9.145, lng: 40.4897 },
  "gabon": { code: "GA", name: "Gabon", continent: "Africa", lat: -0.8037, lng: 11.6094 },
  "gambia": { code: "GM", name: "Gambia", continent: "Africa", lat: 13.4432, lng: -15.3101 },
  "ghana": { code: "GH", name: "Ghana", continent: "Africa", lat: 7.9465, lng: -1.0232 },
  "guinea": { code: "GN", name: "Guinea", continent: "Africa", lat: 9.9456, lng: -9.6966 },
  "guinea-bissau": { code: "GW", name: "Guinea-Bissau", continent: "Africa", lat: 11.8037, lng: -15.1804 },
  "ivory coast": { code: "CI", name: "Ivory Coast", continent: "Africa", lat: 7.54, lng: -5.5471 },
  "côte d'ivoire": { code: "CI", name: "Côte d'Ivoire", continent: "Africa", lat: 7.54, lng: -5.5471 },
  "kenya": { code: "KE", name: "Kenya", continent: "Africa", lat: -0.0236, lng: 37.9062 },
  "lesotho": { code: "LS", name: "Lesotho", continent: "Africa", lat: -29.61, lng: 28.2336 },
  "liberia": { code: "LR", name: "Liberia", continent: "Africa", lat: 6.4281, lng: -9.4295 },
  "libya": { code: "LY", name: "Libya", continent: "Africa", lat: 26.3351, lng: 17.2283 },
  "madagascar": { code: "MG", name: "Madagascar", continent: "Africa", lat: -18.7669, lng: 46.8691 },
  "malawi": { code: "MW", name: "Malawi", continent: "Africa", lat: -13.2543, lng: 34.3015 },
  "mali": { code: "ML", name: "Mali", continent: "Africa", lat: 17.5707, lng: -3.9962 },
  "mauritania": { code: "MR", name: "Mauritania", continent: "Africa", lat: 21.0079, lng: -10.9408 },
  "mauritius": { code: "MU", name: "Mauritius", continent: "Africa", lat: -20.3484, lng: 57.5522 },
  "morocco": { code: "MA", name: "Morocco", continent: "Africa", lat: 31.7917, lng: -7.0926 },
  "mozambique": { code: "MZ", name: "Mozambique", continent: "Africa", lat: -18.6657, lng: 35.5296 },
  "namibia": { code: "NA", name: "Namibia", continent: "Africa", lat: -22.9576, lng: 18.4904 },
  "niger": { code: "NE", name: "Niger", continent: "Africa", lat: 17.6078, lng: 8.0817 },
  "nigeria": { code: "NG", name: "Nigeria", continent: "Africa", lat: 9.082, lng: 8.6753 },
  "rwanda": { code: "RW", name: "Rwanda", continent: "Africa", lat: -1.9403, lng: 29.8739 },
  "senegal": { code: "SN", name: "Senegal", continent: "Africa", lat: 14.4974, lng: -14.4524 },
  "sierra leone": { code: "SL", name: "Sierra Leone", continent: "Africa", lat: 8.4606, lng: -11.7799 },
  "somalia": { code: "SO", name: "Somalia", continent: "Africa", lat: 5.1521, lng: 46.1996 },
  "south africa": { code: "ZA", name: "South Africa", continent: "Africa", lat: -30.5595, lng: 22.9375 },
  "south sudan": { code: "SS", name: "South Sudan", continent: "Africa", lat: 6.877, lng: 31.307 },
  "sudan": { code: "SD", name: "Sudan", continent: "Africa", lat: 12.8628, lng: 30.2176 },
  "tanzania": { code: "TZ", name: "Tanzania", continent: "Africa", lat: -6.369, lng: 34.8888 },
  "togo": { code: "TG", name: "Togo", continent: "Africa", lat: 8.6195, lng: 0.8248 },
  "tunisia": { code: "TN", name: "Tunisia", continent: "Africa", lat: 33.8869, lng: 9.5375 },
  "uganda": { code: "UG", name: "Uganda", continent: "Africa", lat: 1.3733, lng: 32.2903 },
  "zambia": { code: "ZM", name: "Zambia", continent: "Africa", lat: -13.1339, lng: 27.8493 },
  "zimbabwe": { code: "ZW", name: "Zimbabwe", continent: "Africa", lat: -19.0154, lng: 29.1549 },

  // Asia
  "afghanistan": { code: "AF", name: "Afghanistan", continent: "Asia", lat: 33.9391, lng: 67.71 },
  "armenia": { code: "AM", name: "Armenia", continent: "Asia", lat: 40.0691, lng: 45.0382 },
  "azerbaijan": { code: "AZ", name: "Azerbaijan", continent: "Asia", lat: 40.1431, lng: 47.5769 },
  "bahrain": { code: "BH", name: "Bahrain", continent: "Asia", lat: 25.9304, lng: 50.6378 },
  "bangladesh": { code: "BD", name: "Bangladesh", continent: "Asia", lat: 23.685, lng: 90.3563 },
  "bhutan": { code: "BT", name: "Bhutan", continent: "Asia", lat: 27.5142, lng: 90.4336 },
  "brunei": { code: "BN", name: "Brunei", continent: "Asia", lat: 4.5353, lng: 114.7277 },
  "cambodia": { code: "KH", name: "Cambodia", continent: "Asia", lat: 12.5657, lng: 104.991 },
  "china": { code: "CN", name: "China", continent: "Asia", lat: 35.8617, lng: 104.1954 },
  "georgia": { code: "GE", name: "Georgia", continent: "Asia", lat: 42.3154, lng: 43.3569 },
  "india": { code: "IN", name: "India", continent: "Asia", lat: 20.5937, lng: 78.9629 },
  "indonesia": { code: "ID", name: "Indonesia", continent: "Asia", lat: -0.7893, lng: 113.9213 },
  "iran": { code: "IR", name: "Iran", continent: "Asia", lat: 32.4279, lng: 53.688 },
  "iraq": { code: "IQ", name: "Iraq", continent: "Asia", lat: 33.2232, lng: 43.6793 },
  "israel": { code: "IL", name: "Israel", continent: "Asia", lat: 31.0461, lng: 34.8516 },
  "japan": { code: "JP", name: "Japan", continent: "Asia", lat: 36.2048, lng: 138.2529 },
  "jordan": { code: "JO", name: "Jordan", continent: "Asia", lat: 30.5852, lng: 36.2384 },
  "kazakhstan": { code: "KZ", name: "Kazakhstan", continent: "Asia", lat: 48.0196, lng: 66.9237 },
  "kuwait": { code: "KW", name: "Kuwait", continent: "Asia", lat: 29.3117, lng: 47.4818 },
  "kyrgyzstan": { code: "KG", name: "Kyrgyzstan", continent: "Asia", lat: 41.2044, lng: 74.7661 },
  "laos": { code: "LA", name: "Laos", continent: "Asia", lat: 19.8563, lng: 102.4955 },
  "lebanon": { code: "LB", name: "Lebanon", continent: "Asia", lat: 33.8547, lng: 35.8623 },
  "malaysia": { code: "MY", name: "Malaysia", continent: "Asia", lat: 4.2105, lng: 101.9758 },
  "maldives": { code: "MV", name: "Maldives", continent: "Asia", lat: 3.2028, lng: 73.2207 },
  "mongolia": { code: "MN", name: "Mongolia", continent: "Asia", lat: 46.8625, lng: 103.8467 },
  "myanmar": { code: "MM", name: "Myanmar", continent: "Asia", lat: 21.9162, lng: 95.956 },
  "nepal": { code: "NP", name: "Nepal", continent: "Asia", lat: 28.3949, lng: 84.124 },
  "north korea": { code: "KP", name: "North Korea", continent: "Asia", lat: 40.3399, lng: 127.5101 },
  "oman": { code: "OM", name: "Oman", continent: "Asia", lat: 21.4735, lng: 55.9754 },
  "pakistan": { code: "PK", name: "Pakistan", continent: "Asia", lat: 30.3753, lng: 69.3451 },
  "palestine": { code: "PS", name: "Palestine", continent: "Asia", lat: 31.9522, lng: 35.2332 },
  "philippines": { code: "PH", name: "Philippines", continent: "Asia", lat: 12.8797, lng: 121.774 },
  "qatar": { code: "QA", name: "Qatar", continent: "Asia", lat: 25.3548, lng: 51.1839 },
  "saudi arabia": { code: "SA", name: "Saudi Arabia", continent: "Asia", lat: 23.8859, lng: 45.0792 },
  "singapore": { code: "SG", name: "Singapore", continent: "Asia", lat: 1.3521, lng: 103.8198 },
  "south korea": { code: "KR", name: "South Korea", continent: "Asia", lat: 35.9078, lng: 127.7669 },
  "korea": { code: "KR", name: "South Korea", continent: "Asia", lat: 35.9078, lng: 127.7669 },
  "sri lanka": { code: "LK", name: "Sri Lanka", continent: "Asia", lat: 7.8731, lng: 80.7718 },
  "syria": { code: "SY", name: "Syria", continent: "Asia", lat: 34.8021, lng: 38.9968 },
  "taiwan": { code: "TW", name: "Taiwan", continent: "Asia", lat: 23.6978, lng: 120.9605 },
  "tajikistan": { code: "TJ", name: "Tajikistan", continent: "Asia", lat: 38.861, lng: 71.2761 },
  "thailand": { code: "TH", name: "Thailand", continent: "Asia", lat: 15.87, lng: 100.9925 },
  "timor-leste": { code: "TL", name: "Timor-Leste", continent: "Asia", lat: -8.8742, lng: 125.7275 },
  "turkey": { code: "TR", name: "Turkey", continent: "Asia", lat: 38.9637, lng: 35.2433 },
  "turkmenistan": { code: "TM", name: "Turkmenistan", continent: "Asia", lat: 38.9697, lng: 59.5563 },
  "united arab emirates": { code: "AE", name: "United Arab Emirates", continent: "Asia", lat: 23.4241, lng: 53.8478 },
  "uae": { code: "AE", name: "United Arab Emirates", continent: "Asia", lat: 23.4241, lng: 53.8478 },
  "uzbekistan": { code: "UZ", name: "Uzbekistan", continent: "Asia", lat: 41.3775, lng: 64.5853 },
  "vietnam": { code: "VN", name: "Vietnam", continent: "Asia", lat: 14.0583, lng: 108.2772 },
  "yemen": { code: "YE", name: "Yemen", continent: "Asia", lat: 15.5527, lng: 48.5164 },

  // Europe
  "albania": { code: "AL", name: "Albania", continent: "Europe", lat: 41.1533, lng: 20.1683 },
  "andorra": { code: "AD", name: "Andorra", continent: "Europe", lat: 42.5063, lng: 1.5218 },
  "austria": { code: "AT", name: "Austria", continent: "Europe", lat: 47.5162, lng: 14.5501 },
  "belarus": { code: "BY", name: "Belarus", continent: "Europe", lat: 53.7098, lng: 27.9534 },
  "belgium": { code: "BE", name: "Belgium", continent: "Europe", lat: 50.5039, lng: 4.4699 },
  "bosnia and herzegovina": { code: "BA", name: "Bosnia and Herzegovina", continent: "Europe", lat: 43.9159, lng: 17.6791 },
  "bulgaria": { code: "BG", name: "Bulgaria", continent: "Europe", lat: 42.7339, lng: 25.4858 },
  "croatia": { code: "HR", name: "Croatia", continent: "Europe", lat: 45.1, lng: 15.2 },
  "cyprus": { code: "CY", name: "Cyprus", continent: "Europe", lat: 35.1264, lng: 33.4299 },
  "czech republic": { code: "CZ", name: "Czech Republic", continent: "Europe", lat: 49.8175, lng: 15.473 },
  "czechia": { code: "CZ", name: "Czechia", continent: "Europe", lat: 49.8175, lng: 15.473 },
  "denmark": { code: "DK", name: "Denmark", continent: "Europe", lat: 56.2639, lng: 9.5018 },
  "estonia": { code: "EE", name: "Estonia", continent: "Europe", lat: 58.5953, lng: 25.0136 },
  "finland": { code: "FI", name: "Finland", continent: "Europe", lat: 61.9241, lng: 25.7482 },
  "france": { code: "FR", name: "France", continent: "Europe", lat: 46.2276, lng: 2.2137 },
  "germany": { code: "DE", name: "Germany", continent: "Europe", lat: 51.1657, lng: 10.4515 },
  "greece": { code: "GR", name: "Greece", continent: "Europe", lat: 39.0742, lng: 21.8243 },
  "hungary": { code: "HU", name: "Hungary", continent: "Europe", lat: 47.1625, lng: 19.5033 },
  "iceland": { code: "IS", name: "Iceland", continent: "Europe", lat: 64.9631, lng: -19.0208 },
  "ireland": { code: "IE", name: "Ireland", continent: "Europe", lat: 53.1424, lng: -7.6921 },
  "italy": { code: "IT", name: "Italy", continent: "Europe", lat: 41.8719, lng: 12.5674 },
  "kosovo": { code: "XK", name: "Kosovo", continent: "Europe", lat: 42.6026, lng: 20.903 },
  "latvia": { code: "LV", name: "Latvia", continent: "Europe", lat: 56.8796, lng: 24.6032 },
  "liechtenstein": { code: "LI", name: "Liechtenstein", continent: "Europe", lat: 47.166, lng: 9.5554 },
  "lithuania": { code: "LT", name: "Lithuania", continent: "Europe", lat: 55.1694, lng: 23.8813 },
  "luxembourg": { code: "LU", name: "Luxembourg", continent: "Europe", lat: 49.8153, lng: 6.1296 },
  "malta": { code: "MT", name: "Malta", continent: "Europe", lat: 35.9375, lng: 14.3754 },
  "moldova": { code: "MD", name: "Moldova", continent: "Europe", lat: 47.4116, lng: 28.3699 },
  "monaco": { code: "MC", name: "Monaco", continent: "Europe", lat: 43.7384, lng: 7.4246 },
  "montenegro": { code: "ME", name: "Montenegro", continent: "Europe", lat: 42.7087, lng: 19.3744 },
  "netherlands": { code: "NL", name: "Netherlands", continent: "Europe", lat: 52.1326, lng: 5.2913 },
  "north macedonia": { code: "MK", name: "North Macedonia", continent: "Europe", lat: 41.5124, lng: 21.7453 },
  "norway": { code: "NO", name: "Norway", continent: "Europe", lat: 60.472, lng: 8.4689 },
  "poland": { code: "PL", name: "Poland", continent: "Europe", lat: 51.9194, lng: 19.1451 },
  "portugal": { code: "PT", name: "Portugal", continent: "Europe", lat: 39.3999, lng: -8.2245 },
  "romania": { code: "RO", name: "Romania", continent: "Europe", lat: 45.9432, lng: 24.9668 },
  "russia": { code: "RU", name: "Russia", continent: "Europe", lat: 61.524, lng: 105.3188 },
  "san marino": { code: "SM", name: "San Marino", continent: "Europe", lat: 43.9424, lng: 12.4578 },
  "serbia": { code: "RS", name: "Serbia", continent: "Europe", lat: 44.0165, lng: 21.0059 },
  "slovakia": { code: "SK", name: "Slovakia", continent: "Europe", lat: 48.669, lng: 19.699 },
  "slovenia": { code: "SI", name: "Slovenia", continent: "Europe", lat: 46.1512, lng: 14.9955 },
  "spain": { code: "ES", name: "Spain", continent: "Europe", lat: 40.4637, lng: -3.7492 },
  "sweden": { code: "SE", name: "Sweden", continent: "Europe", lat: 60.1282, lng: 18.6435 },
  "switzerland": { code: "CH", name: "Switzerland", continent: "Europe", lat: 46.8182, lng: 8.2275 },
  "ukraine": { code: "UA", name: "Ukraine", continent: "Europe", lat: 48.3794, lng: 31.1656 },
  "united kingdom": { code: "GB", name: "United Kingdom", continent: "Europe", lat: 55.3781, lng: -3.436 },
  "uk": { code: "GB", name: "United Kingdom", continent: "Europe", lat: 55.3781, lng: -3.436 },
  "vatican city": { code: "VA", name: "Vatican City", continent: "Europe", lat: 41.9029, lng: 12.4534 },

  // North America
  "antigua and barbuda": { code: "AG", name: "Antigua and Barbuda", continent: "North America", lat: 17.0608, lng: -61.7964 },
  "bahamas": { code: "BS", name: "Bahamas", continent: "North America", lat: 25.0343, lng: -77.3963 },
  "barbados": { code: "BB", name: "Barbados", continent: "North America", lat: 13.1939, lng: -59.5432 },
  "belize": { code: "BZ", name: "Belize", continent: "North America", lat: 17.1899, lng: -88.4976 },
  "canada": { code: "CA", name: "Canada", continent: "North America", lat: 56.1304, lng: -106.3468 },
  "costa rica": { code: "CR", name: "Costa Rica", continent: "North America", lat: 9.7489, lng: -83.7534 },
  "cuba": { code: "CU", name: "Cuba", continent: "North America", lat: 21.5218, lng: -77.7812 },
  "dominica": { code: "DM", name: "Dominica", continent: "North America", lat: 15.415, lng: -61.371 },
  "dominican republic": { code: "DO", name: "Dominican Republic", continent: "North America", lat: 18.7357, lng: -70.1627 },
  "el salvador": { code: "SV", name: "El Salvador", continent: "North America", lat: 13.7942, lng: -88.8965 },
  "grenada": { code: "GD", name: "Grenada", continent: "North America", lat: 12.2628, lng: -61.6043 },
  "guatemala": { code: "GT", name: "Guatemala", continent: "North America", lat: 15.7835, lng: -90.2308 },
  "haiti": { code: "HT", name: "Haiti", continent: "North America", lat: 18.9712, lng: -72.2852 },
  "honduras": { code: "HN", name: "Honduras", continent: "North America", lat: 15.2, lng: -86.2419 },
  "jamaica": { code: "JM", name: "Jamaica", continent: "North America", lat: 18.1096, lng: -77.2975 },
  "mexico": { code: "MX", name: "Mexico", continent: "North America", lat: 23.6345, lng: -102.5528 },
  "nicaragua": { code: "NI", name: "Nicaragua", continent: "North America", lat: 12.8654, lng: -85.2072 },
  "panama": { code: "PA", name: "Panama", continent: "North America", lat: 8.538, lng: -80.7821 },
  "puerto rico": { code: "PR", name: "Puerto Rico", continent: "North America", lat: 18.2208, lng: -66.5901 },
  "saint kitts and nevis": { code: "KN", name: "Saint Kitts and Nevis", continent: "North America", lat: 17.3578, lng: -62.783 },
  "saint lucia": { code: "LC", name: "Saint Lucia", continent: "North America", lat: 13.9094, lng: -60.9789 },
  "saint vincent and the grenadines": { code: "VC", name: "Saint Vincent and the Grenadines", continent: "North America", lat: 12.9843, lng: -61.2872 },
  "trinidad and tobago": { code: "TT", name: "Trinidad and Tobago", continent: "North America", lat: 10.6918, lng: -61.2225 },
  "united states": { code: "US", name: "United States", continent: "North America", lat: 37.0902, lng: -95.7129 },
  "usa": { code: "US", name: "United States", continent: "North America", lat: 37.0902, lng: -95.7129 },
  "us": { code: "US", name: "United States", continent: "North America", lat: 37.0902, lng: -95.7129 },
  "america": { code: "US", name: "United States", continent: "North America", lat: 37.0902, lng: -95.7129 },

  // South America
  "argentina": { code: "AR", name: "Argentina", continent: "South America", lat: -38.4161, lng: -63.6167 },
  "bolivia": { code: "BO", name: "Bolivia", continent: "South America", lat: -16.2902, lng: -63.5887 },
  "brazil": { code: "BR", name: "Brazil", continent: "South America", lat: -14.235, lng: -51.9253 },
  "chile": { code: "CL", name: "Chile", continent: "South America", lat: -35.6751, lng: -71.543 },
  "colombia": { code: "CO", name: "Colombia", continent: "South America", lat: 4.5709, lng: -74.2973 },
  "ecuador": { code: "EC", name: "Ecuador", continent: "South America", lat: -1.8312, lng: -78.1834 },
  "guyana": { code: "GY", name: "Guyana", continent: "South America", lat: 4.8604, lng: -58.9302 },
  "paraguay": { code: "PY", name: "Paraguay", continent: "South America", lat: -23.4425, lng: -58.4438 },
  "peru": { code: "PE", name: "Peru", continent: "South America", lat: -9.19, lng: -75.0152 },
  "suriname": { code: "SR", name: "Suriname", continent: "South America", lat: 3.9193, lng: -56.0278 },
  "uruguay": { code: "UY", name: "Uruguay", continent: "South America", lat: -32.5228, lng: -55.7658 },
  "venezuela": { code: "VE", name: "Venezuela", continent: "South America", lat: 6.4238, lng: -66.5897 },

  // Oceania
  "australia": { code: "AU", name: "Australia", continent: "Oceania", lat: -25.2744, lng: 133.7751 },
  "fiji": { code: "FJ", name: "Fiji", continent: "Oceania", lat: -17.7134, lng: 178.065 },
  "kiribati": { code: "KI", name: "Kiribati", continent: "Oceania", lat: -3.3704, lng: -168.734 },
  "marshall islands": { code: "MH", name: "Marshall Islands", continent: "Oceania", lat: 7.1315, lng: 171.1845 },
  "micronesia": { code: "FM", name: "Micronesia", continent: "Oceania", lat: 7.4256, lng: 150.5508 },
  "nauru": { code: "NR", name: "Nauru", continent: "Oceania", lat: -0.5228, lng: 166.9315 },
  "new zealand": { code: "NZ", name: "New Zealand", continent: "Oceania", lat: -40.9006, lng: 174.886 },
  "palau": { code: "PW", name: "Palau", continent: "Oceania", lat: 7.515, lng: 134.5825 },
  "papua new guinea": { code: "PG", name: "Papua New Guinea", continent: "Oceania", lat: -6.315, lng: 143.9555 },
  "samoa": { code: "WS", name: "Samoa", continent: "Oceania", lat: -13.759, lng: -172.1046 },
  "solomon islands": { code: "SB", name: "Solomon Islands", continent: "Oceania", lat: -9.6457, lng: 160.1562 },
  "tonga": { code: "TO", name: "Tonga", continent: "Oceania", lat: -21.179, lng: -175.1982 },
  "tuvalu": { code: "TV", name: "Tuvalu", continent: "Oceania", lat: -7.1095, lng: 177.6493 },
  "vanuatu": { code: "VU", name: "Vanuatu", continent: "Oceania", lat: -15.3767, lng: 166.9592 },
};

/**
 * Get country info from country name (case-insensitive)
 */
export function getCountryInfo(countryName: string): CountryInfo | null {
  const normalized = countryName.toLowerCase().trim();
  return countryMap[normalized] || null;
}

/**
 * Get country info with fallback for unknown countries
 */
export function getCountryInfoWithFallback(countryName: string): CountryInfo {
  const info = getCountryInfo(countryName);
  if (info) return info;

  // Return a default for unknown countries
  return {
    code: "XX",
    name: countryName,
    continent: "Unknown",
    lat: 0,
    lng: 0,
  };
}

/**
 * Get all countries for a specific continent
 */
export function getCountriesByContinent(continent: string): CountryInfo[] {
  return Object.values(countryMap).filter(
    (c) => c.continent.toLowerCase() === continent.toLowerCase()
  );
}

