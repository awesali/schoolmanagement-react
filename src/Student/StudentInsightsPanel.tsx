import React from 'react';
type Row=Record<string,any>;
type Data={homework:Row[];submissions:Row[];attendance:Row[];exams:Row[];results:Row[];gradeHistory:Row[];materials:Row[];diary:Row[];timetable:Row[];schoolEvents:Row[];examResources?:Row[]};
export type InsightsView='Missing Work'|'Smart Alerts'|'Revision Plan'|'Progress Details'|'Daily Checklist';
const day=(value:any)=>String(value||'').slice(0,10);
const today=()=>new Date().toISOString().slice(0,10);
const daysUntil=(value:any)=>Math.ceil((new Date(day(value)+'T00:00:00').getTime()-new Date(today()+'T00:00:00').getTime())/86400000);
const panel=(title:string,content:React.ReactNode)=><section className="sp-panel"><div className="sp-panel-title"><h2>{title}</h2></div>{content}</section>;
const empty=(message:string)=><div className="sp-empty">{message}</div>;
export default function StudentInsightsPanel({view,data}:{view:InsightsView;data:Data}){
  const submissions=data.submissions||[];
  const missing=data.homework.filter(x=>!submissions.some(y=>y.assignmentId===x.id&&y.status!=='Resubmission Required'));
  const pending:(Row & {days:number})[]=missing.map(x=>({...x,days:daysUntil(x.dueDate)})).sort((a,b)=>a.days-b.days);
  const present=data.attendance.filter(x=>String(x.status).toLowerCase()==='present').length;
  const attendance=data.attendance.length?Math.round(present*100/data.attendance.length):null;
  const graded=submissions.filter(x=>x.marks!=null||x.teacherFeedback);
  const alerts=[...pending.filter(x=>x.days>=0&&x.days<=1).map(x=>({key:'h'+x.id,text:`${x.title} is due ${x.days===0?'today':'tomorrow'}.`,target:'Homework'})),...data.exams.filter(x=>daysUntil(x.examDate)>=0&&daysUntil(x.examDate)<=3).map(x=>({key:'e'+x.id,text:`${x.subjectName} exam is in ${daysUntil(x.examDate)} day(s).`,target:'Exams'})),...(attendance!==null&&attendance<80?[{key:'a',text:`Attendance is ${attendance}%. Contact your school if you need help.`,target:'Attendance'}]:[]),...graded.slice(0,3).map(x=>({key:'g'+x.id,text:`An assignment has feedback${x.marks!=null?` (${x.marks} marks)`:''}.`,target:'Homework'})),...data.materials.filter(x=>daysUntil(x.createdDate)>=-3&&daysUntil(x.createdDate)<=0).slice(0,3).map(x=>({key:'m'+x.id,text:`New ${x.subjectName} study material: ${x.title}.`,target:'Study Materials'}))];
  const upcoming=data.exams.filter(x=>daysUntil(x.examDate)>=0).sort((a,b)=>daysUntil(a.examDate)-daysUntil(b.examDate));
  const nextExam=upcoming[0];
  const syllabus=(data.examResources||[]).filter(x=>x.examName===nextExam?.examName&&x.subjectName===nextExam?.subjectName).flatMap(x=>String(x.syllabus||'').split(/[,;\n]+/).map((s:string)=>s.trim()).filter(Boolean));
  const todayClasses=data.timetable.filter(x=>Number(x.dayOfWeek)===new Date().getDay()&&!x.isBreak);
  const diaryToday=data.diary.filter(x=>day(x.entryDate)===today());
  const completed=submissions.filter(x=>x.status!=='Resubmission Required').length;
  const average=data.results.length?Math.round(data.results.reduce((sum,x)=>sum+Number(x.percentage||0),0)/data.results.length):null;
  let streak=0;for(const row of [...data.attendance].sort((a,b)=>day(b.date).localeCompare(day(a.date)))){if(String(row.status).toLowerCase()==='present')streak++;else break;}
  return <div className="sp-community">
    {view==='Missing Work'&&panel('Things I need to complete',pending.length?pending.map(x=><div className="sp-line" key={x.id}><span className="sp-tag">{x.days<0?'Missing':x.days===0?'Due today':'Upcoming'}</span><div><strong>{x.title}</strong><small>{x.subjectName} · {day(x.dueDate)}</small></div></div>):empty('All assigned work is submitted.'))}
    {view==='Smart Alerts'&&panel('Student alerts',alerts.length?alerts.map(x=><div className="sp-line" key={x.key}><span className="sp-dot"/><div><strong>{x.text}</strong><small>Open {x.target} for details.</small></div></div>):empty('No alerts right now.'))}
    {view==='Daily Checklist'&&panel('Today\'s school checklist',<>{todayClasses.map((x,i)=><div className="sp-line" key={'c'+i}><span className="sp-tag">Class</span><strong>{x.subjectName}</strong><small>{String(x.startTime).slice(0,5)}</small></div>)}{pending.filter(x=>x.days===0).map(x=><div className="sp-line" key={'h'+x.id}><span className="sp-tag">Homework</span><strong>{x.title}</strong><small>Due today</small></div>)}{diaryToday.map(x=><div className="sp-line" key={'d'+x.id}><span className="sp-tag">Diary</span><strong>{x.topic}</strong></div>)}{data.schoolEvents.filter(x=>day(x.eventDate)===today()).map(x=><div className="sp-line" key={'e'+x.id}><span className="sp-tag">Event</span><strong>{x.title}</strong></div>)}{!todayClasses.length&&!pending.some(x=>x.days===0)&&!diaryToday.length&&!data.schoolEvents.some(x=>day(x.eventDate)===today())&&empty('No school tasks scheduled today.')}</>)}
    {view==='Revision Plan'&&panel('Exam revision plan',nextExam?<><p><strong>{nextExam.examName} · {nextExam.subjectName}</strong> — {Math.max(0,daysUntil(nextExam.examDate))} days remaining</p>{syllabus.length?syllabus.map((topic,i)=><div className="sp-line" key={i}><span className="sp-line-date">Day {i+1}</span><strong>{topic}</strong></div>):empty('Teacher has not published a chapter-wise syllabus yet.')}<small>This is a suggested order; adjust it to your own study time.</small></>:empty('No upcoming exam to plan.'))}
    {view==='Progress Details'&&<>{panel('Learning snapshot',<div className="sp-stats sp-stats-three"><div><small>Homework completed</small><strong>{data.homework.length?Math.round(completed*100/data.homework.length)+'%':'—'}</strong></div><div><small>Result average</small><strong>{average===null?'—':average+'%'}</strong></div><div><small>Attendance</small><strong>{attendance===null?'—':attendance+'%'}</strong></div></div>)}{panel('Personal milestones',<div className="sp-stats sp-stats-three"><div><small>Current attendance streak</small><strong>{streak} days</strong></div><div><small>Assignments completed</small><strong>{completed}</strong></div><div><small>Feedback received</small><strong>{graded.length}</strong></div></div>)}</>}
  </div>;
}

