import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, LockKeyhole, Plus, Trash2, LogOut, Copy, Sparkles, CheckCircle2 } from "lucide-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function App() {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState("loading");
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newType, setNewType] = useState("text");
  const publicId = new URLSearchParams(window.location.search).get("form");

  useEffect(() => {
    if (!supabase) { setMode("setup"); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (publicId) loadPublicForm();
    else if (session) { setMode("admin"); loadAdmin(); }
    else setMode("login");
  }, [session, publicId]);

  async function loadPublicForm() {
    setMode("loading");
    const { data: f, error: fe } = await supabase.from("forms").select("id,title").eq("public_id", publicId).eq("is_active", true).maybeSingle();
    if (fe || !f) { setMode("notfound"); return; }
    const { data: qs, error: qe } = await supabase.from("questions").select("id,prompt,kind,position").eq("form_id", f.id).eq("is_active", true).order("position");
    if (qe) { setNotice(qe.message); setMode("error"); return; }
    setForm(f); setQuestions(qs || []); setMode("respond");
  }

  async function loadAdmin() {
    setMode("admin");
    const { data: fs } = await supabase.from("forms").select("*").order("created_at").limit(1);
    let f = fs?.[0];
    if (!f) {
      const { data: created, error } = await supabase.from("forms").insert({ owner_id: session.user.id, title: "DoYouKnowMe?", public_id: crypto.randomUUID().replaceAll("-", "").slice(0, 12) }).select().single();
      if (error) { setNotice(error.message); return; }
      f = created;
    }
    setForm(f);
    const { data: qs, error: qe } = await supabase.from("questions").select("*").eq("form_id", f.id).order("position");
    if (qe) setNotice(qe.message);
    setQuestions(qs || []);
  }

  async function signIn(e) {
    e.preventDefault(); setBusy(true); setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setNotice(error.message);
    setBusy(false);
  }

  async function signUp(e) {
    e.preventDefault(); setBusy(true); setNotice("");
    const { error } = await supabase.auth.signUp({ email, password });
    setNotice(error ? error.message : "Account created. If email confirmation is enabled, confirm your email and then sign in.");
    setBusy(false);
  }

  async function addQuestion(e) {
    e.preventDefault();
    if (!newQuestion.trim() || !form) return;
    const { data, error } = await supabase.from("questions").insert({
      form_id: form.id, owner_id: session.user.id, prompt: newQuestion.trim(),
      kind: newType, position: questions.length + 1, is_active: true
    }).select().single();
    if (error) setNotice(error.message);
    else { setQuestions([...questions, data]); setNewQuestion(""); setNotice("Question added."); }
  }

  async function removeQuestion(id) {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) setNotice(error.message);
    else setQuestions(questions.filter(q => q.id !== id));
  }

  async function submitAnswers(e) {
    e.preventDefault();
    if (!name.trim()) { setNotice("Please enter your name."); return; }
    if (questions.some(q => !String(answers[q.id] || "").trim())) { setNotice("Please answer every question."); return; }
    setBusy(true); setNotice("");
    const { error } = await supabase.from("responses").insert({
      form_id: form.id, respondent_name: name.trim(), answers
    });
    if (error) setNotice(error.message);
    else setMode("thanks");
    setBusy(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?form=${form.public_id}`);
    setNotice("Your questionnaire link has been copied.");
  }

  async function logout() { await supabase.auth.signOut(); setForm(null); setQuestions([]); }

  if (mode === "setup") return <Shell><Panel><Mark/><h1>One tiny setup step.</h1><p>Add your Supabase project URL and public anon key to the site's environment variables. Follow the README included with this project.</p></Panel></Shell>;
  if (mode === "loading") return <Shell><Panel><Mark/><p>Loading your page…</p></Panel></Shell>;
  if (mode === "notfound") return <Shell><Panel><Mark/><h1>That link doesn't seem to work.</h1><p>Ask the owner to check the questionnaire link.</p></Panel></Shell>;
  if (mode === "error") return <Shell><Panel><Mark/><h1>Something went wrong</h1><p>{notice}</p></Panel></Shell>;
  if (mode === "thanks") return <Shell><Panel><Mark/><div className="success"><CheckCircle2 size={42}/></div><h1>You're on the list.</h1><p>Your answers have been sent privately to the owner. Thanks for playing.</p></Panel></Shell>;

  if (mode === "respond") return <Shell><Panel><Mark/><div className="eyebrow">A LITTLE TEST OF FRIENDSHIP</div><h1>{form?.title || "DoYouKnowMe?"}</h1><p className="lead">Let's see how well you really know me.</p><form onSubmit={submitAnswers} className="stack"><label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should I call you?" required/></label>{questions.map((q,i)=><label key={q.id}><span className="qnum">QUESTION {String(i+1).padStart(2,"0")}</span>{q.prompt}{q.kind==="long" ? <textarea value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} placeholder="Your answer…" required/> : <input value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} placeholder="Type your answer…" required/>}</label>)}{notice && <p className="notice">{notice}</p>}<button className="primary" disabled={busy || !questions.length}>{busy?"Sending…":"Send my answers"} <ArrowUpRight size={17}/></button></form><p className="tiny">Your answers are only visible to the questionnaire owner.</p></Panel></Shell>;

  if (mode === "login") return <Shell><Panel><Mark/><div className="eyebrow">PRIVATE ADMIN ACCESS</div><h1>Your little corner.</h1><p className="lead">Sign in to create questions and see responses.</p><form className="stack" onSubmit={signIn}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength="8" placeholder="At least 8 characters"/></label>{notice&&<p className="notice">{notice}</p>}<button className="primary" disabled={busy}>{busy?"Please wait…":"Sign in"} <LockKeyhole size={16}/></button><button type="button" className="textbutton" onClick={signUp} disabled={busy}>Create my admin account</button></form></Panel></Shell>;

  return <Shell><div className="adminhead"><div><Mark/><div className="eyebrow">YOUR PRIVATE DASHBOARD</div><h1>Make them guess.</h1><p className="lead">Create your questions. Keep the answers to yourself.</p></div><button className="iconbutton" onClick={logout} title="Sign out"><LogOut size={18}/></button></div><Panel className="wide"><div className="shareline"><div><div className="eyebrow">YOUR SHARE LINK</div><strong>Ready when you are</strong></div><button className="secondary" onClick={copyLink}><Copy size={16}/> Copy link</button></div><div className="linkpreview">{window.location.origin}{window.location.pathname}?form={form?.public_id}</div></Panel><Panel className="wide"><div className="sectiontitle"><div><div className="eyebrow">QUESTION BUILDER</div><h2>Your questions</h2></div><span className="count">{questions.length}</span></div>{questions.map((q,i)=><div className="questionrow" key={q.id}><span className="qindex">{String(i+1).padStart(2,"0")}</span><span>{q.prompt}</span><span className="kind">{q.kind==="long"?"Long answer":"Short answer"}</span><button className="delete" onClick={()=>removeQuestion(q.id)} title="Delete question"><Trash2 size={16}/></button></div>)}<form className="addform" onSubmit={addQuestion}><input value={newQuestion} onChange={e=>setNewQuestion(e.target.value)} placeholder="Write a question…" required/><select value={newType} onChange={e=>setNewType(e.target.value)}><option value="text">Short answer</option><option value="long">Long answer</option></select><button className="primary" disabled={!newQuestion.trim()}><Plus size={17}/> Add</button></form>{notice&&<p className="notice">{notice}</p>}</Panel><Responses form={form}/><footer>DOYOUKNOWME? <span>Made for curious minds.</span></footer></Shell>;
}

function Responses({form}) {
  const [rows,setRows]=useState([]);
  const [expanded,setExpanded]=useState(null);
  const [err,setErr]=useState("");
  useEffect(()=>{ if(!form)return; supabase.from("responses").select("*").eq("form_id",form.id).order("created_at",{ascending:false}).then(({data,error})=>{if(error)setErr(error.message);else setRows(data||[]);}); },[form]);
  return <Panel className="wide"><div className="sectiontitle"><div><div className="eyebrow">INCOMING ANSWERS</div><h2>Responses</h2></div><span className="count">{rows.length}</span></div>{err&&<p className="notice">{err}</p>}{!rows.length&&!err&&<div className="empty"><Sparkles size={22}/><p>No answers yet. Share your link and let the guessing begin.</p></div>}{rows.map(r=><div className="response" key={r.id}><button className="resbutton" onClick={()=>setExpanded(expanded===r.id?null:r.id)}><strong>{r.respondent_name}</strong><span>{new Date(r.created_at).toLocaleString()}</span><span>{expanded===r.id?"−":"+"}</span></button>{expanded===r.id&&<div className="answerlist">{Object.entries(r.answers||{}).map(([id,a],i)=><p key={id}><b>Answer {i+1}</b>{String(a)}</p>)}</div>}</div>)}</Panel>;
}

function Mark(){return <div className="mark"><span>DY</span><i>✳</i></div>}
function Panel({children,className=""}){return <section className={`panel ${className}`}>{children}</section>}
function Shell({children}){return <main className="shell"><div className="glow one"/><div className="glow two"/><div className="content">{children}</div><div className="bottomnote">A SMALL QUESTION. A BIG REVEAL.</div></main>}
export default App;