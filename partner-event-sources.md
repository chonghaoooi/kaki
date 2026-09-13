# Official partner event sources

Checked 13 September 2026. These are curated public listings, not a live booking feed. Registration, eligibility, fees and capacity remain controlled by each organiser. The source grouping describes how a listing was discovered; it does not imply that MCCY organises every event or endorses kaki.

## Source paths

- **NYC:** [National Youth Council](https://www.nyc.gov.sg/) links to [Discover NYC](https://discover.nyc.gov.sg/). The [Discover about page](https://discover.nyc.gov.sg/about-us) states that NYC owns the platform and that it serves youths aged 15–35. Individual programme eligibility is recorded separately.
- **MCCY:** [Ministry of Culture, Community and Youth](https://www.mccy.gov.sg/) → [Get involved](https://www.mccy.gov.sg/get-involved/) → [All opportunities](https://www.mccy.gov.sg/get-involved/all-opportunities/) links directly to *SCAPE. The catalog’s MCCY group contains *SCAPE’s published programme listings and retains **\*SCAPE** as the source name. The earlier onePA tufting item has been removed rather than relabelled as a ministry event.

## Catalog

| Listing | Published schedule (Singapore time) | Actual source / organiser | Registration and eligibility notes |
| --- | --- | --- | --- |
| [Reimagining Plastic](https://discover.nyc.gov.sg/events/reimagining-plastic-inside-a-sustainability-startup-with-plastify-mt6zddyu) | 19 Sep 2026, 14:00–17:00 | Discover NYC / Scoop Social | Free. Numeric age limits and deadline not published. |
| [Tax & Careers at IRAS](https://discover.nyc.gov.sg/events/learning-journey-tax-careers-at-iras-mssqcl5d) | 23 Sep 2026, 15:00–17:00 | Discover NYC / IRAS | Free. Registration closes 16 Sep at noon. Youth audience, no numeric age limit published. |
| [NYC Officer, Run 2](https://discover.nyc.gov.sg/events/pov-youre-an-nyc-officer-run-2-mrndeou4) | 21 Nov 2026, 09:30–13:00 | Discover NYC / NYC | Free. Current secondary, pre-university, ITE, polytechnic or university students. Opens 1 Oct; closes 14 Nov at noon. |
| [Science & Research panel](https://discover.nyc.gov.sg/events/career-panel-science-research-mrss7pw4) | 19 Sep 2026, 14:00–16:00 | Discover NYC / Praxium | Free. Intended audience includes youths under 30 and interested students. |
| [Singapore Career Summit](https://discover.nyc.gov.sg/events/singapore-career-summit-2026-ms8i9p8z) | 18 Sep 2026, 10:00–12:00 | Discover NYC / BestTop | Free. Designed for undergraduate and postgraduate students and young professionals. |
| [Threads Connecting Nature](https://www.scape.sg/whats-on/whats-on-sep-2026/) | 19–20 Sep 2026, 12:00–20:00 daily | *SCAPE listing / youth-led programme | Batik workshop at *SCAPE Commune, Level 1. Fees and specific age limits not published. |
| [SSC Somerset](https://www.scape.sg/whats-on/whats-on-sep-2026/) | 24–27 Sep 2026, 12:00–21:00 daily | *SCAPE listing / SkateSG; sanctioned by Singapore Rollersports Federation | Somerset Skate Park. Confirm spectator access, competition eligibility and fees. |
| [NoFilter Urban Art Jam](https://www.scape.sg/whats-on/whats-on-sep-2026/) | 26–27 Sep 2026, 13:00–21:00 daily | *SCAPE | Somerset Youth Park both days; also *SCAPE Commune on 26 Sep. Fees and specific age limits not published. |

For *SCAPE’s building address, see its [official FAQ](https://www.scape.sg/faq/): 2 Orchard Link, Singapore 237978. A venue-name-only address is retained for the two Somerset parks because an exact postal address was not verified.

## Location precision

The Science & Research panel uses the National Library Building point from the [official NLB Libraries GeoJSON](https://data.gov.sg/datasets/d_27b8dae65d9ca1539e14d09578b17cbf/view). Its note identifies Level 7 and requires confirmation of the event room.

Two more venue reference pins were checked on 13 September 2026:

- **Somerset Skate Park:** `1.300008111830785, 103.8385732992991`, returned by [SLA OneMap’s named-place search](https://www.onemap.gov.sg/api/common/elastic/search?searchVal=Somerset%20Skate%20Park&returnGeom=Y&getAddrDetails=Y) as `SOMERSET SKATE PARK`. The same public search endpoint is used by the [Singapore Government Directory’s location-map implementation](https://www.sgdi.gov.sg/html/Sgdi/js/sgdi-backend.min.js). This is a checked static coordinate; the API response also warned that authentication is required, and the app does not depend on unauthenticated live geocoding.
- **Revenue House / IRAS:** `1.31951800264427, 103.842154838338`, copied directly from the OneMap `latLng` in the [IRAS Locate Us page’s View Map link](https://www.iras.gov.sg/contact-us/locate-us). The catalog distinguishes this building pin from the B1 event room.

Other partner records deliberately omit latitude/longitude where a reliable official coordinate was not obtained; their official address remains available for map search. *SCAPE’s current [visit page](https://www.scape.sg/visit-scape/) embeds indoor wayfinding but did not expose a verified geographic point in this bounded check. No building-centre estimate was substituted for Commune or Somerset Youth Park.

`server/demo-venue-sources.json` contains five separately sourced public locations for **fictional student demo activities**. NParks’ own OneMap navigation links provide the four park points; PUB’s official OneMap embed provides Marina Barrage. These are venue reference points, not court or picnic-site bookings. The official source-page URLs are preserved in every record.

The current catalog hides events after their published closing deadline or end date. Demo mode uses the app’s 13 September 2026 anchor; live mode uses the current time. A date-only closing deadline is treated as the end of that Singapore calendar day for filtering, and the UI does not claim an unpublished closing time. Listings without a deadline require the user to check current availability on the source site.
