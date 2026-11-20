import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Activities from "./Activities";
import FormativeAssessment from "./FormativeAssessment";

type Answers = { q1: string; q2: string; q3: string; q4: string; q5: string; literacy: string };
type Reflection = { g1: string; g2: string; g3: string };
type Scores = { q1: number; q2: number; q3: number; q4: number; q5: number; literacy: number; total: number };
type RecordItem = {
  id: number; name: string; grade: string; section: string; answers: Answers;
  reflection: Reflection; scores: Scores; totalScore: number; createdAt: string;
};
const emptyAnswers: Answers = { q1: "", q2: "", q3: "", q4: "", q5: "", literacy: "" };
const emptyReflection: Reflection = { g1: "", g2: "", g3: "" };

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
const hasAny = (s: string, terms: string[]) => terms.some(t => normalize(s).includes(t));
const countGroups = (s: string, groups: string[][]) => groups.filter(g => hasAny(s, g)).length;

function scoreAnswers(a: Answers): Scores {
  const q1 = countGroups(a.q1, [
    ["shut down", "power off", "turn off", "switch off", "unplug", "disconnect"],
    ["ppe", "wrist strap", "anti-static", "antistatic", "gloves", "goggles", "safety glasses"],
    ["dry work area", "clean work area", "correct tools", "proper tools", "no liquids", "avoid liquids", "no water", "organized work area"]
  ]);
  const q2 = Number(hasAny(a.q2, ["shut down", "power off", "turn off", "switch off"])) +
             Number(hasAny(a.q2, ["unplug", "disconnect", "remove the power cable"]));
  const toolCount = countGroups(a.q3, [
    ["soft brush", "brush"], ["air blower", "blower", "compressed air"],
    ["screwdriver"], ["anti-static wrist strap", "wrist strap"], ["gloves"],
    ["goggles", "safety glasses"], ["esd mat", "anti-static mat"]
  ]);
  const purpose = hasAny(a.q3, ["clean", "remove dust", "protect", "prevent", "ground", "open", "loosen", "safety"]);
  const q3 = toolCount >= 2 && purpose ? 2 : toolCount >= 1 ? 1 : 0;
  const q4 = Number(hasAny(a.q4, ["fan", "ram", "storage", "cable", "connection", "motherboard", "component"]));
  const q5 = Number(hasAny(a.q5, ["update", "antivirus", "anti-virus", "backup", "back up", "security scan", "remove unwanted programs"]));
  const sentenceCount = a.literacy.trim().split(/[.!?]+/).filter(x => x.trim().length > 0).length;
  const literacy = Number(sentenceCount >= 2 && sentenceCount <= 3 &&
    hasAny(a.literacy, ["hazard"]) && hasAny(a.literacy, ["safety precaution"]) && hasAny(a.literacy, ["maintenance"]));
  return { q1, q2, q3, q4, q5, literacy, total: q1 + q2 + q3 + q4 + q5 + literacy };
}

function TeacherDashboard() {
  const [accessKey, setAccessKey] = useState(sessionStorage.getItem("css_teacher_key") || "");
  const [keyInput, setKeyInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("Grade 10");
  const [section, setSection] = useState("");
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [reflection, setReflection] = useState<Reflection>(emptyReflection);
  const [gradeFilter, setGradeFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [printRecord, setPrintRecord] = useState<RecordItem | null>(null);
  const scores = useMemo(() => scoreAnswers(answers), [answers]);

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", "x-teacher-key": accessKey, ...(init.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function loadRecords(key = accessKey) {
    const oldKey = accessKey;
    if (key !== oldKey) setAccessKey(key);
    const response = await fetch("/api/records", { headers: { "x-teacher-key": key } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load records.");
    setRecords(data.records || []);
    setAuthenticated(true);
    sessionStorage.setItem("css_teacher_key", key);
  }

  useEffect(() => {
    if (accessKey) loadRecords(accessKey).catch(() => {
      setAuthenticated(false);
      sessionStorage.removeItem("css_teacher_key");
    });
    // Initial session restoration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try { await loadRecords(keyInput); setMessage("Teacher access verified."); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Login failed."); }
    finally { setBusy(false); }
  }

  function updateAnswer(key: keyof Answers, value: string) {
    setAnswers(old => ({ ...old, [key]: value }));
  }
  function updateReflection(key: keyof Reflection, value: string) {
    setReflection(old => ({ ...old, [key]: value }));
  }

  async function saveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !section.trim() || Object.values(answers).some(v => !v.trim())) {
      setMessage("Complete learner information and all exit-ticket responses before saving."); return;
    }
    setBusy(true); setMessage("");
    try {
      const data = await api("/api/records", {
        method: "POST",
        body: JSON.stringify({ name, grade, section, answers, reflection, scores })
      });
      setRecords(old => [data.record, ...old]);
      setMessage("Learner result saved to the database.");
      setName(""); setSection(""); setAnswers(emptyAnswers); setReflection(emptyReflection);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to save record."); }
    finally { setBusy(false); }
  }

  async function deleteRecord(id: number) {
    if (!window.confirm("Delete this learner record permanently?")) return;
    try {
      await api(`/api/records?id=${id}`, { method: "DELETE" });
      setRecords(old => old.filter(r => r.id !== id));
      setMessage("Record deleted.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Delete failed."); }
  }

  function exportExcel() {
    const rows = filtered.map(r => ({
      "Learner Name": r.name, "Grade": r.grade, "Section": r.section,
      "Q1 Safety": r.scores.q1, "Q2 Shutdown/Unplug": r.scores.q2,
      "Q3 Tools/PPE": r.scores.q3, "Q4 Inspection": r.scores.q4,
      "Q5 Software": r.scores.q5, "Literacy": r.scores.literacy,
      "Total / 10": r.totalScore, "Percentage": `${r.totalScore * 10}%`,
      "Date": new Date(r.createdAt).toLocaleString(),
      "Q1 Response": r.answers.q1, "Q2 Response": r.answers.q2,
      "Q3 Response": r.answers.q3, "Q4 Response": r.answers.q4,
      "Q5 Response": r.answers.q5, "Literacy Response": r.answers.literacy,
      "Generalization 1": r.reflection?.g1 || "", "Generalization 2": r.reflection?.g2 || "",
      "Generalization 3": r.reflection?.g3 || ""
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exit Ticket Results");
    XLSX.writeFile(wb, "CSS_Exit_Ticket_Results.xlsx");
  }

  function printLearner(r: RecordItem) {
    setPrintRecord(r);
    window.setTimeout(() => window.print(), 150);
  }

  const sections = Array.from(new Set(records.map(r => r.section))).sort();
  const filtered = records.filter(r =>
    (gradeFilter === "All" || r.grade === gradeFilter) &&
    (sectionFilter === "All" || r.section === sectionFilter) &&
    `${r.name} ${r.section}`.toLowerCase().includes(search.toLowerCase())
  );
  const average = filtered.length ? filtered.reduce((sum, r) => sum + r.totalScore, 0) / filtered.length : 0;

  if (!authenticated) return (
    <main className="login-shell">
      <form className="login-card" onSubmit={login}>
        <div className="brand-mark">CSS</div>
        <p className="eyebrow">GRADE 10 • COMPUTER SYSTEMS SERVICING</p>
        <h1>Smart CSS Exit Ticket</h1>
        <p className="muted">Teacher access is required to record and view learner results.</p>
        <label>Teacher access key</label>
        <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="Enter your teacher access key" required />
        <button disabled={busy}>{busy ? "Checking..." : "Access Teacher Dashboard"}</button>
        {message && <p className="notice">{message}</p>}
        <p className="tiny">The access key is stored only for this browser session.</p>
      </form>
    </main>
  );

  return (
    <div className="app-shell">
      <header className="topbar no-print">
        <div><span className="brand-mark small">CSS</span><div><strong>Smart CSS Exit Ticket</strong><small>Computer Maintenance with Safety</small></div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><a className="button ghost" href="/activities" style={{textDecoration:"none"}}>Student Activities ↗</a><a className="button ghost" href="/activity-reports" style={{textDecoration:"none"}}>Group Reports ↗</a><button className="button ghost" onClick={() => { sessionStorage.removeItem("css_teacher_key"); setAuthenticated(false); setAccessKey(""); }}>Log out</button></div>
      </header>

      <main className="container">
        <section className="hero no-print">
          <div><p className="eyebrow">TEACHER ASSESSMENT DASHBOARD</p><h1>Exit Ticket & Auto-Scoring</h1><p>Record learner responses, review results, and export class records.</p></div>
          <div className="hero-chip">10-POINT<br/><b>ASSESSMENT</b></div>
        </section>

        {message && <div className="notice no-print">{message}</div>}

        <section className="stats-grid no-print">
          <div className="stat-card"><span>Total records</span><b>{records.length}</b></div>
          <div className="stat-card"><span>Filtered learners</span><b>{filtered.length}</b></div>
          <div className="stat-card"><span>Class average</span><b>{average.toFixed(2)} / 10</b></div>
        </section>

        <div className="layout-grid no-print">
          <section className="panel form-panel">
            <div className="section-heading"><div><p className="eyebrow">NEW LEARNER</p><h2>Individual Exit Ticket</h2></div><span className="pill">Auto-scored</span></div>
            <form onSubmit={saveRecord}>
              <div className="form-grid">
                <div className="field full"><label>Complete learner name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Surname, First Name, Middle Initial" required /></div>
                <div className="field"><label>Grade level</label><select value={grade} onChange={e => setGrade(e.target.value)}>{["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"].map(x => <option key={x}>{x}</option>)}</select></div>
                <div className="field"><label>Section</label><input value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. Courage" required /></div>
              </div>
              <Question n="1" title="Safety precautions" points="3 points" prompt="Give at least three safety precautions to observe before and during computer maintenance." value={answers.q1} onChange={v => updateAnswer("q1",v)} />
              <Question n="2" title="Understanding safety" points="2 points" prompt="Why must a computer be shut down and unplugged before cleaning or opening it?" value={answers.q2} onChange={v => updateAnswer("q2",v)} />
              <Question n="3" title="Tools and PPE" points="2 points" prompt="Name two tools or protective equipment used in computer maintenance and state their purpose." value={answers.q3} onChange={v => updateAnswer("q3",v)} />
              <Question n="4" title="Component inspection" points="1 point" prompt="What should you inspect after cleaning the computer?" value={answers.q4} onChange={v => updateAnswer("q4",v)} />
              <Question n="5" title="Software maintenance" points="1 point" prompt="Give one software maintenance task that helps protect a computer." value={answers.q5} onChange={v => updateAnswer("q5",v)} />
              <Question n="L" title="Literacy check" points="1 point" prompt={'Write a 2–3 sentence maintenance recommendation using the terms “hazard,” “safety precaution,” and “maintenance.”'} value={answers.literacy} onChange={v => updateAnswer("literacy",v)} />
              <div className="reflection-box">
                <h3>Generalization • Optional reflection</h3>
                <p className="muted">These discussion responses are stored but are not included in the 10-point score.</p>
                <Question n="G1" title="Important steps" points="Reflection" prompt="What are the important steps in performing computer maintenance safely?" value={reflection.g1} onChange={v => updateReflection("g1",v)} compact />
                <Question n="G2" title="Personal application" points="Reflection" prompt="Which safety practice will you apply at home or in school?" value={reflection.g2} onChange={v => updateReflection("g2",v)} compact />
                <Question n="G3" title="Importance of maintenance" points="Reflection" prompt="How does regular maintenance help keep a computer reliable and long-lasting?" value={reflection.g3} onChange={v => updateReflection("g3",v)} compact />
              </div>
              <div className="score-preview">
                <div><span>Live score preview</span><strong>{scores.total}<small> / 10</small></strong></div>
                <div className="score-breakdown">{[["Q1",scores.q1,3],["Q2",scores.q2,2],["Q3",scores.q3,2],["Q4",scores.q4,1],["Q5",scores.q5,1],["Literacy",scores.literacy,1]].map(([label,value,max]) => <span key={label as string}>{label}: {value}/{max}</span>)}</div>
              </div>
              <button className="button primary wide" disabled={busy}>{busy ? "Saving..." : "Save Learner Result to Database"}</button>
            </form>
          </section>

          <aside className="panel guide-panel">
            <p className="eyebrow">SCORING GUIDE</p><h2>10-point rubric</h2>
            <ScoreGuide />
            <div className="warning-note"><strong>Teacher review required</strong><p>Auto-scoring checks keywords and basic criteria. Review written answers before finalizing official grades, especially valid answers using different wording.</p></div>
          </aside>
        </div>

        <section className="panel records-panel no-print">
          <div className="section-heading"><div><p className="eyebrow">DATABASE</p><h2>Class Records</h2></div><button className="button primary" onClick={exportExcel} disabled={!filtered.length}>Export Excel (.xlsx)</button></div>
          <div className="filters">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learner or section..." />
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}><option>All</option>{["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"].map(x=><option key={x}>{x}</option>)}</select>
            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}><option>All</option>{sections.map(x=><option key={x}>{x}</option>)}</select>
          </div>
          <div className="table-wrap">
            <table><thead><tr><th>Learner</th><th>Grade</th><th>Section</th><th>Score</th><th>Percentage</th><th>Date recorded</th><th>Actions</th></tr></thead>
              <tbody>{filtered.map(r=><tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.grade}</td><td>{r.section}</td><td><span className={`score-tag ${r.totalScore>=7?"good":"needs-review"}`}>{r.totalScore}/10</span></td><td>{r.totalScore*10}%</td><td>{new Date(r.createdAt).toLocaleDateString()}</td><td className="actions"><button className="text-button" onClick={()=>printLearner(r)}>Print</button><button className="text-button danger" onClick={()=>deleteRecord(r.id)}>Delete</button></td></tr>)}</tbody>
            </table>
            {!filtered.length && <p className="empty-state">No matching learner records.</p>}
          </div>
        </section>

        <section className="panel rubric-panel no-print">
          <details><summary>How automatic scoring works and its limitations</summary><p>Q1 awards one point for each safety category detected: power isolation, PPE/ESD, and safe work area/tools. Q2 checks shutdown and unplugging. Q3 checks for two recognized tools/PPE items and a stated purpose. Q4 checks for component inspection terms. Q5 checks for software maintenance terms. Literacy checks for 2–3 sentences containing the three required vocabulary terms.</p><p>Because this is keyword-based, a correct answer may be missed if it uses an unrecognized phrase. Review each response and adjust the official mark when needed.</p></details>
        </section>
      </main>

      {printRecord && <div className="print-report">
        <h1>Computer Maintenance with Safety</h1><h2>Individual Exit Ticket Report</h2>
        <p><b>Learner:</b> {printRecord.name}　 <b>Grade & Section:</b> {printRecord.grade} – {printRecord.section}</p>
        <p><b>Score:</b> {printRecord.totalScore}/10 ({printRecord.totalScore*10}%)　 <b>Date:</b> {new Date(printRecord.createdAt).toLocaleString()}</p>
        {([
          ["1. Safety precautions",printRecord.answers.q1,printRecord.scores.q1,3],
          ["2. Why shut down and unplug?",printRecord.answers.q2,printRecord.scores.q2,2],
          ["3. Tools and PPE",printRecord.answers.q3,printRecord.scores.q3,2],
          ["4. Component inspection",printRecord.answers.q4,printRecord.scores.q4,1],
          ["5. Software maintenance",printRecord.answers.q5,printRecord.scores.q5,1],
          ["Literacy check",printRecord.answers.literacy,printRecord.scores.literacy,1]
        ] as [string,string,number,number][]).map(([q,a,s,m])=><div className="print-answer" key={q}><b>{q} ({s}/{m})</b><p>{a}</p></div>)}
        <h3>Generalization reflections</h3><p><b>Important steps:</b> {printRecord.reflection?.g1 || "—"}</p><p><b>Personal application:</b> {printRecord.reflection?.g2 || "—"}</p><p><b>Importance of maintenance:</b> {printRecord.reflection?.g3 || "—"}</p>
        <p className="teacher-sign">Teacher's signature: ______________________________</p>
      </div>}
      <footer className="footer no-print">Smart CSS Exit Ticket • Teacher-managed learner assessment records</footer>
    </div>
  );
}


function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path === "/teacher" ? <TeacherDashboard /> : (path === "/activities" || path === "/activity-reports") ? <Activities /> : (path === "/formative-assessment" || path === "/formative-results") ? <FormativeAssessment /> : <StudentPortal />;
}

function StudentPortal() {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("Grade 10");
  const [section, setSection] = useState("");
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [reflection, setReflection] = useState<Reflection>(emptyReflection);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function updateAnswer(key: keyof Answers, value: string) {
    setAnswers(old => ({ ...old, [key]: value }));
  }
  function updateReflection(key: keyof Reflection, value: string) {
    setReflection(old => ({ ...old, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !section.trim() || Object.values(answers).some(v => !v.trim())) {
      setMessage("Please complete your name, grade, section, and all six response fields.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, grade, section, answers, reflection })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Submission failed (${response.status}).`);
      setSubmitted(true);
      setMessage("Your answers have been submitted successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to submit your answers. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return (
    <main className="student-shell">
      <section className="student-card success-card">
        <div className="brand-mark">CSS</div>
        <div className="success-icon">✓</div>
        <p className="eyebrow">GRADE 10 • COMPUTER SYSTEMS SERVICING</p>
        <h1>Submission Received!</h1>
        <p className="muted">Thank you, {name}. Your Smart CSS Exit Ticket has been submitted successfully.</p>
        <div className="notice success-notice">Your responses are now recorded. You may inform your teacher that you have completed the exit ticket.</div>
        <button className="button primary wide" onClick={() => {
          setName(""); setGrade("Grade 10"); setSection(""); setAnswers(emptyAnswers);
          setReflection(emptyReflection); setSubmitted(false); setMessage("");
        }}>Return to Student Form</button>
      </section>
    </main>
  );

  return (
    <main className="student-shell">
      <section className="student-card">
        <header className="student-header">
          <div className="brand-mark">CSS</div>
          <div>
            <p className="eyebrow">GRADE 10 • COMPUTER SYSTEMS SERVICING</p>
            <h1>Smart CSS Exit Ticket</h1>
            <p className="muted">Computer Maintenance with Safety</p>
          </div>
        </header>
        <div className="student-instructions">
          <strong>Instructions</strong>
          <p>Enter your information and answer each question independently. Check your responses before submitting. All six response fields are required. The three generalization questions are optional.</p>
        </div>
        {message && <div className="notice" role="alert">{message}</div>}
        <form onSubmit={submit}>
          <h2 className="student-section-title">Learner Information</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="learner-name">Complete learner name</label>
              <input id="learner-name" value={name} onChange={e => setName(e.target.value)} placeholder="Surname, First Name, Middle Initial" maxLength={150} required />
            </div>
            <div className="field">
              <label htmlFor="learner-grade">Grade level</label>
              <select id="learner-grade" value={grade} onChange={e => setGrade(e.target.value)}>
                {["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="learner-section">Section</label>
              <input id="learner-section" value={section} onChange={e => setSection(e.target.value)} placeholder="Enter your section" maxLength={100} required />
            </div>
          </div>

          <h2 className="student-section-title">Individual Exit Ticket <span>10 points</span></h2>
          <Question n="1" title="Safety precautions" points="3 points" prompt="Give at least three safety precautions to observe before and during computer maintenance." value={answers.q1} onChange={v => updateAnswer("q1",v)} />
          <Question n="2" title="Understanding safety" points="2 points" prompt="Why must a computer be shut down and unplugged before cleaning or opening it?" value={answers.q2} onChange={v => updateAnswer("q2",v)} />
          <Question n="3" title="Tools and PPE" points="2 points" prompt="Name two tools or protective equipment used in computer maintenance and state their purpose." value={answers.q3} onChange={v => updateAnswer("q3",v)} />
          <Question n="4" title="Component inspection" points="1 point" prompt="What should you inspect after cleaning the computer?" value={answers.q4} onChange={v => updateAnswer("q4",v)} />
          <Question n="5" title="Software maintenance" points="1 point" prompt="Give one software maintenance task that helps protect a computer." value={answers.q5} onChange={v => updateAnswer("q5",v)} />
          <Question n="L" title="Literacy check" points="1 point" prompt={'Write a 2–3 sentence maintenance recommendation using the terms “hazard,” “safety precaution,” and “maintenance.”'} value={answers.literacy} onChange={v => updateAnswer("literacy",v)} />
          <div className="reflection-box">
            <h3>Generalization • Optional reflection</h3>
            <p className="muted">These discussion responses are optional and are not included in the 10-point score.</p>
            <Question n="G1" title="Important steps" points="Optional" prompt="What are the important steps in performing computer maintenance safely?" value={reflection.g1} onChange={v => updateReflection("g1",v)} compact />
            <Question n="G2" title="Personal application" points="Optional" prompt="Which safety practice will you apply at home or in school?" value={reflection.g2} onChange={v => updateReflection("g2",v)} compact />
            <Question n="G3" title="Importance of maintenance" points="Optional" prompt="How does regular maintenance help keep a computer reliable and long-lasting?" value={reflection.g3} onChange={v => updateReflection("g3",v)} compact />
          </div>
          <p className="student-privacy-note">Your responses will be saved for your teacher to review. Do not close this page until you see the submission confirmation.</p>
          <button className="button primary wide student-submit" type="submit" disabled={busy}>{busy ? "Submitting your answers..." : "Submit Exit Ticket"}</button>
        </form>
        <footer className="student-footer">Smart CSS Exit Ticket • Learner Assessment Portal</footer>
      </section>
    </main>
  );
}

function Question({ n, title, points, prompt, value, onChange, compact=false }: {
  n: string; title: string; points: string; prompt: string; value: string;
  onChange: (v: string) => void; compact?: boolean;
}) {
  return <div className={`question ${compact?"compact":""}`}>
    <div className="question-top"><span className="number">{n}</span><strong>{title}</strong><span className="points">{points}</span></div>
    <label>{prompt}</label>
    <textarea value={value} onChange={e=>onChange(e.target.value)} rows={compact?2:3} placeholder="Enter learner's response..." />
  </div>;
}

function ScoreGuide() {
  const rows = [["Q1 • Safety precautions","3"],["Q2 • Shutdown/unplug","2"],["Q3 • Tools/PPE","2"],["Q4 • Inspection","1"],["Q5 • Software task","1"],["Literacy • Vocabulary","1"]];
  return <><div className="rubric-list">{rows.map(([a,b])=><div key={a}><span>{a}</span><b>{b} pt</b></div>)}</div><div className="total-rubric"><span>Total</span><b>10 points</b></div><p className="muted small">Reflection questions are recorded separately and are not graded in the exit-ticket total.</p></>;
}

export default App;
