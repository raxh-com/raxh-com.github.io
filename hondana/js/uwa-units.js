// Units del MCom UWA, de Academic_Record_EN.html
const UCAT = {
  conv:{ label:'Conversion unit',            color:'#B8864A' },
  core:{ label:'Core unit',                  color:'#A85E42' },
  spec:{ label:'BILM specialisation option', color:'#4A9491' },
  opt: {  label:'Elective / 2nd specialisation', color:'#5E8DB5' },
};

// [code, unit title, category, status, note]   status: 'credit' | 'now' | 'plan'
const U = {
'Credited on admission — advanced standing, 12 points': [
  ['ECON5541','Economics for Business: Applications and Policy','conv','credit','Recognised on the basis of prior study in Industrial Civil Engineering.'],
  ['MKTG5561','Marketing Management','conv','credit','Recognised on the basis of prior study in Industrial Civil Engineering.'],
],
'2026 · Semester 2 — enrolled  (teaching from 20 July 2026)': [
  ['ACCT5432','Introductory Financial Accounting','conv','now',''],
  ['MGMT5507','Management and Organisations','conv','now',''],
  ['BUSN5100','Applied Professional Business Communication','core','now',''],
  ['INMT5518','BILM specialisation unit','spec','now','Taken in the slot freed by the ECON5541 credit.'],
],
'2027 · Semester 1 — planned': [
  ['MGMT5511','Introduction to Global Business','core','plan',''],
  ['—','BILM specialisation option','spec','plan',''],
  ['—','Elective','opt','plan',''],
  ['—','Elective or 2nd specialisation unit','opt','plan',''],
],
'2027 · Semester 2 — planned': [
  ['—','BILM specialisation option','spec','plan',''],
  ['—','BILM specialisation option','spec','plan',''],
  ['—','Elective or 2nd specialisation unit','opt','plan',''],
  ['—','Elective or 2nd specialisation unit','opt','plan',''],
],
'2028 · Semester 1 — planned  (course ends 30 June 2028)': [
  ['MGMT5526','Principles for Responsible Management','core','plan',''],
  ['—','Elective or 2nd specialisation unit','opt','plan',''],
],
};
const UST = {
  credit:{ label:'Credited', cls:'done' },
  now:   { label:'Enrolled', cls:'now'  },
  plan:  { label:'Planned',  cls:'todo' },
};
