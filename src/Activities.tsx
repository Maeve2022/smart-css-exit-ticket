import { useMemo, useState } from "react";

const DOC_URL = "https://docs.google.com/document/d/1DW_jDML8HQ7AT-oD7OVjFZah5eC7ROKmIwLVQ0NxyaY/edit?usp=sharing";
const steps = [
  "Prepare the work area and tools.",
  "Use appropriate PPE.",
  "Shut down and unplug the computer.",
  "Open the case carefully.",
  "Remove dust safely.",
  "Inspect components and connections.",
  "Close and secure the case.",
  "Test and verify the computer’s operation."
];
const shuffledSteps = [
  "Open the case carefully.", "Remove dust safely.", "Prepare the work area and tools.",
  "Close and secure the case.", "Shut down and unplug the computer.",
  "Use appropriate PPE.", "Inspect components and connections.", "Test and verify the computer’s operation."
];
const components = ["CPU fan", "RAM", "Storage (HDD/SSD)", "Cables and connections", "Other component"];
const quiz = [
  ["What should you do before opening or cleaning a computer?", ["Leave it running","Shut it down and unplug it","Spray it with water","Remove RAM immediately"],1],
  ["Which item helps prevent electrostatic discharge (ESD)?", ["Metal ruler","Anti-static wrist strap","Wet cloth","Paper clip"],1],
  ["Which practice is safe when removing dust?", ["Spray liquid inside","Use a soft brush or appropriate air blower","Force the fan to spin","Pull cables sharply"],1],
  ["Why should the work area be clean, dry, and organized?", ["To make the computer heavier","To prevent hazards and support safe work","To increase dust","To avoid inspection"],1],
  ["What should you do if you see a damaged power cable?", ["Touch it","Continue working","Stop and report it","Cover it with paper"],2],
  ["Which is an example of software maintenance?", ["Updating the operating system","Hitting the case","Pouring liquid on the keyboard","Forcing a connector"],0],
  ["What is the purpose of backing up important files?", ["Increase dust","Prevent data loss","Damage storage","Remove the OS"],1],
  ["How should computer components be handled?", ["Pull wires","Use excessive force","Gently and by their edges","With wet hands"],2],
  ["What should be checked during component inspection?", ["Dust, damage, and loose connections","Wallpaper only","Desk color","Internet history"],0],
  ["What should be done after cleaning and inspection?", ["Leave the case open","Secure parts, close the case, and test operation","Spray liquid inside","Leave tools inside"],1]
];
type Inspection = { condition: string; finding: string; action: string };
const emptyInspection = Object.fromEntries(components.map(c => [c,{condition:"Good",finding:"",action:""}])) as Record<string,Inspection>;

function ActivitiesStudent() {
  const [tab,setTab] = useState("sequence");
  const [learner,setLearner] = useState({group:"",members:"",grade:"Grade 10",section:"",date:new Date().toISOString().slice(0,10),unit:"Desktop computer"});
  const [orders,setOrders] = useState<number[]>(Array(8).fill(0));
  const [checks,setChecks] = useState<boolean[]>(Array(8).fill(false));
  const [roles,setRoles] = useState({technician:"",recorder:""});
  const [inspection,setInspection] = useState<Record<string,Inspection>>(emptyInspection);
  const [report,setReport] = useState({procedures:"",findings:"",recommendations:"",maintenanceBenefit:"",additionalPractice:""});
  const [literacy,setLiteracy] = useState({summary:"",hazard:"",precaution:"",maintenance:""});
  const [quizAnswers,setQuizAnswers] = useState<number[]>(Array(10).fill(-1));
  const [reflection,setReflection] = useState(["","",""]);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const affected = Object.values(inspection).filter(x => x.condition !== "Good").length;
  const inspected = Object.values(inspection).filter(x => x.condition !== "Not inspected").length;
  const percentage = inspected ? (affected/inspected)*100 : 0;
  const expectedSequence = [4,5,1,7,3,2,6,8];
  const sequenceScore = orders.filter((v,i)=>v===expectedSequence[i]).length;
  const quizScore = quiz.reduce((sum,q,i)=>sum+(quizAnswers[i]===q[2]?1:0),0);
  const ready = learner.group.trim() && learner.members.trim() && learner.section.trim();
  function updateInspection(name:string,key:keyof Inspection,value:string) {
    setInspection(old=>({...old,[name]:{...old[name],[key]:value}}));
  }
  async function submit() {
    if(!ready) { setMessage("Please complete the group name, members, grade, and section first."); return; }
    if(!checks.every(Boolean)) { setMessage("Complete all eight checklist steps before submitting the performance report."); return; }
    setBusy(true); setMessage("");
    const payload = {activity:"Computer Maintenance Performance Task",learner,roles,sequence:{answers:orders,score:sequenceScore},checklist:steps.map((step,i)=>({step,completed:checks[i]})),inspection, numeracy:{affected,inspected,percentage:Number(percentage.toFixed(2))},literacy,report,reflection,quiz:{answers:quizAnswers,score:quizScore,total:10},googleDocTemplate:DOC_URL};
    try {
      const res = await fetch("/api/activities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || "Unable to submit your activity.");
      setMessage("Your Computer Maintenance Report and activity responses have been submitted successfully. Give your teacher your group name.");
    } catch(e) { setMessage(e instanceof Error?e.message:"Submission failed."); }
    finally { setBusy(false); }
  }
  return <main className="activity-shell">
    <style>{`
      .activity-shell{min-height:100vh;background:linear-gradient(145deg,#071b49,#0d4d9b);padding:22px 14px 55px;color:#17243b;font-family:Inter,system-ui,sans-serif}
      .activity-wrap{max-width:1180px;margin:auto}.activity-head{background:linear-gradient(110deg,#08265e,#1265bd);color:white;border:1px solid #368ce8;border-radius:20px;padding:24px;display:flex;justify-content:space-between;gap:20px;align-items:center;box-shadow:0 12px 32px #001b4b66}
      .activity-head h1{font-size:clamp(25px,4vw,38px);margin:4px 0}.activity-head p{color:#d5e8ff;margin:5px 0}.activity-eyebrow{font-size:10px;letter-spacing:1.4px;font-weight:900;color:#ffdc40}
      .activity-head a,.doc-link{color:#08285e;background:#ffdc40;padding:11px 15px;border-radius:10px;font-weight:900;text-decoration:none;display:inline-block;font-size:12px}
      .activity-tabs{display:flex;gap:8px;overflow:auto;padding:16px 0}.activity-tabs button{white-space:nowrap;border:1px solid #8cb8e8;background:#ffffff;color:#17477d;padding:10px 13px;border-radius:10px;font-size:12px;font-weight:850}.activity-tabs button.active{background:#ffdc40;color:#09285e;border-color:#ffdc40}
      .activity-panel{background:#fff;border:1px solid #dce8f7;border-radius:17px;padding:clamp(16px,3vw,26px);box-shadow:0 8px 24px #001b4b22;margin-bottom:16px}
      .activity-panel h2{color:#12356b;margin:0 0 8px;font-size:21px}.activity-panel h3{color:#12356b;font-size:15px;margin:20px 0 9px}.activity-muted{font-size:12px;color:#64758d;line-height:1.6}
      .activity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.activity-field{display:flex;flex-direction:column;gap:6px}.activity-field.full{grid-column:1/-1}.activity-field label{font-size:12px;font-weight:800;color:#344764}.activity-field input,.activity-field select,.activity-field textarea,.sequence-row select{border:1px solid #d6e1ef;border-radius:9px;padding:10px;background:#fff;font:inherit;color:#1b2e4b;width:100%}
      .activity-field textarea{min-height:78px;resize:vertical}.sequence-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sequence-row{display:grid;grid-template-columns:34px 1fr 95px;gap:9px;align-items:center;border:1px solid #dce7f5;padding:10px;border-radius:11px;background:#f8fbff;font-size:12px;font-weight:700}.sequence-row b{background:#1456a5;color:#fff;border-radius:8px;width:28px;height:28px;display:grid;place-items:center}
      .activity-checks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.activity-check{border:1px solid #d9e5f4;border-radius:10px;padding:12px;background:#f8fbff;font-size:12px;font-weight:750;display:flex;gap:8px;align-items:flex-start}.activity-check input{accent-color:#1556a5;margin-top:2px}
      .activity-table{width:100%;border-collapse:collapse;font-size:12px}.activity-table th,.activity-table td{padding:9px;border:1px solid #dce5f1;text-align:left}.activity-table th{background:#eaf3ff;color:#173c70}.activity-table input,.activity-table select{width:100%;min-width:100px;padding:8px;border:1px solid #d5dfec;border-radius:7px}
      .activity-stat{background:#eff6ff;border:1px solid #d6e7fb;border-radius:12px;padding:15px;color:#17477d}.activity-stat strong{font-size:24px;display:block}.activity-button{border:0;border-radius:10px;padding:13px 18px;background:#1456a5;color:white;font-weight:900;cursor:pointer}.activity-button:disabled{opacity:.55}.activity-message{padding:12px;border-radius:10px;background:#e8f6ee;color:#17623d;font-size:13px;margin:12px 0}.quiz-item{padding:14px 0;border-top:1px solid #e7edf5}.quiz-item strong{display:block;margin-bottom:9px;color:#203c66}.quiz-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.quiz-options label{background:#f5f8fc;border:1px solid #dce6f3;border-radius:8px;padding:9px;font-size:12px;display:flex;gap:7px}.activity-footer{text-align:center;color:#c6dcf6;font-size:11px;padding:20px}
      @media(max-width:700px){.activity-head{display:block}.activity-head a{margin-top:10px}.sequence-list{grid-template-columns:1fr}.activity-checks{grid-template-columns:repeat(2,minmax(0,1fr))}.activity-grid{grid-template-columns:1fr}.activity-field.full{grid-column:auto}.activity-table{min-width:700px}.activity-panel{overflow-x:auto}.quiz-options{grid-template-columns:1fr}}
    `}</style>
    <div className="activity-wrap">
      <header className="activity-head"><div><div className="activity-eyebrow">GRADE 10 • COMPUTER SYSTEMS SERVICING</div><h1>Computer Maintenance with Safety</h1><p>Interactive activities • Collaborative performance • Computer Maintenance Report</p></div><a href={DOC_URL} target="_blank" rel="noreferrer">Open Google Docs Report Template ↗</a></header>
      <nav className="activity-tabs">{[["sequence","Arrange the Steps"],["checklist","Picture-Cue Checklist"],["performance","Performance Report"],["literacy","Literacy"],["numeracy","Numeracy"],["extension","Extension"],["reflection","Reflection"],["quiz","10-Item Quiz"]].map(([id,label])=><button className={tab===id?"active":""} key={id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
      <section className="activity-panel">
        <h2>Group and Learner Information</h2><p className="activity-muted">Complete these details before submitting your group's work.</p>
        <div className="activity-grid">
          <div className="activity-field"><label>Group name</label><input value={learner.group} onChange={e=>setLearner({...learner,group:e.target.value})} placeholder="e.g. Group 1"/></div>
          <div className="activity-field"><label>Grade level</label><select value={learner.grade} onChange={e=>setLearner({...learner,grade:e.target.value})}>{["Grade 9","Grade 10"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="activity-field"><label>Section</label><input value={learner.section} onChange={e=>setLearner({...learner,section:e.target.value})} placeholder="Enter section"/></div>
          <div className="activity-field"><label>Date</label><input type="date" value={learner.date} onChange={e=>setLearner({...learner,date:e.target.value})}/></div>
          <div className="activity-field full"><label>Group members (separate names with commas)</label><input value={learner.members} onChange={e=>setLearner({...learner,members:e.target.value})} placeholder="Names of all group members"/></div>
        </div>
      </section>
      {tab==="sequence"&&<section className="activity-panel"><h2>Activity 1 • Arrange the Steps!</h2><p className="activity-muted">The eight steps are jumbled. Select the correct order from 1 to 8. Use each number only once.</p><div className="sequence-list">{shuffledSteps.map((s,i)=><div className="sequence-row" key={s}><b>{i+1}</b><span>{s}</span><select value={orders[i]} onChange={e=>setOrders(old=>old.map((v,j)=>j===i?Number(e.target.value):v))}><option value={0}>Order</option>{Array.from({length:8},(_,n)=><option key={n} value={n+1}>{n+1}</option>)}</select></div>)}</div><div className="activity-stat" style={{marginTop:14}}>Sequence score<strong>{sequenceScore} / 8 correct positions</strong></div></section>}
      {tab==="checklist"&&<section className="activity-panel"><h2>Activity 2 • Picture-Cue Checklist</h2><p className="activity-muted">Work in pairs with teacher/buddy guidance. The Navigator reads each step aloud while the Partner performs the task. Check each step after it is completed safely.</p><div className="activity-checks">{steps.map((s,i)=><label className="activity-check" key={s}><input type="checkbox" checked={checks[i]} onChange={e=>setChecks(old=>old.map((v,j)=>j===i?e.target.checked:v))}/><span><b>Step {i+1}</b><br/>{s}</span></label>)}</div><p className="activity-muted">{checks.filter(Boolean).length} of 8 steps completed. Identify at least three safety precautions in the report.</p></section>}
      {tab==="performance"&&<section className="activity-panel"><h2>Activity 3 • CORE Collaborative Performance</h2><p className="activity-muted">Work in pairs. One learner performs the maintenance procedure as Technician; the partner monitors safety and records findings as Recorder. Switch roles when instructed.</p>
        <div className="activity-grid"><div className="activity-field"><label>Technician</label><input value={roles.technician} onChange={e=>setRoles({...roles,technician:e.target.value})} placeholder="Learner's name"/></div><div className="activity-field"><label>Recorder</label><input value={roles.recorder} onChange={e=>setRoles({...roles,recorder:e.target.value})} placeholder="Learner's name"/></div></div>
        <h3>Inspection and Maintenance Record</h3><p className="activity-muted">Inspect the fan, RAM, storage, cables, and other components for dust, damage, or loose connections.</p>
        <div style={{overflowX:"auto"}}><table className="activity-table"><thead><tr><th>Component</th><th>Condition</th><th>Findings / Observations</th><th>Recommended Maintenance Action</th></tr></thead><tbody>{components.map(c=><tr key={c}><td>{c}</td><td><select value={inspection[c].condition} onChange={e=>updateInspection(c,"condition",e.target.value)}>{["Good","With Dust","Damaged","Loose","Not inspected"].map(x=><option key={x}>{x}</option>)}</select></td><td><input value={inspection[c].finding} onChange={e=>updateInspection(c,"finding",e.target.value)} placeholder="What did you observe?"/></td><td><input value={inspection[c].action} onChange={e=>updateInspection(c,"action",e.target.value)} placeholder="What action is recommended?"/></td></tr>)}</tbody></table></div>
        <h3>Computer Maintenance Report</h3><div className="activity-grid">
          <div className="activity-field full"><label>Procedures performed (describe the 8 steps)</label><textarea value={report.procedures} onChange={e=>setReport({...report,procedures:e.target.value})} placeholder="Describe what your group performed..."/></div>
          <div className="activity-field full"><label>Inspection findings and observations</label><textarea value={report.findings} onChange={e=>setReport({...report,findings:e.target.value})} placeholder="Record actual conditions observed..."/></div>
          <div className="activity-field full"><label>Recommended maintenance actions</label><textarea value={report.recommendations} onChange={e=>setReport({...report,recommendations:e.target.value})} placeholder="List appropriate actions based on findings..."/></div>
          <div className="activity-field full"><label>At least three safety precautions observed</label><textarea value={literacy.precaution} onChange={e=>setLiteracy({...literacy,precaution:e.target.value})} placeholder="1. ... 2. ... 3. ..."/></div>
        </div>
        <p className="activity-muted">Expected output: an accomplished maintenance and inspection report with recorded findings, recommendations, and evidence of safe procedures. Use the Google Docs template link above as a report reference.</p>
      </section>}
      {tab==="literacy"&&<section className="activity-panel"><h2>Activity 4 • Literacy Integration</h2><p className="activity-muted">Read the numbered maintenance procedure aloud in sequence. Identify action words (verbs) and technical terms (vocabulary) in the checklist.</p><div className="activity-grid"><div className="activity-field full"><label>Summarize one maintenance procedure in your own words (2–3 sentences)</label><textarea value={literacy.summary} onChange={e=>setLiteracy({...literacy,summary:e.target.value})}/></div><div className="activity-field"><label>Action words identified</label><input value={literacy.hazard} onChange={e=>setLiteracy({...literacy,hazard:e.target.value})} placeholder="e.g. shut down, unplug, inspect"/></div><div className="activity-field"><label>Technical terms identified</label><input value={literacy.maintenance} onChange={e=>setLiteracy({...literacy,maintenance:e.target.value})} placeholder="e.g. PPE, ESD, component"/></div></div><h3>Vocabulary reference</h3><p className="activity-muted"><b>Action words:</b> shut down, unplug, inspect, clean, secure, test.</p><p className="activity-muted"><b>Technical terms:</b> maintenance, PPE (Personal Protective Equipment), ESD (Electrostatic Discharge), component, heatsink, power cord.</p></section>}
      {tab==="numeracy"&&<section className="activity-panel"><h2>Activity 5 • Numeracy Integration</h2><p className="activity-muted">Use your inspection record to count and tally findings, compare totals, and identify which issue occurs most often.</p><div className="activity-grid"><div className="activity-stat">Affected components<strong>{affected}</strong></div><div className="activity-stat">Components inspected<strong>{inspected}</strong></div><div className="activity-stat">Percentage affected<strong>{percentage.toFixed(2)}%</strong></div><div className="activity-stat">No issue / Good<strong>{Object.values(inspection).filter(x=>x.condition==="Good").length}</strong></div></div><h3>Formula</h3><p><b>Percentage of affected components = (Number of affected components ÷ Total components inspected) × 100</b></p><p className="activity-muted">The percentage is calculated from the inspection table in the Performance Report tab. Mark each component's condition accurately.</p></section>}
      {tab==="extension"&&<section className="activity-panel"><h2>Activity 6 • EXTENSION: Application and Analysis</h2><p className="activity-muted">Perform the complete computer maintenance routine independently as a pair. Prepare a short report documenting the procedures performed, inspection findings, and recommended actions.</p><div className="activity-grid"><div className="activity-field full"><label>How does regular maintenance contribute to computer reliability, safety, and longer equipment lifespan?</label><textarea value={report.maintenanceBenefit} onChange={e=>setReport({...report,maintenanceBenefit:e.target.value})}/></div><div className="activity-field full"><label>Identify one additional preventive maintenance practice (hardware or software) and explain how it helps protect the computer.</label><textarea value={report.additionalPractice} onChange={e=>setReport({...report,additionalPractice:e.target.value})}/></div></div><p className="activity-muted">Extension challenge: Research why Disk Defragmenter should NOT be used on an SSD and prepare one sentence to share with the class.</p></section>}
      {tab==="reflection"&&<section className="activity-panel"><h2>Activity 7 • Reflection</h2>{["What did I learn about computer maintenance and safety today?","Which safety practices do I think are most important? Why?","How can I apply these safe maintenance practices at home, school, or in our community?"].map((q,i)=><div className="activity-field" style={{marginTop:14}} key={q}><label>{i+1}. {q}</label><textarea value={reflection[i]} onChange={e=>setReflection(old=>old.map((v,j)=>j===i?e.target.value:v))}/></div>)}</section>}
      {tab==="quiz"&&<section className="activity-panel"><h2>Activity 8 • Formative Assessment</h2><p className="activity-muted">Multiple choice. Select the best answer for each question.</p>{quiz.map((q,i)=><div className="quiz-item" key={i}><strong>{i+1}. {q[0]}</strong><div className="quiz-options">{(q[1] as string[]).map((option,j)=><label key={j}><input type="radio" name={`quiz-${i}`} checked={quizAnswers[i]===j} onChange={()=>setQuizAnswers(old=>old.map((v,k)=>k===i?j:v))}/>{String.fromCharCode(65+j)}. {option}</label>)}</div></div>)}<div className="activity-stat">Current quiz score<strong>{quizScore} / 10</strong><span className="activity-muted">For practice only. Teacher review and feedback remain important.</span></div></section>}
      <section className="activity-panel"><h2>Submit Group Performance Task</h2><p className="activity-muted">Complete the group information and all eight checklist steps. Your report and activity responses will be saved for teacher review.</p>{message&&<div className="activity-message" role="status">{message}</div>}<button className="activity-button" disabled={busy} onClick={submit}>{busy?"Submitting...":"Submit Computer Maintenance Report"}</button> <a className="doc-link" href={DOC_URL} target="_blank" rel="noreferrer">Open Google Docs Template</a></section>
      <footer className="activity-footer">Smart CSS Activities • Computer Maintenance with Safety</footer>
    </div>
  </main>;
}


function ActivityReports() {
  const [key,setKey] = useState("");
  const [rows,setRows] = useState<any[]>([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  async function load(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/activities",{headers:{"x-teacher-key":key}});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || "Unable to load reports.");
      setRows(data.submissions || []);
      sessionStorage.setItem("css_teacher_key",key);
    } catch(err) { setError(err instanceof Error?err.message:"Unable to load reports."); }
    finally { setLoading(false); }
  }
  return <main style={{minHeight:"100vh",background:"#edf3fb",padding:24,fontFamily:"Inter,system-ui,sans-serif",color:"#17243b"}}>
    <div style={{maxWidth:1100,margin:"auto"}}>
      <h1 style={{color:"#12356b"}}>Computer Maintenance Activity Reports</h1>
      <p>Teacher-only view of group performance submissions.</p>
      <form onSubmit={load} style={{display:"flex",gap:8,maxWidth:520,margin:"18px 0"}}>
        <input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Teacher access key" required style={{flex:1,padding:12,border:"1px solid #cbd8e8",borderRadius:8}}/>
        <button disabled={loading} style={{padding:"12px 18px",background:"#1456a5",color:"white",border:0,borderRadius:8,fontWeight:800}}>{loading?"Loading...":"View Reports"}</button>
      </form>
      {error&&<p style={{color:"#a52d2d"}}>{error}</p>}
      {rows.map(row=><article key={row.id} style={{background:"white",border:"1px solid #dce6f3",borderRadius:12,padding:18,margin:"14px 0"}}>
        <h2 style={{margin:"0 0 6px",color:"#12356b"}}>{row.groupName} — {row.grade} / {row.section}</h2>
        <small>{new Date(row.createdAt).toLocaleString()}</small>
        <p><b>Members:</b> {row.payload?.learner?.members || "—"} · <b>Technician:</b> {row.payload?.roles?.technician || "—"} · <b>Recorder:</b> {row.payload?.roles?.recorder || "—"}</p>
        <p><b>Sequence:</b> {row.payload?.sequence?.score ?? 0}/8 · <b>Quiz:</b> {row.payload?.quiz?.score ?? 0}/10 · <b>Inspection affected:</b> {row.payload?.numeracy?.percentage ?? 0}%</p>
        <details><summary style={{cursor:"pointer",fontWeight:800}}>View full submitted report</summary>
          <h3>Inspection findings</h3>
          <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:13}}>{JSON.stringify(row.payload?.inspection || {},null,2)}</pre>
          <h3>Procedures and recommendations</h3>
          <p>{row.payload?.report?.procedures || "No procedure notes submitted."}</p>
          <p>{row.payload?.report?.findings || "No findings submitted."}</p>
          <p>{row.payload?.report?.recommendations || "No recommendations submitted."}</p>
          <h3>Reflections</h3>
          {(row.payload?.reflection || []).map((v:string,i:number)=><p key={i}>{i+1}. {v || "—"}</p>)}
          <a href={row.payload?.googleDocTemplate || "https://docs.google.com"} target="_blank" rel="noreferrer">Open Google Docs report template ↗</a>
        </details>
      </article>)}
      {!rows.length&&!error&&<p style={{color:"#60738e"}}>Authenticate with your teacher access key to load group reports.</p>}
      <p><a href="/teacher">Return to main teacher dashboard</a></p>
    </div>
  </main>;
}

export default function Activities() {
  return window.location.pathname.replace(/\\/+$/, "") === "/activity-reports" ? <ActivityReports/> : <ActivitiesStudent/>;
}
