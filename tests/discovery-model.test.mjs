import test from 'node:test';
import assert from 'node:assert/strict';
import { singaporeDateKey, dateLabelFor, isDiscoverableActivity, compareActivities, matchesActivitySearch, activityExperienceLabel } from '../src/discovery-model.ts';

test('Singapore date keys and relative labels roll over at Singapore midnight',()=>{
  const before=new Date('2026-09-13T15:59:59.999Z'),after=new Date('2026-09-13T16:00:00.000Z');
  assert.equal(singaporeDateKey(before),'2026-09-13');assert.equal(singaporeDateKey(after),'2026-09-14');
  assert.equal(dateLabelFor('2026-09-13',before),'Today');assert.equal(dateLabelFor('2026-09-14',before),'Tomorrow');assert.equal(dateLabelFor('2026-09-14',after),'Today');assert.equal(dateLabelFor('2026-09-13',after),'13 Sept');
  assert.equal(singaporeDateKey(after.getTime()),'2026-09-14');assert.equal(singaporeDateKey(new Date(NaN)),'');
});

test('Tomorrow handles month, leap-day and year transitions without local-time assumptions',()=>{
  assert.equal(dateLabelFor('2027-01-01',new Date('2026-12-31T04:00:00Z')),'Tomorrow');
  assert.equal(dateLabelFor('2027-01-02',new Date('2026-12-31T04:00:00Z')),'2 Jan 2027');
  assert.equal(dateLabelFor('2028-02-29',new Date('2028-02-28T04:00:00Z')),'Tomorrow');
  assert.equal(dateLabelFor('2028-03-01',new Date('2028-02-29T04:00:00Z')),'Tomorrow');
  assert.equal(dateLabelFor('2026-09-13T16:00:00Z',new Date('2026-09-14T04:00:00Z')),'Today');
  for(const value of ['','bad date','2026-02-30','2026-13-01','2026-09-13T20:00:00'])assert.equal(dateLabelFor(value),'Date to be confirmed');
});

test('study visibility matches the server two-hour boundary, including overnight sessions',()=>{
  const activity={date:'2026-09-13',time:'23:00',category:'study'};
  assert.equal(isDiscoverableActivity(activity,new Date('2026-09-13T16:59:59.999Z')),true);
  assert.equal(isDiscoverableActivity(activity,new Date('2026-09-13T17:00:00.000Z')),false);
  assert.equal(isDiscoverableActivity({...activity,demoHistorical:true},new Date('2026-09-13T10:00:00Z')),false);
  assert.equal(isDiscoverableActivity({...activity,time:'11:00 PM'},new Date('2026-09-13T16:30:00Z')),true);
  assert.equal(isDiscoverableActivity({...activity,endsAt:'2026-09-15T17:00:00Z'},new Date('2026-09-13T17:00:00Z')),false);
});

test('non-study events with no end remain discoverable through their Singapore date',()=>{
  const activity={date:'2026-09-13',time:'08:00',category:'sports'};
  assert.equal(isDiscoverableActivity(activity,new Date('2026-09-13T15:59:59.999Z')),true);
  assert.equal(isDiscoverableActivity(activity,new Date('2026-09-13T16:00:00.000Z')),false);
  assert.equal(isDiscoverableActivity({...activity,date:'2026-09-14'},new Date('2026-09-13T04:00:00Z')),true);
  assert.equal(isDiscoverableActivity({date:'2026-09-13',category:'events'},new Date('2026-09-13T04:00:00Z')),true);
});

test('explicit and partner end schedules expire precisely without guessing overnight dates',()=>{
  const event={category:'events',startsAt:'2026-09-13T20:00:00+08:00',endsAt:'2026-09-14T01:00:00+08:00'};
  assert.equal(isDiscoverableActivity(event,new Date('2026-09-13T16:59:59Z')),true);assert.equal(isDiscoverableActivity(event,new Date('2026-09-13T17:00:00Z')),false);
  const local={date:'2026-09-13',time:'20:00',endDate:'2026-09-14',endTime:'01:00',category:'games'};
  assert.equal(isDiscoverableActivity(local,new Date('2026-09-13T16:59:59Z')),true);assert.equal(isDiscoverableActivity(local,new Date('2026-09-13T17:00:00Z')),false);
  assert.equal(isDiscoverableActivity({...local,endDate:undefined},new Date('2026-09-13T12:00:00Z')),false);
  assert.equal(isDiscoverableActivity({...local,endTime:undefined},new Date('2026-09-14T15:59:59Z')),true);assert.equal(isDiscoverableActivity({...local,endTime:undefined},new Date('2026-09-14T16:00:00Z')),false);
});

test('invalid or impossible schedules are excluded and sort behind valid timestamps',()=>{
  const now=new Date('2026-09-13T04:00:00Z');
  for(const activity of [null,{}, {date:'2026-02-30',time:'14:00'}, {date:'2026-09-13',time:'24:00'}, {date:'2026-09-13',time:'13:00 PM'}, {date:'2026-09-13',category:'study'}, {startsAt:'invalid',endsAt:'2026-09-14T10:00:00Z'}])assert.equal(isDiscoverableActivity(activity,now),false);
  const events=[{id:'later',date:'2026-09-14',time:'00:00'},{id:'noon',date:'2026-09-13',time:'12 PM'},{id:'bad',date:'bad'},{id:'midnight',date:'2026-09-13',time:'12:00 AM'},{id:'morning',date:'2026-09-13',time:'9:30 am'}];
  assert.deepEqual(events.sort(compareActivities).map(x=>x.id),['midnight','morning','noon','later','bad']);
  assert.equal(compareActivities({date:'2026-09-13',time:'08:00'},{startsAt:'2026-09-13T00:00:00Z'}),0);assert.equal(compareActivities({},{}),0);
});

test('search matches venue, subject, tags and school fields across query words',()=>{
  const activity={title:'Practice together',description:'Bring a tricky question',subject:'Python',tags:['Quiet focus'],location:'Clementi Public Library',institutionLabel:'Singapore Polytechnic',hostInstitution:'Ngee Ann Polytechnic',host:{institution:'National University of Singapore'}};
  for(const query of ['Clementi','python library','  QUIET   focus ','Singapore Polytechnic','ngee ann','university','tricky question',''])assert.equal(matchesActivitySearch(activity,query),true,query);
  assert.equal(matchesActivitySearch(activity,'badminton'),false);assert.equal(matchesActivitySearch(activity,'python bishan'),false);assert.equal(matchesActivitySearch({location:'Café Commons'},'cafe'),true);assert.equal(matchesActivitySearch({tags:[null,{}]},'object'),false);
});

test('experience badges never turn intermediate or unknown activities into beginner events',()=>{
  assert.equal(activityExperienceLabel({experience:'Intermediate',tags:['Beginner friendly']}),'Intermediate');
  assert.equal(activityExperienceLabel({experience:'Competitive',tags:['Everyone welcome']}),'Competitive');
  assert.equal(activityExperienceLabel({experience:'Casual'}),'Casual');assert.equal(activityExperienceLabel({experience:'Beginner'}),'Beginner friendly');
  assert.equal(activityExperienceLabel({experience:'Advanced practice'}),'Advanced practice');assert.equal(activityExperienceLabel({experience:'Everyone welcome'}),'Everyone welcome');
  assert.equal(activityExperienceLabel({tags:['Beginners welcome']}),'Beginner friendly');assert.equal(activityExperienceLabel({tags:['Beginner friendly','Intermediate']}),'Intermediate');
  for(const activity of [null,{}, {tags:['Free','Rackets available']}, {tags:['Not beginner friendly']}, {experience:' ',tags:[]}])assert.equal(activityExperienceLabel(activity),null);
});
