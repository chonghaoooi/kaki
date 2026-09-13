import {
  NETWORKS, locations, primaryInstitution, subjectsByNetwork,
  seedData, seedNeighbourhoodData, seedRichNeighbourhoodData,
} from './data.mjs';

const CATEGORIES = ['study', 'sports', 'games', 'lunch', 'interests', 'events'];
const SAMPLE_NOTE = 'Fictional kaki demo plan.';
const CAMPUS_NOTE = 'Confirm the meeting point and any campus access or booking requirements with the host; no reservation is included.';
const PUBLIC_NOTE = 'Confirm a public meeting point with the host and follow venue rules. This student plan is not a venue programme, and no space is reserved.';

// Each entry is an invitation with its own purpose, rather than a numbered copy.
const CAMPUS = {
  study: [
    { title: s => `${s[0]}: solve it together`, subject: 0, text: 'Bring two questions you got stuck on. Compare approaches, explain one step to each other and leave with a short revision plan.', location: 'library', time: '16:00', capacity: 6, experience: 'Beginner', tags: ['Practice questions', 'Peer support'] },
    { title: s => `${s[1]} mini challenge`, subject: 1, text: 'Work through a short practice task in pairs, then compare how you reached your answer. Bring your notes and a task you are comfortable sharing.', location: 'library', time: '16:30', capacity: 8, experience: 'Intermediate', tags: ['Pair practice', 'Bring your notes'] },
    { title: s => `${s[2]}: back to basics`, subject: 2, text: 'Start with one concept that feels confusing and break it into small steps. No preparation needed beyond bringing your own class material.', location: 'library', time: '15:30', capacity: 4, experience: 'Beginner', tags: ['Foundations', 'Ask anything'] },
    { title: () => 'Two-person focus hour', subject: 0, text: 'A quiet study buddy session: share one achievable goal, focus independently and check in at the end. Bring headphones if you prefer silence.', location: 'library', time: '16:00', capacity: 2, experience: 'Everyone welcome', tags: ['Study buddy', 'Quiet focus'] },
    { title: s => `${s[1]} practice circle`, subject: 1, text: 'A small group working through a practice set already chosen by the host. Bring your own notes and be ready to explain one answer in your own words.', location: 'library', time: '15:00', capacity: 4, experience: 'Intermediate', tags: ['Practice set', 'Explain your thinking'] },
    { title: () => 'Finish that assignment', subject: 2, text: 'Bring an unfinished task and make progress beside other students. Start with a goal, take a short break and end by sharing your next step. Everyone completes their own work.', location: 'library', time: '17:00', capacity: 8, experience: 'Everyone welcome', tags: ['Accountability', 'Independent work'] },
  ],
  sports: [
    { title: () => 'First rallies: badminton basics', text: 'Practise serves and easy rallies with students learning too. Bring your own racket, water and non-marking shoes; the host will confirm court availability.', location: 'sports', time: '17:30', capacity: 6, image: 'badminton', experience: 'Beginner', tags: ['Badminton', 'Bring a racket'] },
    { title: () => 'Doubles with a new partner', text: 'Rotate partners for friendly badminton doubles. Best for people comfortable serving and keeping a rally going. Bring your racket; confirm the court with the host.', location: 'sports', time: '18:00', capacity: 8, image: 'badminton', experience: 'Intermediate', tags: ['Badminton doubles', 'Friendly games'] },
    { title: () => 'Fresh air between deadlines', text: 'Meet at the student commons for a relaxed walk on campus paths. Keep a conversational pace, bring water and agree on the route together.', location: 'commons', time: '17:00', capacity: 8, image: 'photography', experience: 'Everyone welcome', tags: ['Walking', 'Easy pace'] },
    { title: () => 'One lap, then a chat', text: 'An easy jog followed by a walking cool-down. Meet outside the sports centre, choose a permitted route and go at your own pace. Bring water and suitable shoes.', location: 'sports', time: '17:30', capacity: 6, image: 'photography', experience: 'Beginner', tags: ['Easy jog', 'Go at your pace'] },
    { title: () => 'Shuttle practice in fours', text: 'A small badminton practice group for serves, footwork and consistent rallies. Bring your own racket and shoes; any court arrangement must be confirmed by the host.', location: 'sports', time: '16:30', capacity: 4, image: 'badminton', experience: 'Intermediate', tags: ['Badminton', 'Skills practice'] },
    { title: () => 'The after-class walking club', text: 'Unwind with a sociable campus walk. Meet outside the commons, agree on a short accessible route and make introductions as you go. No special equipment needed.', location: 'commons', time: '18:00', capacity: 12, image: 'photography', experience: 'Everyone welcome', tags: ['Walking', 'Come solo'] },
  ],
  games: [
    { title: () => 'UNO and easy introductions', text: 'Learn the house rules together, play a few relaxed rounds and meet someone outside your class. Bring a deck if you have one; confirm what the host is bringing.', location: 'commons', time: '16:00', capacity: 8, experience: 'Beginner', tags: ['UNO', 'Rules explained'] },
    { title: () => 'Your first game of chess', text: 'Practise how each piece moves and play an unhurried first game. Bring a pocket chess set if you have one. Questions and take-backs are welcome.', location: 'commons', time: '16:30', capacity: 6, experience: 'Beginner', tags: ['Chess', 'Learn together'] },
    { title: () => 'Codenames, new teammates', text: 'Swap clues, make wonderfully wrong guesses and rotate teams between rounds. Check with the host that a copy of the game is available before arriving.', location: 'commons', time: '17:00', capacity: 8, experience: 'Everyone welcome', tags: ['Codenames', 'Team play'] },
    { title: () => 'Chess tactics over a break', text: 'Try a few tactical puzzles, discuss the alternatives and play a friendly match. Suits students who already know the rules; bring a set or a puzzle on your phone.', location: 'commons', time: '15:30', capacity: 4, experience: 'Intermediate', tags: ['Chess puzzles', 'Casual matches'] },
    { title: () => 'Four-player strategy table', text: 'A small table for a longer strategy game. The host will confirm the game and rules before the meetup. Bring patience for a full round and check the expected finish time.', location: 'commons', time: '16:00', capacity: 4, experience: 'Intermediate', tags: ['Strategy games', 'Small table'] },
    { title: () => 'Bring your favourite pocket game', text: 'Introduce a quick card, dice or paper game that fits in your bag. Pick something you can explain in five minutes and rotate between small tables.', location: 'commons', time: '17:30', capacity: 12, experience: 'Everyone welcome', tags: ['Game swap', 'Bring a game'] },
  ],
  lunch: [
    { title: () => 'Lunch with someone new', text: 'An open invitation to share a lunch break outside your usual class group. Order your own meal, meet near the foodcourt entrance and find available seats together.', location: 'canteen', time: '12:30', capacity: 6, experience: 'Everyone welcome', tags: ['Come solo', 'Pay for your meal'] },
    { title: () => 'The budget lunch table', text: 'Swap favourite affordable campus food suggestions over lunch. Everyone chooses and pays for their own meal; meet first and find a table together.', location: 'canteen', time: '13:00', capacity: 8, experience: 'Everyone welcome', tags: ['Budget-friendly ideas', 'Campus food'] },
    { title: () => 'Packed lunch, good company', text: 'Bring a packed lunch and take a proper break together. Meet at the canteen and use a permitted seating area; no food or reserved seats are provided.', location: 'canteen', time: '12:00', capacity: 5, experience: 'Everyone welcome', tags: ['Bring your own lunch', 'Easy conversation'] },
    { title: () => 'Lunch for two, without the rush', text: 'A small lunch plan for students who prefer getting to know one person at a time. Order separately, find a free table and leave whenever you need to get to class.', location: 'canteen', time: '13:30', capacity: 2, experience: 'Everyone welcome', tags: ['One new friend', 'Small plan'] },
    { title: () => 'Four seats and a food swap', text: 'Share recommendations for your favourite campus dishes over your own meals. Food sharing is optional; check dietary needs directly before offering anything.', location: 'canteen', time: '12:15', capacity: 4, experience: 'Everyone welcome', tags: ['Food recommendations', 'Small table'] },
    { title: () => 'Late lunch after the last class', text: 'Finished class later than your friends? Meet for a relaxed late lunch. Check which stalls are open, buy your own meal and find available seating together.', location: 'canteen', time: '14:00', capacity: 8, experience: 'Everyone welcome', tags: ['Late lunch', 'New faces welcome'] },
  ],
  interests: [
    { title: () => 'Ten photos, one campus', text: 'Choose a colour and look for ten interesting details around campus. A phone camera is enough. Meet at the commons and ask before photographing anyone.', location: 'commons', time: '16:30', capacity: 8, image: 'photography', experience: 'Beginner', tags: ['Phone photography', 'Photo prompt'] },
    { title: () => 'Sketch the everyday', text: 'Bring paper and a pencil, pick a familiar campus corner and sketch for twenty minutes. Sharing your drawing is optional; this is about noticing, not perfect artwork.', location: 'commons', time: '16:00', capacity: 6, image: 'photography', experience: 'Beginner', tags: ['Sketching', 'Bring a pencil'] },
    { title: () => 'The one-chapter book club', text: 'Bring a book you are reading and a short passage to talk about. Read quietly first, then chat in a suitable space. No shared reading list or homework.', location: 'library', time: '16:00', capacity: 6, image: 'study', experience: 'Everyone welcome', tags: ['Reading', 'Bring your book'] },
    { title: () => 'A playlist and the story behind it', text: 'Pick a song that reminds you of a place, person or moment, and tell the story behind your choice. Use your own headphones for listening and keep shared areas quiet.', location: 'commons', time: '17:00', capacity: 8, image: 'photography', experience: 'Everyone welcome', tags: ['Music', 'Share a story'] },
    { title: () => 'Photo feedback in fours', text: 'Bring three photos and one editing question. Give each other specific, kind feedback on composition and light. Best for students already comfortable taking and selecting photos.', location: 'commons', time: '16:30', capacity: 4, image: 'photography', experience: 'Intermediate', tags: ['Photography', 'Creative feedback'] },
    { title: () => 'Tiny zines, big ideas', text: 'Fold a single sheet into a mini magazine about something you enjoy. Bring paper, pens and your own supplies. Swap ideas; sharing or trading your finished zine is optional.', location: 'commons', time: '15:30', capacity: 12, image: 'photography', experience: 'Beginner', tags: ['Paper crafts', 'Bring supplies'] },
  ],
  events: [
    { title: () => 'New faces, three easy questions', text: 'Meet a few students through short introductions and three light conversation prompts. You can pass on any question. Come solo and choose a follow-up plan together.', location: 'commons', time: '17:00', capacity: 12, experience: 'Everyone welcome', tags: ['Meet new people', 'Come solo'] },
    { title: () => 'Bring a tiny project', text: 'Show a sketch, a small program, a craft or an idea you are trying. Take turns sharing for two minutes and ask each other curious questions. Unfinished work is welcome.', location: 'commons', time: '16:30', capacity: 12, experience: 'Everyone welcome', tags: ['Show and tell', 'Unfinished is welcome'] },
    { title: () => 'Find your next weekend plan', text: 'Trade ideas for a low-key weekend activity, compare availability and decide on a public meetup together. This is a student planning conversation, not a booked outing.', location: 'commons', time: '17:30', capacity: 8, experience: 'Everyone welcome', tags: ['Plan together', 'Weekend ideas'] },
    { title: () => 'Speak for a minute', text: 'Try a one-minute introduction or talk about something you enjoy. Listeners share one encouraging observation. Taking a turn is optional; this is informal peer practice.', location: 'commons', time: '16:00', capacity: 6, experience: 'Beginner', tags: ['Speaking practice', 'Peer encouragement'] },
    { title: () => 'Four ideas for a campus club', text: 'A small planning table for students thinking about a regular hobby meetup. Compare interests, agree on a first activity and discuss what each person can help with.', location: 'commons', time: '17:00', capacity: 4, experience: 'Everyone welcome', tags: ['Club ideas', 'Plan a meetup'] },
    { title: () => 'The cross-course hello', text: 'Meet people studying something different, swap a small highlight from your week and find one shared interest. Rotate through small conversations at your own pace.', location: 'commons', time: '17:30', capacity: 16, experience: 'Everyone welcome', tags: ['Community meetup', 'Across courses'] },
  ],
};

const SHARED = {
  study: [
    { title: s => `${s[0]} beyond your classroom`, subject: 0, text: 'Compare notes with students at other schools, choose one practice question each and work quietly in permitted study seating.', venue: 'public-clementi-library', time: '16:30', capacity: 6, experience: 'Beginner', tags: ['Across schools', 'Bring your notes'] },
    { title: s => `${s[1]} library focus session`, subject: 1, text: 'Bring your own practice task, set a small goal and focus alongside other students. Keep discussion quiet and step into an appropriate space for longer conversations.', venue: 'public-jurong-library', time: '16:00', capacity: 6, experience: 'Intermediate', tags: ['Quiet focus', 'Independent practice'] },
    { title: s => `${s[2]} study buddy afternoon`, subject: 2, text: 'Settle into permitted study seating with your own class material. Start with one question and end with one next step; respect other library users throughout.', venue: 'public-bukit-batok-library', time: '15:30', capacity: 4, experience: 'Everyone welcome', tags: ['Study buddies', 'Bring your notes'] },
  ],
  sports: [
    { title: () => 'Bishan park, an easy pace', text: 'Meet for a gentle walk on public park paths. Choose a short route together, bring water and check the weather before setting off.', venue: 'public-bishan-ang-mo-kio-park', time: '17:30', capacity: 8, experience: 'Beginner', tags: ['Walking', 'Easy pace'] },
    { title: () => 'Waterway walk and talk', text: 'Stretch your legs after a day of classes with a relaxed walk. Agree on a public meeting point and route before travelling; bring water and suitable shoes.', venue: 'public-punggol-waterway-park', time: '17:00', capacity: 10, experience: 'Everyone welcome', tags: ['Walking', 'After-class break'] },
    { title: () => 'East Coast easy jog', text: 'A conversational jog on public park paths followed by a walking cool-down. Agree on distance together and let the host know your preferred pace. Bring your own water.', venue: 'public-east-coast-park', time: '17:30', capacity: 8, experience: 'Intermediate', tags: ['Jogging', 'Conversational pace'] },
  ],
  games: [
    { title: () => 'Quiet chess at Bishan', text: 'Bring a pocket chess set for unhurried games in a permitted public seating area. Keep voices low, take turns and respect the library rules.', venue: 'public-bishan-library', time: '16:00', capacity: 4, experience: 'Beginner', tags: ['Chess', 'Quiet games'] },
    { title: () => 'Paper puzzles by the water', text: 'Bring a small notebook for word puzzles, drawing games and brain teasers. Choose appropriate public seating together and keep paper secure if it is breezy.', venue: 'public-marina-barrage', time: '16:30', capacity: 6, experience: 'Everyone welcome', tags: ['Paper games', 'Bring a notebook'] },
    { title: () => 'Pocket games at the park', text: 'Bring a compact card or puzzle game you can explain quickly. Find an appropriate public seating area and rotate through a few short rounds; check the weather first.', venue: 'public-esplanade-park', time: '16:00', capacity: 8, experience: 'Everyone welcome', tags: ['Card games', 'Rules explained'] },
  ],
  lunch: [
    { title: () => 'A packed lunch by the waterway', text: 'Bring your own packed lunch, water and something to sit on. Meet first, then choose a permitted picnic area together. Take all litter home and check the weather.', venue: 'public-punggol-waterway-park', time: '12:30', capacity: 8, experience: 'Everyone welcome', tags: ['Bring your lunch', 'Picnic'] },
    { title: () => 'Barrage lunch and new faces', text: 'Take a lunch break with students from other schools. Bring your own food and mat, confirm a permitted picnic spot with the host and have a weather backup.', venue: 'public-marina-barrage', time: '13:00', capacity: 8, experience: 'Everyone welcome', tags: ['Bring your lunch', 'Across schools'] },
    { title: () => 'East Coast picnic table', text: 'Bring a simple packed lunch and meet in a small group. Find permitted public seating together; no table or food is supplied. Check dietary needs before sharing anything.', venue: 'public-east-coast-park', time: '12:00', capacity: 6, experience: 'Everyone welcome', tags: ['Picnic', 'Small group'] },
  ],
  interests: [
    { title: () => 'City details through your lens', text: 'Choose a colour or shape and photograph details along public paths. A phone is enough. Ask before photographing people and agree on a short route with the host.', venue: 'public-esplanade-park', time: '16:30', capacity: 8, image: 'photography', experience: 'Beginner', tags: ['Photography', 'Phone cameras welcome'] },
    { title: () => 'A chapter at Central Library', text: 'Bring a book for half an hour of quiet reading. Afterwards, share one thought in a suitable conversation area. You can simply listen; no reading assignment.', venue: 'public-central-library', time: '16:00', capacity: 6, image: 'study', experience: 'Everyone welcome', tags: ['Reading', 'Bring your book'] },
    { title: () => 'Sketch the park together', text: 'Bring a sketchbook and pencil to draw an ordinary detail that catches your eye. Find permitted public seating and check the weather. Sharing your sketch is optional.', venue: 'public-bishan-ang-mo-kio-park', time: '16:30', capacity: 8, image: 'photography', experience: 'Beginner', tags: ['Sketching', 'Bring supplies'] },
  ],
  events: [
    { title: () => 'Meet a kaki from another school', text: 'Start with small introductions and trade one recommendation for a hobby, book or study habit. Agree on a suitable public gathering spot and keep pathways clear.', venue: 'public-esplanade-park', time: '17:00', capacity: 12, experience: 'Everyone welcome', tags: ['Across schools', 'Easy introductions'] },
    { title: () => 'Plan a regular walking circle', text: 'Meet students interested in a recurring park walk. Compare schedules, decide on a comfortable pace and plan the first route together. Future meetings are not booked.', venue: 'public-bishan-ang-mo-kio-park', time: '17:30', capacity: 8, experience: 'Everyone welcome', tags: ['Start a group', 'Walking ideas'] },
    { title: () => 'Small projects, shared inspiration', text: 'Bring a photo, sketch or tiny project to show on your phone or paper. Share what you are learning in a relaxed group and invite questions; unfinished work is welcome.', venue: 'public-marina-barrage', time: '16:00', capacity: 12, experience: 'Everyone welcome', tags: ['Show and tell', 'Creative community'] },
  ],
};

function dateAfter(anchorDate, offset) {
  const date = new Date(`${anchorDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Additive, repeatable demo inventory. This function never changes profiles or memberships. */
export function seedActivityCatalogue(publicVenues, { anchorDate = '2026-09-13', profiles } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)
    || Number.isNaN(Date.parse(`${anchorDate}T00:00:00Z`))
    || new Date(`${anchorDate}T00:00:00Z`).toISOString().slice(0, 10) !== anchorDate) {
    throw new TypeError('anchorDate must be a valid YYYY-MM-DD date.');
  }
  const venues = Array.isArray(publicVenues) ? publicVenues : [];
  const allProfiles = profiles ?? [
    ...seedData().profiles,
    ...seedNeighbourhoodData(venues).profiles,
    ...seedRichNeighbourhoodData(venues).profiles,
  ];
  const byProfileId = new Map(allProfiles.map(profile => [profile.id, profile]));
  const createdAt = new Date(`${anchorDate}T00:00:00+08:00`).toISOString();
  const activities = [];

  for (const network of NETWORKS) {
    const institution = primaryInstitution(network);
    const ageBand = ['secondary', 'jc_mi'].includes(network) ? 'under18' : '18plus';
    const validProfile = profile => profile?.network === network && profile.ageBand === ageBand;
    const campus = Array.from({ length: 7 }, (_, index) => byProfileId.get(`${network}-p${index + 1}`))
      .filter(profile => validProfile(profile) && profile.institutionId === institution.id);
    // Missing seed records must not be recreated or silently substituted into a live database.
    if (campus.length !== 7) continue;
    const neighbours = Array.from({ length: 12 }, (_, index) => byProfileId.get(`${network}-neighbourhood-peer-${index + 1}`))
      .filter(profile => validProfile(profile) && profile.institutionId !== institution.id);
    const subjects = subjectsByNetwork[network];

    for (const [categoryIndex, category] of CATEGORIES.entries()) {
      for (const scope of ['campus', 'shared']) {
        const templates = scope === 'campus' ? CAMPUS[category] : SHARED[category];
        if (scope === 'shared' && neighbours.length < 6) continue;
        templates.forEach((template, index) => {
          const pool = scope === 'campus' ? campus : neighbours;
          const hostIndex = (categoryIndex * 2 + index) % pool.length;
          const host = pool[hostIndex];
          const location = scope === 'campus'
            ? locations.find(item => item.id === `${institution.id}-${template.location}`)
            : venues.find(item => item.id === template.venue && Number.isFinite(item.lat) && Number.isFinite(item.lng));
          if (!location) return;
          const capacity = template.capacity;
          const full = scope === 'campus' && index === 4;
          const count = full ? capacity : Math.min(capacity - 1, [2, 3, 2, 1, 3, 5][index]);
          const mentor = category === 'study' && index !== 3 && index % 2 === 0 ? byProfileId.get(`${network}-p2`) : null;
          const candidates = [host.id, ...(mentor ? [mentor.id] : []),
            ...pool.slice(hostIndex + 1).map(profile => profile.id), ...pool.map(profile => profile.id)];
          const participants = [...new Set(candidates)].slice(0, count);
          const participantRoles = category === 'study'
            ? Object.fromEntries(participants.map(id => [id, mentor?.id === id ? 'mentor' : 'peer'])) : {};
          const image = template.image || ({ study: 'study', sports: 'photography', games: 'games', lunch: 'lunch', interests: 'photography', events: 'study' }[category]);
          activities.push({
            id: `${network}-catalogue-${scope}-${category}-${String(index + 1).padStart(2, '0')}`,
            network, category, title: template.title(subjects),
            description: `${SAMPLE_NOTE} ${template.text} ${scope === 'campus' ? CAMPUS_NOTE : PUBLIC_NOTE}`,
            date: dateAfter(anchorDate, 1 + (categoryIndex + index * 3 + (scope === 'shared' ? 2 : 0)) % 21),
            time: template.time, location: location.name, locationId: location.id,
            capacity, participants, participantRoles,
            participantJoinedAt: Object.fromEntries(participants.map(id => [id, createdAt])),
            participantRoleJoinedAt: category === 'study' ? Object.fromEntries(participants.map(id => [id, createdAt])) : {},
            hostId: host.id, image: `/assets/kaki/${image}.webp`,
            tags: [...(scope === 'shared' ? ['Neighbourhood'] : []), ...template.tags, 'Demo sample'],
            experience: template.experience, subject: category === 'study' ? subjects[template.subject] : '',
            neighbourhoodOptIn: scope === 'shared', demoSample: true,
            demoCatalogue: 'activity-catalogue-v1', createdAt,
          });
        });
      }
    }
  }
  return { activities };
}
