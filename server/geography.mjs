/**
 * Sourced Singapore geography snapshots. See ../geography-sources.md.
 * Coordinates are WGS84. This module never logs or persists postal-code input.
 */
import { readFileSync } from 'node:fs';
const additionalPublicVenues = JSON.parse(readFileSync(new URL('./demo-venue-sources.json', import.meta.url), 'utf8'));
const CHECKED_AT = '2026-09-13';
const NLB_SOURCE = 'https://data.gov.sg/datasets/d_27b8dae65d9ca1539e14d09578b17cbf/view';
const SP_MAP = 'https://www.sp.edu.sg/staticfile/CampusMap/cwp/assets/campusmap/jar.min.js';
const CAMPUS_NOTE = 'Campus reference pin. Confirm the building and meeting point with your host.';
const VENUE_NOTE = 'Venue reference pin. Check opening hours and confirm a meeting point before travelling.';

const campuses = Object.freeze({
  sp: Object.freeze({
    label: 'Singapore Polytechnic', lat: 1.3079849608713576, lng: 103.7795940041542,
    address: '500 Dover Road, Singapore 139651', postalCode: '139651', precision: 'campus',
    source: 'Singapore Polytechnic official campus map (Admin Building)', sourceUrl: SP_MAP,
    venueUrl: 'https://www.sp.edu.sg/map',
  }),
  nus: Object.freeze({
    label: 'National University of Singapore', lat: 1.297293218, lng: 103.7779172,
    address: '21 Lower Kent Ridge Road, Singapore 119077', postalCode: '119077', precision: 'campus',
    source: 'NUS official campus map (University Hall)', sourceUrl: 'https://map.nus.edu.sg/index.php/search/',
    venueUrl: 'https://www.nus.edu.sg/contact',
  }),
  'secondary-admiralty-secondary-school': Object.freeze({
    label: 'Admiralty Secondary School', lat: 1.4465478, lng: 103.8026137,
    address: '31 Woodlands Crescent, Singapore 737916', postalCode: '737916', precision: 'campus',
    source: 'MOE SchoolFinder linked school map', sourceUrl: 'https://www.moe.gov.sg/schoolfinder/schooldetail/admiralty-secondary-school',
    venueUrl: 'https://goo.gl/maps/hUP1XUzFX8ShLZQx5',
  }),
  'jc_mi-anderson-serangoon-junior-college': Object.freeze({
    label: 'Anderson Serangoon Junior College', lat: 1.3650925, lng: 103.8878158,
    address: '1033 Upper Serangoon Road, Singapore 534768', postalCode: '534768', precision: 'campus',
    source: 'ASRJC official contact page embedded map', sourceUrl: 'https://www.asrjc.moe.edu.sg/contact-us/',
    venueUrl: 'https://www.asrjc.moe.edu.sg/open-house-2025/how-to-get-to-asr/',
  }),
});

// Exact named SP venues, rather than pretending a campus reference is a room.
const spVenues = Object.freeze({
  'sp-library': Object.freeze({ name: 'Singapore Polytechnic · Library', venueName: 'SP Library', lat: 1.308637908503715, lng: 103.77985954284668 }),
  'sp-sports': Object.freeze({ name: 'Singapore Polytechnic · Sports Arena', venueName: 'SP Sports Arena', lat: 1.3088041620831643, lng: 103.77736240625381 }),
  'sp-canteen': Object.freeze({ name: 'Singapore Polytechnic · Foodcourt 5', venueName: 'SP Foodcourt 5', lat: 1.309638111323397, lng: 103.77712100744247 }),
  'sp-commons': Object.freeze({ name: 'Singapore Polytechnic · Poly Centre', venueName: 'SP Poly Centre', lat: 1.308908740941983, lng: 103.77826362848282 }),
});

/** Public venue candidates. Membership authorization belongs to the API layer. */
export const publicMeetingVenues = Object.freeze([
  { id: 'public-clementi-library', name: 'Clementi Library', lat: 1.31506201647581, lng: 103.764305614552, address: '3155 Commonwealth Avenue West, The Clementi Mall, Singapore 129588', postalCode: '129588', venueUrl: 'https://theclementimall.com/stores/clementi-public-library/' },
  { id: 'public-jurong-library', name: 'Jurong Regional Library', lat: 1.33289451520808, lng: 103.739242870677, address: '21 Jurong East Central 1, Singapore 609732', postalCode: '609732', venueUrl: 'https://curiocity.nlb.gov.sg/digital-stories/jurong/new-town/' },
  { id: 'public-bukit-batok-library', name: 'Bukit Batok Library', lat: 1.34949754800173, lng: 103.749285191724, address: '1 Bukit Batok Central Link, West Mall, Singapore 658713', postalCode: '658713', venueUrl: 'https://www.nlb.gov.sg/main/main/-/media/NLBMedia/Documents/Visit-Us/Libraries/BBPL/Bukit-Batok-Library-Fact-Sheet.pdf' },
  { id: 'public-bishan-library', name: 'Bishan Library', lat: 1.3498506667736, lng: 103.848840445413, address: '5 Bishan Place, Singapore 579841', postalCode: '579841', venueUrl: 'https://www.nlb.gov.sg/main/visit-us/our-libraries-and-locations/libraries/bishan-public-library' },
  { id: 'public-central-library', name: 'Central Library', lat: 1.2974201806193, lng: 103.854234798536, address: '100 Victoria Street, National Library Building, Singapore 188064', postalCode: '188064', venueUrl: 'https://www.read.gov.sg/' },
  ...additionalPublicVenues.map(venue => ({ ...venue, type: 'park', source: venue.id === 'public-marina-barrage' ? 'PUB official location map' : 'NParks official park navigation link', venueUrl: venue.venueSourceUrl })),
].map(venue => Object.freeze({
  ...venue, precision: 'venue', type: venue.type || 'library', public: true,
  source: venue.source || 'National Library Board Libraries GeoJSON', sourceUrl: venue.sourceUrl || NLB_SOURCE,
  checkedAt: CHECKED_AT, locationNote: VENUE_NOTE,
  meetingPoint: venue.type === 'park' ? 'Official park reference point. Confirm a specific public meeting point with your host; check access, weather and venue rules.' : 'Agree on a meeting point in the public entrance area. Seats and rooms are not reserved by kaki.',
})));

export const demoPostalExamples = Object.freeze(publicMeetingVenues.filter(venue => typeof venue.postalCode === 'string' && /^\d{6}$/.test(venue.postalCode)).map(venue => Object.freeze({
  postalCode: venue.postalCode, label: `${venue.name} · public starting location`,
})));

/** Synchronous: unknown institutions deliberately remain unmapped. */
export function enrichLocation(location) {
  if (!location || typeof location !== 'object' || Array.isArray(location)) return null;
  const publicVenue = publicMeetingVenues.find(venue => venue.id === location.id);
  if (publicVenue) return { ...location, ...publicVenue };
  const campus = Object.hasOwn(campuses, location.institutionId) ? campuses[location.institutionId] : null;
  if (!campus) return {
    ...location, lat: null, lng: null, address: location.address || null,
    postalCode: location.postalCode || null, precision: null,
    source: null, sourceUrl: null, checkedAt: null,
    locationNote: 'This location does not have a verified map pin yet. Confirm the address with your host.',
  };
  const venue = Object.hasOwn(spVenues, location.id) ? spVenues[location.id] : null;
  return {
    ...location, ...campus, ...(venue || {}),
    ...(venue ? { precision: 'venue', source: 'Singapore Polytechnic official campus map', sourceUrl: SP_MAP } : {}),
    checkedAt: CHECKED_AT, locationNote: venue ? VENUE_NOTE : CAMPUS_NOTE,
    meetingPoint: venue
      ? 'Confirm the meeting point and any access or booking requirements with your host.'
      : 'The host still needs to confirm the specific building and meeting point.',
  };
}

function geographyError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function inSingapore(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 1.1 && lat <= 1.5 && lng >= 103.5 && lng <= 104.2;
}

/**
 * Resolve an exact Singapore postal code. Known public-location snapshots work
 * offline. Other inputs require a server-side OneMap token; never approximate
 * an arbitrary postal code, or return a fuzzy search result for another code.
 * Returned origin coordinates are private; callers must not broadcast them.
 */
export async function resolvePostalCode(code, { demoMode = false, token = process.env.ONEMAP_TOKEN } = {}) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    throw geographyError(400, 'INVALID_POSTAL_CODE', 'Enter a six-digit Singapore postal code.');
  }
  const postalCode = code.trim();
  const fixture = publicMeetingVenues.find(venue => venue.postalCode === postalCode)
    || Object.values(campuses).find(campus => campus.postalCode === postalCode);
  if (fixture) return {
    postalCode, lat: fixture.lat, lng: fixture.lng, label: fixture.name || fixture.label,
    precision: fixture.precision, source: 'verified-public-location-snapshot', sourceUrl: fixture.sourceUrl,
  };
  if (typeof token !== 'string' || !token.trim()) {
    throw geographyError(503, 'GEOCODER_NOT_CONFIGURED', demoMode
      ? 'Choose one of the public starting-location examples. Live postal-code lookup is not configured in this demo.'
      : 'Postal-code lookup is not configured. Choose a listed public starting location or ask the app administrator to configure OneMap.');
  }
  const url = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
  url.search = new URLSearchParams({ searchVal: postalCode, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: '1' }).toString();
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: token.trim(), Accept: 'application/json' },
      signal: AbortSignal.timeout(8000), redirect: 'error',
    });
  } catch {
    throw geographyError(503, 'GEOCODER_UNAVAILABLE', 'Postal-code lookup is temporarily unavailable. Please try again.');
  }
  if (response.status === 401 || response.status === 403) {
    throw geographyError(503, 'GEOCODER_AUTH_REQUIRED', 'Postal-code lookup needs a valid OneMap token. Ask the app administrator to renew it.');
  }
  if (response.status === 429) {
    throw geographyError(503, 'GEOCODER_RATE_LIMITED', 'Postal-code lookup is busy. Please try again shortly.');
  }
  if (!response.ok) throw geographyError(503, 'GEOCODER_UNAVAILABLE', 'Postal-code lookup is temporarily unavailable. Please try again.');
  let result;
  try { result = await response.json(); }
  catch { throw geographyError(502, 'INVALID_GEOCODER_RESPONSE', 'Postal-code lookup returned an invalid response. Please try again.'); }
  // OneMap can report an authorization error inside an HTTP 200 response.
  if (result?.error || result?.errorMsg) {
    throw geographyError(503, 'GEOCODER_UNAVAILABLE', 'Postal-code lookup could not complete. Check the OneMap configuration or try again later.');
  }
  const matches = Array.isArray(result?.results) ? result.results.filter(row => {
    if (!row || typeof row !== 'object') return false;
    const lat = Number(row.LATITUDE), lng = Number(row.LONGITUDE ?? row.LONGTITUDE);
    return String(row.POSTAL || '').trim() === postalCode && inSingapore(lat, lng);
  }) : [];
  if (!matches.length) throw geographyError(422, 'POSTAL_CODE_NOT_FOUND', 'That postal code could not be located. Check it or choose a public starting-location example.');
  const match = matches[0];
  return {
    postalCode, lat: Number(match.LATITUDE), lng: Number(match.LONGITUDE ?? match.LONGTITUDE),
    label: `Starting area ${postalCode}`, precision: 'postal', source: 'OneMap',
    sourceUrl: 'https://www.onemap.gov.sg/apidocs/search',
  };
}
