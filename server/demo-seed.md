# Reproducible kaki demo

A fresh demo database includes **89 activities and 21 fictional student profiles per education network**, including original plans and mentor history. Of those, **42 activities per network** are shared in Neighbourhood. Visible discovery counts depend on the current time, selected institution, education and age community, and privacy settings.

The additive activity catalogue contributes **54 plans per network**: six campus activities and three shared activities in each of Study, Sports, Games, Lunch, Interests and Events. Across the four networks this is **216 additional fictional events**. These records use existing hosts and participants, never automatically join Jamie, and vary group size, experience, subject, schedule and venue. Study records use existing mentor Alicia; they do not create qualifications or alter historical hearts.

## Dates and persistence

Original activity, mentor and tutoring records retain the fixed **13 September 2026, Asia/Singapore** seed anchor. They do not move forward on startup. Support groups receive dates relative to their first seeding and are also preserved on subsequent starts.

`activity-catalogue-v1` runs only in demo mode, after the original seed migrations. `activity-catalogue-anchor-v1` records the current Singapore date once, and its new activities span the following 21 days. For example, a first migration on 13 September 2026 creates catalogue dates from 14 September to 4 October 2026. Restarts retain that anchor and do not shift plans. If the catalogue migration is rerun, it uses deterministic IDs and inserts only missing records, preserving existing titles, dates, participants, RSVPs, saves, profiles, sessions, private support records and chat history.

Discovery and mentor statistics use the current Singapore clock. Historical joined or hosted activities remain accessible through My Activities; expired records are not rescheduled automatically.

## Venues and official listings

Neighbourhood plans cover ten sourced public venues: five libraries and five outdoor spaces. Every plan uses an existing venue ID and sourced coordinates. Study sessions and quiet chess use libraries; walks, photography and packed-lunch meetups use outdoor reference points. Markers do not imply a room, court, route or seating reservation. Venue provenance and precision are documented in [geography-sources.md](../geography-sources.md).

The sample plans span at least five host institutions per network. Participant counts and study roles derive from their seeded participant records. Added Neighbourhood activities carry `demoSample: true`, have explicitly fictional descriptions and have no MCCY, NYC or venue affiliation.

Eight curated official listings are kept separately in [`src/partner-events.ts`](../src/partner-events.ts): three MCCY-linked *SCAPE listings and five Discover NYC listings. They retain the organiser, source link, published eligibility and registration dates, with signup on the original provider. They are separate from the fictional student plans and are not a live synchronized feed. See [partner-event-sources.md](../partner-event-sources.md).

Offline postal fixtures cover five libraries (`129588`, `609732`, `658713`, `579841`, `188064`), Marina Barrage (`018951`) and four campuses (`139651`, `119077`, `737916`, `534768`). Other outdoor map points have no postal fixture and do not claim to locate an exact entrance. Arbitrary postal lookup requires the server-side OneMap integration described in the [project README](../README.md).

## Sample interactions

Alicia's seed includes two historical mentor sessions and two eligible peer hearts. Ryan's first seeded mentorship is dated 20 September 2026. Their displayed session counts and New tags follow the actual scheduled session times; those values are not frozen for the demo. A completed session is inferred from its scheduled end, without independently verified attendance.

Jamie belongs to Code & Coffee, which includes sample discussion messages and a planning draft with two public-library origins. These are example locations, not home addresses. Private origins expire after seven days and are cleared on publication or club departure.

Support includes eight fictional spaces per exact education and age cohort. Professional facilitators are fictional and unverified, and one-to-one requests are not confirmed appointments. Support memberships, conversations and listening-ear applications stay private; see the [API documentation](README.md#support-groups).

## Reset and retention

`createApi` seeds a fresh database when demo mode is enabled. Live mode never runs these demo migrations. Migration markers and stable IDs prevent duplicate insertion, and ordinary restarts preserve subsequent changes. No database, session data or backup is included in this repository.

To start a separate demonstration, stop the server, back up the current SQLite database and any companion files, then configure a fresh `KAKI_DB_PATH` in demo mode. Start the server and choose **Try demo**. A fresh file intentionally starts new sessions and sample data; the previous database remains available at its original path. Demo and live data must use separate databases.

The test suite verifies category counts, sourced coordinates, education/age/block isolation, host opt-in, participant capacity and study roles. Catalogue tests also verify the Singapore date anchor, absence from live mode, and preservation of existing records across migration and restarts using temporary test databases.
