import { readFileSync } from 'node:fs';

export const NETWORKS = ['secondary', 'jc_mi', 'polytechnic', 'university'];
export const ANCHOR_DATE = '2026-09-13';
const titleCase = s => s.toLowerCase().replace(/\b\w/g, m => m.toUpperCase()).replace(/\bJc\b/g, 'JC');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const source = JSON.parse(readFileSync(new URL('./school-directory-source.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const schools = source.flatMap(row => {
  const levels = [];
  if (/SECONDARY|MIXED LEVEL/.test(row.mainlevel_code)) levels.push('secondary');
  if (/JUNIOR COLLEGE|CENTRALISED|JC/.test(row.mainlevel_code)) levels.push('jc_mi');
  return levels.map(network => ({ id: `${network}-${slug(row.school_name)}`, name: titleCase(row.school_name), network, domains: [`${slug(row.school_name)}.${network.replace('_', '-')}.kaki.test`], verificationMode: 'demo-only', website: row.url_address }));
});
const tertiary = [
  ['sp','Singapore Polytechnic','polytechnic','ichat.sp.edu.sg'],
  ['np','Ngee Ann Polytechnic','polytechnic','connect.np.edu.sg'],
  ['tp','Temasek Polytechnic','polytechnic','student.tp.edu.sg'],
  ['nyp','Nanyang Polytechnic','polytechnic','mymail.nyp.edu.sg'],
  ['rp','Republic Polytechnic','polytechnic','myrp.edu.sg'],
  ['nus','National University of Singapore','university','u.nus.edu'],
  ['ntu','Nanyang Technological University','university','e.ntu.edu.sg'],
  ['smu','Singapore Management University','university','smu.edu.sg'],
  ['sutd','Singapore University of Technology and Design','university','mymail.sutd.edu.sg'],
  ['sit','Singapore Institute of Technology','university','sit.singaporetech.edu.sg'],
  ['suss','Singapore University of Social Sciences','university','suss.edu.sg'],
].map(([id,name,network,domain])=>({id,name,network,domains:[domain],verificationMode: ['smu','suss'].includes(id) ? 'demo-only' : 'email'}));
export const institutions = [...schools, ...tertiary];
export const primaryInstitution = network => institutions.find(x => x.id === ({secondary:'secondary-admiralty-secondary-school',jc_mi:'jc_mi-anderson-serangoon-junior-college',polytechnic:'sp',university:'nus'}[network])) || institutions.find(x=>x.network===network);
export const locations = institutions.flatMap(institution => ['library','sports','canteen','commons'].map((type,i)=>({id:`${institution.id}-${type}`,name:`${institution.name} · ${['Library','Sports centre','Canteen','Student commons'][i]}`,institutionId:institution.id,network:institution.network,type,public:true})));
export const subjectsByNetwork = {secondary:['A-Math','Chemistry','English'],jc_mi:['H2 Mathematics','H2 Chemistry','General Paper'],polytechnic:['Database Systems','Web Development','Python'],university:['CS2040','Calculus','CS2103T']};
export const defaultSettings = ageBand => ({discoverable:ageBand!=='under18',allowInvites:ageBand!=='under18',activityVisibility:ageBand==='under18'?'connections':'community',telegramNotifications:false,telegramActivities:false,telegramMatches:false,telegramCircles:false,telegramLunch:false});
export function seedData() {
  const profiles=[],activities=[],circles=[],tutors=[],messages=[],connections=[];
  for (const network of NETWORKS) {
    const institution=primaryInstitution(network),subjects=subjectsByNetwork[network],ageBand=['secondary','jc_mi'].includes(network)?'under18':'18plus';
    const names=['Jamie Tan','Jia Wei Lim','Alicia Tan','Nur Aisyah','Ryan Koh','Priya Nair','Marcus Lee','Sofia Wong'];
    const bios=['A little studying, a little badminton. Always up for meeting a new kaki.','Usually studying web dev after class. Also down for badminton and board games.','Learning is better together. Happy to help you work through a tricky question.','Here for good food, creative projects and easy conversations.','Board games, big ideas, and a friendly game of badminton.','Looking for a study buddy and a reason to try something new.','Finding my people, one campus activity at a time.','Camera in hand, always looking for a new perspective.'];
    names.forEach((name,i)=>profiles.push({id:`${network}-p${i}`,name,institutionId:institution.id,institution:institution.name,network,course:network==='secondary'?'Secondary 3':network==='jc_mi'?'Science stream':network==='polytechnic'?'Diploma in Information Technology':'Computer Science',year:network==='secondary'?'Secondary 3':'Year 2',bio:bios[i],avatar:`/assets/kaki/avatar-${(i%6)+1}.webp`,interests:i===3?['Art','Lunch','Photography']:i===7?['Photography','Walking','Music']:['Badminton','Board games','Coding'],subjects,languages:['English',i%2?'Mandarin':'Malay'],studyStyle:i%2?'Collaborative':'Quiet focus',availability:['Afternoons','Weekends'],ageBand,settings:{...defaultSettings(ageBand),discoverable:true},verified:true,verificationMethod:'demo',onboardingComplete:true,email:`seed-${network}-${i}@kaki.test`,telegramUsername:null}));
    const configs=[
      ['Sports','Casual badminton','No experience needed — just come play. Bring a water bottle; spare rackets are available.','2026-09-13','17:30','sports',6,[1,3,4,5],'badminton',['Beginner friendly','Rackets available']],
      ['Study',`${subjects[0]} study session`,'Bring your questions and work through a practice set together. We will take breaks and help each other.','2026-09-14','15:00','library',6,[1,2,4],'study',['Focused + friendly','Peer support']],
      ['Games','Board game Friday','UNO, Codenames and a table full of new faces. All rules explained; come solo or bring a friend.','2026-09-18','16:00','commons',8,[3,4,6,7],'games',['UNO','Codenames','Beginners welcome']],
      ['Lunch','A seat at our lunch table','New to campus or just fancy some company? Pull up a chair. Everyone orders their own food.','2026-09-13','13:00','canteen',5,[3,5,6],'lunch',['Casual','Anything goes']],
      ['Interests','Golden hour photo walk','Explore familiar campus corners from a new angle. A phone camera is more than enough.','2026-09-19','16:30','commons',8,[7,3,5],'photography',['Phone cameras welcome','Creative']],
      ['Events','Find your study circle','Meet students taking similar modules through relaxed small-group activities and a shared planning session.','2026-09-17','17:30','commons',24,[1,2,3,4,5,6,7],'study',['Community mixer','Small groups']],
      ['Sports','A gentle campus walk','A relaxed walk, fresh air and a chance to unwind together after class.','2026-09-15','17:00','commons',6,[4,5],'photography',['Casual','Walking']],
      ['Study','Project team co-working','Bring your project, find a quiet corner and make progress together. Optional check-in at the end.','2026-09-16','14:00','library',5,[2,6],'study',['Project teammates','Quiet focus']],
    ];
    configs.forEach(([category,title,description,date,time,loc,capacity,people,img,tags],i)=>{const location=locations.find(x=>x.id===`${institution.id}-${loc}`),participants=people.map(n=>`${network}-p${n}`);activities.push({id:`${network}-a${i+1}`,network,category:category.toLowerCase(),title,description,date,time,location:location.name,locationId:location.id,capacity,participants,...(category==='Study'?{participantRoles:Object.fromEntries(people.map(n=>[`${network}-p${n}`,n===2?'mentor':'peer'])),participantRoleJoinedAt:Object.fromEntries(participants.map(id=>[id,'2026-09-10T08:00:00.000Z']))}:{}),hostId:`${network}-p${people[0]}`,image:`/assets/kaki/${img}.webp`,tags,experience:'Beginner',subject:category==='Study'?subjects[0]:'',demoSample:true,createdAt:'2026-09-10T08:00:00.000Z'});});
    [['Photography Walks','Photography','photography',46],['Code & Coffee','Coding','study',32],['Board Game Kakis','Board games','games',28],['Weekend Shuttlers','Badminton','badminton',24]].forEach(([name,interest,img,count],i)=>circles.push({id:`${network}-c${i+1}`,network,name,title:name,interest,description:`A friendly little community to explore ${interest.toLowerCase()} together. New faces are always welcome.`,image:`/assets/kaki/${img}.webp`,members:[`${network}-p${i+1}`,`${network}-p${i+3}`],memberCount:count,nextEvent:'Saturday · 4:30 PM',tags:[interest,'Beginner friendly'],activityIds:([[5],[2,8],[3],[1,7]][i]).map(n=>network+'-a'+n)}));
    [2,5].forEach((p,i)=>tutors.push({id:`${network}-t${i+1}`,network,personId:`${network}-p${p}`,subject:subjects[i],subjects:[subjects[i]],price:i?15:0,priceLabel:i?'S$15 / hour':'Free · Peer support',availability:['Weekday afternoons','Saturday'],mode:'In person',bio:'Patient, friendly peer support. We can go at your pace.'}));
    connections.push({sender:`${network}-p1`,recipient:`${network}-p0`,action:'connect'});
    connections.push({sender:`${network}-p3`,recipient:`${network}-p0`,action:'connect'},{sender:`${network}-p0`,recipient:`${network}-p3`,action:'connect'});
    messages.push({id:`${network}-m1`,network,senderId:`${network}-p3`,recipientId:`${network}-p0`,text:'Hey Jamie! We have a spare seat at lunch. Want to join us? 😊',createdAt:'2026-09-13T03:42:00.000Z'});
  }
  return {profiles,activities,circles,tutors,messages,connections};
}

// Separate records keep the mentor demo from rewriting students' existing plans.
export function seedMentorData() {
  const activities=[],registrations=[],likes=[];
  for(const network of NETWORKS){
    const institution=primaryInstitution(network),location=locations.find(l=>l.id===`${institution.id}-library`),subject=subjectsByNetwork[network][0];
    const alicia=`${network}-p2`,ryan=`${network}-p4`,jamie=`${network}-p0`,jiaWei=`${network}-p1`,aisyah=`${network}-p3`;
    registrations.push({id:alicia,registeredAt:'2026-09-08T02:00:00.000Z'},{id:ryan,registeredAt:'2026-09-13T02:00:00.000Z'});
    for(const [suffix,hostId,date,time,participants,createdAt,title] of [
      ['history-1',alicia,'2026-09-09','10:00',[alicia,jamie,jiaWei],'2026-09-08T02:00:00.000Z',`${subject} practice together`],
      ['history-2',alicia,'2026-09-11','14:00',[alicia,jiaWei,aisyah],'2026-09-10T02:00:00.000Z',`${subject} questions and recap`],
      ['ryan-next',ryan,'2026-09-20','14:00',[ryan],'2026-09-13T02:00:00.000Z','First study meetup with Ryan'],
    ])activities.push({id:`${network}-mentor-${suffix}`,network,category:'study',title,description:suffix.startsWith('history')?'A completed demo study session. These fictional participation records illustrate mentor experience.':'A friendly demo study session with a new peer mentor. Bring a practice question and learn together.',date,time,location:location.name,locationId:location.id,capacity:6,participants,participantRoles:Object.fromEntries(participants.map(id=>[id,id===hostId?'mentor':'peer'])),participantJoinedAt:Object.fromEntries(participants.map(id=>[id,createdAt])),participantRoleJoinedAt:Object.fromEntries(participants.map(id=>[id,createdAt])),hostId,image:'/assets/kaki/study.webp',tags:['Peer support','Demo session'],experience:'Everyone welcome',subject,createdAt,demoSample:true,demoHistorical:suffix.startsWith('history')});
    likes.push({sender:jiaWei,recipient:alicia,createdAt:'2026-09-09T04:10:00.000Z'},{sender:aisyah,recipient:alicia,createdAt:'2026-09-11T08:10:00.000Z'});
  }
  return {activities,registrations,likes};
}

export function seedNeighbourhoodData(publicVenues) {
  const profiles=[],activities=[],baseProfiles=seedData().profiles,venue=publicVenues.find(v=>v.id==='public-clementi-library');
  if(!venue)return {profiles,activities};
  for(const network of NETWORKS){
    const base=baseProfiles.find(p=>p.id===`${network}-p6`),preferred={polytechnic:'np',university:'ntu'}[network];
    const institution=institutions.find(i=>i.id===preferred)||institutions.find(i=>i.network===network&&i.id!==primaryInstitution(network).id);
    if(!base||!institution)continue;
    const profile={...base,id:`${network}-neighbourhood-host`,name:'Chloe Lim',institutionId:institution.id,institution:institution.name,email:`seed-neighbourhood-${network}@kaki.test`,bio:'A book, a sketchbook and a friendly hello. Fictional demo host for a neighbourhood meetup.',interests:['Reading','Art','Walking']};profiles.push(profile);
    activities.push({id:`${network}-neighbourhood-demo`,network,category:'interests',title:'A little reading, a new kaki',description:'This fictional demo host has opted to share a relaxed public-library reading meetup with students from other schools in the same education and age community. Bring your own book; no room reservation is included.',date:'2026-09-19',time:'14:00',location:venue.name,locationId:venue.id,capacity:6,participants:[profile.id],hostId:profile.id,image:'/assets/kaki/study.webp',tags:['Neighbourhood','Reading','Demo event'],experience:'Everyone welcome',subject:'',neighbourhoodOptIn:true,demoSample:true,createdAt:'2026-09-13T03:00:00.000Z'});
  }
  return {profiles,activities};
}

/** Deterministic fictional events; the venue coordinates themselves are sourced. */
export function seedRichNeighbourhoodData(publicVenues) {
  const profiles=[],activities=[],messages=[],baseProfiles=seedData().profiles;
  const venues=publicVenues.filter(v=>Number.isFinite(v.lat)&&Number.isFinite(v.lng)).slice(0,10);
  if(!venues.length)return {profiles,activities,messages};
  const libraries=venues.filter(v=>v.type==='library'),outdoors=venues.filter(v=>v.type!=='library');
  const names=['Amelia Goh','Daniel Teo','Zara Hassan','Isaac Ong','Mei Chen','Harith Rahman','Leah Tan','Jun Kai Lee','Tessa Lim','Faris Abdullah','Noelle Wong','Aaron Chua'];
  const categories=['study','interests','games','lunch','sports','events'];
  const themes={
    study:{titles:['One question at a time','A focused hour, together','Bring your trickiest question','Quiet study, friendly company'],image:'study',tags:['Peer support','Bring your notes'],time:'15:00',text:'Bring one practice question and your notes for a small, friendly study session. Use permitted public study seating; no room is reserved.'},
    interests:{titles:['Sketch a little, meet a kaki','Phones out for a photo walk','A book and a new perspective','Spot the small details'],image:'photography',tags:['Creative','Beginners welcome'],time:'16:30',text:'Bring a sketchbook or phone camera and explore the public spaces nearby. Meet at the public entrance; the venue marker is a meeting point, not a walking route.'},
    games:{titles:['Chess, one friendly move at a time','Pocket puzzles and new faces','A tiny tournament with kakis','Learn a new board game'],image:'games',tags:['Casual games','All levels'],time:'14:30',text:'Bring a pocket chess set or a quiet puzzle. We will choose an appropriate public seating area and follow the venue rules. No table or room is reserved.'},
    lunch:{titles:['A lunch break with new faces','Bring your appetite and a hello','One more seat at lunch','An easy weekend lunch'],image:'lunch',tags:['Bring your own lunch','Casual'],time:'12:30',text:'Bring your own packed lunch and water. Meet at the public venue, then choose a suitable public picnic area and follow its rules. Food, seating and reservations are not provided.'},
    sports:{titles:['An easy evening walk','Fresh air after a long week','Walk, talk and unwind','A gentle Saturday stroll'],image:'photography',tags:['Easy pace','Public paths'],time:'17:00',text:'Meet outside the public entrance for a relaxed walk on nearby public paths. Bring water and suitable shoes. The map shows the meeting venue, not a route or a sports-facility booking.'},
    events:{titles:['Meet the people behind the group chat','A small welcome for new kakis','Ideas, introductions and good company','Find your next regular meetup'],image:'study',tags:['Community meetup','Small groups'],time:'16:00',text:'A relaxed introduction to other students and their interests. Meet at the public entrance and use a suitable public space while respecting its rules. No organised venue programme or room booking is implied.'},
  };
  for(const network of NETWORKS){
    const base=baseProfiles.find(p=>p.id===`${network}-p6`),schools=institutions.filter(i=>i.network===network).slice(0,6),cohort=[];
    for(let i=0;i<names.length;i++){
      const institution=schools[i%schools.length],profile={...base,id:`${network}-neighbourhood-peer-${i+1}`,name:names[i],institutionId:institution.id,institution:institution.name,email:`seed-neighbourhood-${network}-${i+1}@kaki.test`,avatar:`/assets/kaki/avatar-${i%6+1}.webp`,bio:['Always happy to make a little plan and meet a new kaki.','A good study session, a quiet game and a friendly hello.','Here for small adventures and easy conversations.'][i%3],interests:[['Reading','Coding','Walking'],['Photography','Art','Lunch'],['Board games','Puzzles','Walking']][i%3],settings:{...base.settings}};
      profiles.push(profile);cohort.push(profile);
    }
    for(let i=0;i<23;i++){
      const categoryIndex=i%categories.length,category=categories[categoryIndex],theme=themes[category],round=Math.floor(i/6);
      const candidatesForVenue=category==='study'||(category==='games'&&round===0)?(libraries.length?libraries:venues):(outdoors.length?outdoors:venues);
      const venue=candidatesForVenue[category==='games'&&round===0?candidatesForVenue.length-1:(round+Math.max(0,categoryIndex-1))%candidatesForVenue.length],host=cohort[i%cohort.length],capacity=[4,6,5,8,8,4,6,3][i%8],count=Math.min(capacity,[2,3,5,4,6,2,4,3][i%8]);
      const mentors=category==='study'?(i===12?[`${network}-p2`,`${network}-p4`]:[`${network}-p${i%12===0?2:4}`]):[];
      const candidates=[host.id,...mentors,...cohort.slice((i+1)%cohort.length).map(p=>p.id),...cohort.map(p=>p.id)];
      const participants=[...new Set(candidates)].slice(0,count),date=new Date(`${ANCHOR_DATE}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1+(i*5)%21);
      const createdAt='2026-09-13T03:00:00.000Z';
      activities.push({id:`${network}-neighbourhood-rich-${String(i+1).padStart(2,'0')}`,network,category,title:theme.titles[Math.floor(i/6)%theme.titles.length],description:`Fictional kaki demo event. ${theme.text}`,date:date.toISOString().slice(0,10),time:theme.time,location:venue.name,locationId:venue.id,capacity,participants,participantRoles:category==='study'?Object.fromEntries(participants.map(id=>[id,mentors.includes(id)?'mentor':'peer'])):{},participantJoinedAt:Object.fromEntries(participants.map(id=>[id,createdAt])),participantRoleJoinedAt:category==='study'?Object.fromEntries(participants.map(id=>[id,createdAt])):{},hostId:host.id,image:`/assets/kaki/${theme.image}.webp`,tags:['Neighbourhood',...theme.tags,'Demo sample'],experience:i%3===0?'Beginner':'Everyone welcome',subject:category==='study'?subjectsByNetwork[network][Math.floor(i/6)%3]:'',neighbourhoodOptIn:true,demoSample:true,createdAt});
    }
    messages.push({id:`${network}-demo-coffee-intro`,circleId:`${network}-c2`,network,senderId:`${network}-p2`,type:'message',text:'I can bring a few practice questions. Shall we keep the next meetup relaxed, with time for a coffee break?',createdAt:'2026-09-13T03:10:00.000Z'},{id:`${network}-demo-coffee-reply`,circleId:`${network}-c2`,network,senderId:`${network}-p4`,type:'message',text:'That sounds good! The sample plan is a good start. A weekly catch-up would make it easier to keep going.',createdAt:'2026-09-13T03:12:00.000Z'});
  }
  return {profiles,activities,messages};
}




