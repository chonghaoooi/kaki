# Mobile Prototype Agent Guide

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

## kaki project decisions

The app name is **kaki**, lowercase. The user approved the accessible Mobbin references and written style guidance in place of a missing original image. The implementation follows the first generated activity-first direction, selected as the working assumption when the user asked to proceed with development. Keep the cyan/blue/indigo/purple palette, small-group activity emphasis, warm student voice and four enforced education communities. Preserve the working SQLite API and both the mobile preview and responsive web entrypoint. See README.md and design-qa.md for behavior, verification and deliberate live integration boundaries.

Feature extension: study activities let students choose mentor or peer. Discover has a map entry and every activity has a location screen. Public clubs have discussion and weekly event planning with private postal-code contributions and shared public venue suggestions. Public means visible within the existing education and age community. Mentor profiles show days since first mentorship, session count, likes and a New tag for mentors with no completed sessions. Preserve the chosen style while adding these working screens; use real sourced map locations and distinguish campus pins from exact venue pins.

Mentor statistics must be easy for other eligible students to see, not just the mentor. Show them prominently on public mentor profiles, in a mentor directory reachable from Study, and on the mentor cards within study events. Own-profile preview must show the same public information. Formal credentials and certificates are outside this request.

Mentor appreciation uses hearts, never star ratings or numeric review scores. Hearts count individual thank-yous from eligible past study peers; the existing mentor-like records and undo behavior remain the source of truth. Show hearts, sessions and days mentoring consistently, including a New tag for mentors without completed sessions. Mentors are reachable directly from Discover and desktop navigation. The directory supports subject, availability and new-mentor filters; profiles foreground a real upcoming study session and offer a separate one-to-one request path when a tutor offer exists. Keep the current visual language, touch targets and keyboard-aware fields. Mobbin references inform hierarchy and flow, not rating mechanics.

Support groups are a main feature with their own Support navigation tab. Include student-led and professional-led spaces, small groups, larger groups and one-to-one requests, different everyday support needs, full/waitlist states and a listening-ear application. Keep support memberships and applications private rather than adding them to public profiles or ordinary club/activity feeds. Student listeners offer peer support, not counselling. An application stays pending and does not create verified or professional status. Professional demo hosts are explicitly fictional and must never imply a real qualification, affiliation or live appointment. Keep the current database and existing features; People & matches remains reachable from the profile. Verified external support resources are available on a separate Support help screen.

The Support release passes 36 API/runner test groups, including 9 support groups. Preserve the member-only conversation rules, explicit waitlist consent, pending 1:1 state, listener-application withdrawal and host/ended-session guards. Chat refresh results must not replace newer successful message submissions. Small support labels use darkened text for readability.

The user wants Support to feel caring and personal, informed by Mobbin. Use a calm illustrated welcome, conversational prompts, readable typography and visible facilitator identity. Preserve kaki's indigo/lilac identity with restrained warm cream accents. Do not substitute invented testimonials, online/availability indicators, credentials or confidentiality guarantees for human warmth. Apply the same tone to the listening-ear application.

The Discover community label is a button with a downward arrow; the user explicitly confirmed this placement. It switches Campus (the current institution) and Neighbourhood (host-opted-in activities from other schools within the existing education and age community, plus curated official listings). Hosts control Neighbourhood listing when creating or planning events and from hosted event details. Preserve joined activity history when a host removes a listing. The user confirmed MCCY at https://www.mccy.gov.sg/ and NYC at https://www.nyc.gov.sg/ as the external sources. The current collection has three MCCY-linked *SCAPE listings and five Discover NYC listings; keep organiser attribution, registration dates, eligibility notes and registration on the original provider. Never describe curated source links as a live synchronized feed or imply that fictional kaki plans are affiliated with those organisations. The demo database was refreshed from a clean seed on 13 September 2026, with 24 fictional Neighbourhood plans per network across ten sourced public venues; added plans carry `demoSample: true`. Keep venue reference pins distinct from exact entrances, maintain the API/runner coverage (27 groups currently pass), and retain the pre-refresh backup at `data/backups/before-neighbourhood-demo-2026-09-13T04-54-41-210Z/kaki.sqlite`.


The user selected Discover visual option 2 on 13 September 2026: `qa/discover-design/option-2.png` (second displayed image, generation `exec-e7472bea-138d-47e2-8a54-84b7d7fc473c`). Preserve its photo-led hierarchy: compact brand/community header, Small plans / Good company greeting, search and labelled Map, one complete hero plan and join action, horizontal categories, compact upcoming plans, then quiet Mentors/Clubs/Support links. Use actual activity data and real availability; do not invent beginner labels, notifications, credentials or social proof. Preserve the full mobile runtime and the Campus/Neighbourhood switch. Discovery searches and category/source filters should carry between list/map routes and survive Back. Time labels and upcoming visibility use current Singapore time, with historical joined/hosted plans retained under My Activities.


The user requested more demo events in every genre. `server/activity-catalogue.mjs` adds a balanced 54 records per education network (36 campus, 18 opted-in Neighbourhood), using existing profiles/venues and the six existing event categories. Its additive demo-only migration inserts missing stable IDs and stores a one-time Singapore-date anchor. Never reset or shift existing event records to refresh the catalogue, auto-enrol the current user, invent mentor credentials, or mix fictional events into the separately sourced official listings.
