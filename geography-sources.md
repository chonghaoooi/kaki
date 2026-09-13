# Geography sources and limits

Checked 13 September 2026. Coordinates in `server/geography.mjs` use WGS84 latitude / longitude. They are location references, not entrance navigation, room reservations, opening-status checks, or travel-time estimates.

## Campus references

| Institution | Address / postal code | Coordinate source | Precision |
| --- | --- | --- | --- |
| Singapore Polytechnic | 500 Dover Road, 139651 | [Official campus map](https://www.sp.edu.sg/map), its [published map data](https://www.sp.edu.sg/staticfile/CampusMap/cwp/assets/campusmap/jar.min.js), Admin Building `placeLocation[41]`: 1.3079849608713576, 103.7795940041542 | Campus reference |
| National University of Singapore | 21 Lower Kent Ridge Road, 119077 | [NUS contact address](https://www.nus.edu.sg/contact); [official map directory](https://map.nus.edu.sg/index.php/search/), University Hall: 1.297293218, 103.7779172 | Campus reference |
| Admiralty Secondary School | 31 Woodlands Crescent, 737916 | [MOE SchoolFinder](https://www.moe.gov.sg/schoolfinder/schooldetail/admiralty-secondary-school), its [linked school map](https://goo.gl/maps/hUP1XUzFX8ShLZQx5): 1.4465478, 103.8026137 | Campus reference |
| Anderson Serangoon Junior College | 1033 Upper Serangoon Road, 534768 | [Current school contact page and embedded map](https://www.asrjc.moe.edu.sg/contact-us/), resolved place coordinates: 1.3650925, 103.8878158; address corroborated by [school directions](https://www.asrjc.moe.edu.sg/open-house-2025/how-to-get-to-asr/) | Campus reference |

The Admiralty contact page contained template placeholder details at the time of checking; it was not used. MOE's [school directory](https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view) supports its address. ASRJC's MOE short map link still resolved to its old Ang Mo Kio campus; it was not used. The current school's embedded map gives the Upper Serangoon site. Its viewport centre is not the place marker: the code uses the embedded place coordinate, not the URL's viewport coordinate.

Four existing SP location IDs are enriched with actual named venues from the official map: Library (`placeLocation[29]`), Sports Arena (`[35]`), Foodcourt 5 (`[38]`) and Poly Centre (`[36]`). These have `precision: 'venue'` and matching display names. SP's [facilities page](https://www.sp.edu.sg/about-sp/campus-map-and-facilities) describes facilities and access/booking details. These pins do not imply the host has booked a room or court.

Other institutions deliberately receive `lat: null`, `lng: null`, and `precision: null` until a verified location is supplied. A campus reference does not pretend to locate a library, canteen or classroom within that campus.

## Public venue candidates and demo origins

The five library candidates’ coordinates, building addresses and postal codes are from the National Library Board's [Libraries GeoJSON dataset](https://data.gov.sg/datasets/d_27b8dae65d9ca1539e14d09578b17cbf/view), dataset ID `d_27b8dae65d9ca1539e14d09578b17cbf`. The catalogue was updated 6 June 2024, and the individual rows carry older `FMEL_UPD_D` timestamps. Building locations are a snapshot; current operational details require the venue's own page. The dataset is reusable under the Singapore Open Data Licence.

| Candidate | Postal code | Latitude, longitude | Current primary corroboration |
| --- | --- | --- | --- |
| Clementi Library, The Clementi Mall | 129588 | 1.31506201647581, 103.764305614552 | [Mall's library listing](https://theclementimall.com/stores/clementi-public-library/) |
| Jurong Regional Library | 609732 | 1.33289451520808, 103.739242870677 | [NLB's Jurong page](https://curiocity.nlb.gov.sg/digital-stories/jurong/new-town/) describes the current site and a planned 2028 relocation |
| Bukit Batok Library, West Mall | 658713 | 1.34949754800173, 103.749285191724 | [NLB fact sheet](https://www.nlb.gov.sg/main/main/-/media/NLBMedia/Documents/Visit-Us/Libraries/BBPL/Bukit-Batok-Library-Fact-Sheet.pdf) confirms reopening on 27 March 2026; [2026 volunteer programme](https://www.nlb.gov.sg/volunteers/event/5IXN6jvAh-7nKoGohLJa_g) confirms West Mall location |
| Bishan Library | 579841 | 1.3498506667736, 103.848840445413 | [NLB announcement](https://www.linkedin.com/posts/nlbsingapore_we-said-hello-to-a-new-and-improved-bukit-activity-7474767210255634432-PZOt) recommends Bishan during nearby library closures |
| Central Library, National Library Building | 188064 | 1.2974201806193, 103.854234798536 | [NLB ReadSG programme](https://www.read.gov.sg/) lists a September 2026 event at the building and Central Library |

Queenstown Library is intentionally excluded: NLB's announcement gives 30 August 2026 as its last operating day before refurbishment. No opening hours or live seat availability are asserted in kaki. Library candidates may require quiet conversation, advance room booking or another meeting arrangement; users should agree on the public entrance and confirm suitability with the venue.

## Outdoor public reference points

Five additional public locations were checked against NParks and PUB on 13 September 2026. Their exact stored coordinates and provenance are in `server/demo-venue-sources.json`, consumed by `server/geography.mjs`. These are park or venue reference points, not exact entrances, individual picnic spots, bookable courts or prescribed walking routes. The API labels them as public outdoor venues; participants must agree on a suitable meeting point and follow the venue's rules.

| Public location | Address / postal fixture | Latitude, longitude | Primary provenance |
| --- | --- | --- | --- |
| Bishan-Ang Mo Kio Park | Along Bishan Road and Ang Mo Kio Avenue 1; no postal fixture | 1.3614559999993214, 103.84729499999581 | [NParks park page](https://www.nparks.gov.sg/visit/parks/park-detail/bishan-ang-mo-kio-park) |
| Punggol Waterway Park | Along Sentul Crescent Road; no postal fixture | 1.410996999996513, 103.90481500000091 | [NParks park page](https://www.nparks.gov.sg/visit/parks/park-detail/punggol-waterway-park) |
| Marina Barrage | 8 Marina Gardens Drive, 018951 | 1.2799057348975, 103.8704696159287 | [PUB contact information](https://www.pub.gov.sg/contact-us) and [visitor information](https://www.pub.gov.sg/Public/Places-of-Interest/Marina-Barrage/Visitors-Information) |
| Esplanade Park | Along Connaught Drive, opposite Padang and National Gallery Singapore; no postal fixture | 1.289417000001069, 103.85359699999877 | [NParks park page](https://www.nparks.gov.sg/visit/parks/park-detail/esplanade-park) |
| East Coast Park | Along East Coast Parkway and East Coast Park Service Road; no postal fixture | 1.3031689999960565, 103.92060499999668 | [NParks park page](https://www.nparks.gov.sg/visit/parks/park-detail/east-coast-park) |

The refreshed demo places 24 fictional Neighbourhood plans per education network across these five outdoor points and the five libraries. Real geography does not make those sample plans official venue, MCCY or NYC programmes. They are marked `demoSample: true`; the eight curated official listings retain their separate source attribution.

`demoPostalExamples` contains the five public-library codes (`129588`, `609732`, `658713`, `579841`, `188064`) and Marina Barrage (`018951`). These are public starting-location examples, not fictional home coordinates. Four campus codes (`139651`, `119077`, `737916`, `534768`) also resolve to their sourced campus references. The other four outdoor locations have no postal fixture assigned. No arbitrary postal code is approximated from its prefix or converted into a generated coordinate.

## Live postal-code lookup

The [OneMap Search documentation](https://www.onemap.gov.sg/apidocs/search) now requires token-based authentication. Obtain and manage an access token using [OneMap Authentication](https://www.onemap.gov.sg/apidocs/authentication); configure `ONEMAP_TOKEN` only on the server. The token is sent in the documented `Authorization` header to `https://www.onemap.gov.sg/api/common/elastic/search`, with `searchVal`, `returnGeom=Y`, `getAddrDetails=Y` and `pageNum=1`.

The resolver accepts exact six-digit strings, keeps leading zeros, requires an exact returned `POSTAL` match, rejects missing/invalid/out-of-Singapore coordinates, times out failed lookup requests, and rejects error bodies even with HTTP 200. An unconfigured or expired token, upstream outage, rate limit or unresolved code produces a clear error rather than fabricated geometry. Redirects are rejected. Known sourced public-location snapshots remain available without a token.

Postal-code inputs are sent to OneMap only when no local public fixture matches. The helper does not log, save, cache or broadcast submitted origins, addresses or provider responses. Its returned origin coordinates are for private server-side calculation; the API must expose only the contributing user's own code and aggregate suggestions, never another participant's origin. Keep tokens and origin records out of client bundles, logs and group messages.

Meeting suggestions based on Haversine distances are geographic comparisons only. With one contribution, the API returns the public venue list without location-derived ranking or distances. With two or more, it ranks by the maximum straight-line distance and rounds displayed maximum/average distances up to whole kilometres. These comparisons do not account for MRT/bus routes, travel times, accessibility, fares or opening hours, and must not be presented as the fastest or objectively fairest route. The group chooses the final venue.
