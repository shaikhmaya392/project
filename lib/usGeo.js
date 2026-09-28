export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
  "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

// Weighted toward Central/North Florida (DS Permitting's own service area)
// with the largest US metros added on top, so the suggestion list stays
// useful for leads coming in from anywhere.
export const COMMON_CITIES = [
  "Fort McCoy", "Ocala", "Gainesville", "Jacksonville", "Jacksonville Beach", "Orlando",
  "Tampa", "St. Augustine", "Palatka", "Lake City", "Live Oak", "Starke", "Palm Coast",
  "Daytona Beach", "DeLand", "Deltona", "Leesburg", "The Villages", "Belleview", "Dunnellon",
  "Williston", "Chiefland", "Crystal River", "Inverness", "Bushnell", "Wildwood", "Clermont",
  "Kissimmee", "Sanford", "Winter Park", "Winter Garden", "Apopka", "Tavares", "Mount Dora",
  "Eustis", "Umatilla", "Fernandina Beach", "Green Cove Springs", "Orange Park", "Middleburg",
  "Keystone Heights", "Hawthorne", "Newberry", "Alachua", "High Springs", "Interlachen",
  "Crescent City", "Bunnell", "Perry", "Cross City", "Trenton", "St. Petersburg", "Clearwater",
  "Sarasota", "Bradenton", "Fort Myers", "Naples", "Cape Coral", "Pensacola", "Tallahassee",
  "West Palm Beach", "Boca Raton", "Fort Lauderdale", "Miami", "Hialeah", "Port St. Lucie",
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio",
  "San Diego", "Dallas", "Austin", "Charlotte", "Columbus", "Indianapolis", "Seattle",
  "Denver", "Boston", "Nashville", "Detroit", "Memphis", "Atlanta", "Raleigh", "Yonkers",
];

export const FLORIDA_COUNTIES = [
  "Marion", "Alachua", "Putnam", "Duval", "Clay", "St. Johns", "Flagler", "Volusia",
  "Citrus", "Levy", "Lake", "Sumter", "Columbia", "Suwannee", "Bradford", "Union",
  "Baker", "Nassau", "Gilchrist", "Dixie", "Orange", "Seminole", "Osceola", "Polk",
  "Hillsborough", "Pinellas", "Pasco",
];

// Free, keyless US ZIP lookup — used to auto-fill City/State the moment a
// 5-digit ZIP is entered, since that's far more reliable than free-text
// city suggestions.
export async function lookupZip(zip) {
  if (!/^\d{5}$/.test(zip)) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places && data.places[0];
    if (!place) return null;
    return { city: place["place name"], state: place["state"] };
  } catch {
    return null;
  }
}
