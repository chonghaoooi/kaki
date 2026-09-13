import { NETWORKS, primaryInstitution } from './data.mjs';

export const SUPPORT_NEEDS = ['settling-in', 'study-pressure', 'friendships', 'confidence', 'life-changes'];
export const SUPPORT_FORMATS = ['small-group', 'large-group', 'one-to-one'];
export const SUPPORT_NEED_LABELS = {'settling-in':'Settling in','study-pressure':'Study pressure',friendships:'Friendships',confidence:'Confidence','life-changes':'Life changes'};

// Isolated, fictional support records; no real professional affiliation or credentials.
export function seedSupportData({now=Date.now()}={}) {
  const groups=[];
  const templates=[
    ['A softer start','settling-in','student','small-group','in-person',6,3,'Find a familiar face as you settle into a new routine.'],
    ['Room to breathe','study-pressure','professional','small-group','online',6,5,'A gentle space to talk about study pressure and everyday coping.'],
    ['Making friends, at your pace','friendships','student','small-group','in-person',5,5,'Share the awkward bits of meeting people, without needing to have it all figured out.'],
    ['Finding your voice','confidence','professional','large-group','online',24,12,'A guided discussion about confidence, boundaries and speaking up.'],
    ['One change at a time','life-changes','student','small-group','online',6,2,'Connect with students navigating changes in routines and responsibilities.'],
    ['A moment to talk','study-pressure','professional','one-to-one','online',1,0,'Request an individual conversation; a facilitator must confirm the offered slot.'],
    ['A listening ear','friendships','student','one-to-one','in-person',1,1,'A sample student listening slot, currently full. You can ask to join its waitlist.'],
    ['You belong here','settling-in','professional','large-group','in-person',20,8,'A welcoming discussion about belonging and building a support network.'],
  ];
  for(const network of NETWORKS)for(const ageBand of ['under18','18plus']) {
    const institution=primaryInstitution(network);
    const defaultBand=['secondary','jc_mi'].includes(network)?'under18':'18plus';
    templates.forEach(([title,need,leaderType,format,mode,capacity,occupied,summary],i)=>{
      const date=new Date(`${new Date(now+8*3600000).toISOString().slice(0,10)}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+i+2);
      const linkedStudent=leaderType==='student'&&ageBand===defaultBand;
      groups.push({id:`${network}-${ageBand}-support-${i+1}`,network,ageBand,title,summary,
        description:`Fictional kaki support-group demo. ${summary} This sample is not a clinical service or a confirmed real-world session. Share only what feels comfortable; participation is voluntary.`,
        need,needLabel:SUPPORT_NEED_LABELS[need],leaderType,format,mode,capacity,date:date.toISOString().slice(0,10),time:i%2?'17:00':'16:00',durationMinutes:format==='one-to-one'?30:60,
        location:mode==='online'?'Online · meeting link pending facilitator confirmation':`${institution.name} · Library meeting point (sample; no space reserved)`,
        hostPersonId:linkedStudent?`${network}-p3`:null,
        host:{name:leaderType==='professional'?'Alex Chen · sample professional':linkedStudent?'Nur Aisyah':'Sam Lee · sample student',role:leaderType==='professional'?'Professional facilitator · fictional sample':'Student listener · fictional sample',credentials:leaderType==='professional'?'Fictional sample professional; credentials have not been verified.':'Fictional peer listener; not a counsellor or clinician.',bio:'A fictional host used to demonstrate the support flow. No live facilitation or professional care is provided.',verification:'demo'},
        topics:[SUPPORT_NEED_LABELS[need],'Listening without judgement'],expectations:['Share only what you feel comfortable sharing.','Respect privacy; do not copy or share other members’ messages.','Listen without diagnosing, judging or pressuring anyone.','Peer support is not emergency or clinical care.'],demoSample:true,demoOccupied:occupied,
      });
    });
  }
  return groups;
}
