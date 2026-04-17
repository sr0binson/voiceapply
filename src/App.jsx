import { useState, useRef } from 'react'
import { jsPDF } from 'jspdf'

const NAV = ['Analyze', 'Documents', 'VoicePrint', 'History']

function loadStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surface2: '#f0efe9',
  border: 'rgba(0,0,0,0.08)', borderStrong: 'rgba(0,0,0,0.15)',
  text: '#1c1c1a', muted: '#6b6b64', faint: '#9e9e96',
  cyan: '#4ecdc4', cyanDim: 'rgba(78,205,196,0.12)', cyanBorder: 'rgba(78,205,196,0.3)',
  dark: '#1c1c1a',
  green: '#2d6a4f', greenBg: 'rgba(45,106,79,0.08)',
  red: '#9b2335', redBg: 'rgba(155,35,53,0.07)',
  amber: '#7a4f00', amberBg: 'rgba(122,79,0,0.07)',
}

function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.faint, marginBottom: 8 }}>{children}</div>
}
function Card({ children, style = {} }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, ...style }}>{children}</div>
}
function Pill({ children, color = C.text, bg = C.surface2 }) {
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: bg, color, fontFamily: "'DM Mono', monospace", display: 'inline-block' }}>{children}</span>
}
function Btn({ children, onClick, disabled, primary, small, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '6px 14px' : '11px 22px', borderRadius: 10,
      border: primary ? 'none' : `1px solid ${C.borderStrong}`,
      background: primary ? C.dark : C.surface,
      color: primary ? '#fff' : C.text,
      fontSize: small ? 12 : 14, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: "'DM Sans', sans-serif", opacity: disabled ? 0.45 : 1,
      transition: 'opacity 0.15s', ...style
    }}>{children}</button>
  )
}
function TextArea({ value, onChange, rows = 6, placeholder }) {
  return (
    <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} style={{
      width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px',
      fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: C.surface, color: C.text,
      lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
    }} />
  )
}
function Accordion({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: C.text, textAlign: 'left',
      }}>
        {title}
        <span style={{ fontSize: 10, color: C.faint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  )
}
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ marginTop: 10, fontSize: 12, padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: C.muted }}>
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}
function Dots() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.faint, animation: 'bounce 1.2s infinite', animationDelay: `${i*0.15}s` }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  )
}

function generateCoverLetterPDF(data) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 72, pageW = 612, contentW = pageW - margin * 2
  let y = margin
  const addText = (text, opts = {}) => {
    if (!text) return
    const { size = 11, bold = false, color = [28,28,26], lineH = 16 } = opts
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...color)
    doc.splitTextToSize(text, contentW).forEach(line => { if (y > 720) { doc.addPage(); y = margin }; doc.text(line, margin, y); y += lineH })
  }
  const gap = (n = 12) => { y += n }
  addText(data.name, { size: 18, bold: true, lineH: 22 }); gap(4)
  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 96)
  if (data.email || data.phone) { doc.text([data.email, data.phone].filter(Boolean).join('  |  '), margin, y); y += 13 }
  if (data.linkedin || data.portfolio) { doc.text([data.linkedin, data.portfolio].filter(Boolean).join('  |  '), margin, y); y += 13 }
  gap(4); doc.setDrawColor(200,200,196); doc.setLineWidth(0.5); doc.line(margin, y, pageW-margin, y); gap(18)
  addText(data.date || new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}), { color:[80,80,76] }); gap(16)
  addText(data.greeting || 'Dear Hiring Manager,'); gap(14)
  ;[data.p1,data.p2,data.p3].filter(Boolean).forEach(p => { addText(p, { lineH: 17 }); gap(12) })
  gap(4); addText('Best regards,'); gap(4); addText(data.name, { bold: true })
  doc.save(`${(data.name||'Cover_Letter').replace(/\s+/g,'_')}_Cover_Letter.pdf`)
}

function generateResumePDF(data) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 58, pageW = 612, contentW = pageW - margin * 2
  let y = margin
  const checkPage = (n=20) => { if (y+n > 730) { doc.addPage(); y = margin } }
  const addLine = (text, opts={}) => {
    if (!text) return
    const { size=10.5, bold=false, color=[28,28,26], lineH=15, indent=0 } = opts
    doc.setFontSize(size); doc.setFont('helvetica', bold?'bold':'normal'); doc.setTextColor(...color)
    doc.splitTextToSize(text, contentW-indent).forEach(line => { checkPage(); doc.text(line, margin+indent, y); y += lineH })
  }
  const sectionHeader = (title) => {
    y += 10; checkPage(24)
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(28,28,26)
    doc.text(title.toUpperCase(), margin, y); y += 4
    doc.setDrawColor(28,28,26); doc.setLineWidth(1); doc.line(margin, y, pageW-margin, y); y += 10
  }
  doc.setFontSize(20); doc.setFont('helvetica','bold'); doc.setTextColor(28,28,26)
  doc.text(data.name||'', margin, y); y += 24
  if (data.tagline) { doc.setFontSize(10.5); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,76); doc.text(data.tagline, margin, y); y += 16 }
  doc.setFontSize(9.5); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,96)
  const cp = [data.location,data.phone,data.email,data.linkedin,data.portfolio].filter(Boolean)
  if (cp.length) { doc.text(cp.join('  •  '), margin, y); y += 6 }
  doc.setDrawColor(200,200,196); doc.setLineWidth(0.5); doc.line(margin, y, pageW-margin, y)
  if (data.summary) { sectionHeader('Summary'); addLine(data.summary, {lineH:16}) }
  if (data.skills) { sectionHeader('Skills'); addLine(data.skills, {lineH:16}) }
  sectionHeader('Experience')
  data.experience?.forEach(job => {
    addLine(job.header, {bold:true, lineH:16})
    job.bullets?.forEach(b => {
      if (!b.trim()) return
      checkPage(18); doc.setFontSize(10.5); doc.setFont('helvetica','normal'); doc.setTextColor(28,28,26)
      doc.text('-', margin, y)
      doc.splitTextToSize(b, contentW-14).forEach(line => { checkPage(); doc.text(line, margin+14, y); y += 15 })
    })
    y += 4
  })
  if (data.projects?.length) {
    sectionHeader('Projects')
    data.projects.forEach(p => { addLine(`${p.name}    ${p.tech}`, {bold:true, lineH:15}); addLine(p.desc, {color:[80,80,76], lineH:14}); y += 4 })
  }
  if (data.education?.length) { sectionHeader('Education & Certifications'); data.education.forEach(e => addLine(e, {lineH:15})) }
  doc.save(`${(data.name||'Resume').replace(/\s+/g,'_')}_Resume.pdf`)
}

function buildSystemPrompt(resumeSection, voiceSection, userName, userContact, userLinks, bannedPhrases, applyThreshold, override) {
  const voiceInstruction = (voiceSection && voiceSection.trim().length > 0)
    ? 'Match the candidate voice profile exactly — their tone, rhythm, word choices, and anything they flag as unnatural. The voice profile is the only style guide. Do not impose your own style.'
    : 'No voice profile provided. Write professionally and neutrally. Clear, direct, human-sounding.'

  const threshold = Number.isFinite(Number(applyThreshold)) ? Math.max(0, Math.min(100, Number(applyThreshold))) : 85
  const scoringRules = override
    ? 'OVERRIDE MODE: User has chosen to apply regardless of score. Generate full output including cover letter, project idea, and outreach message no matter what. Still provide an honest score and verdict but always include all outputs.'
    : `SCORING: 0-100. ${threshold}+=APPLY+full output. <${threshold}=SKIP+no cover letter unless obvious SCAM.\nSCAM flags: no real company, vague duties, unusually high pay, MLM, asks personal info, poor grammar.`

  return 'You are a job match analyzer and cover letter writer.\n' +
    resumeSection + '\n' +
    voiceSection + '\n\n' +
    scoringRules + '\n\n' +
    'OUTPUT — valid JSON only, no markdown:\n' +
    '{"jobTitle":"","company":"","score":0,"verdict":"APPLY|SKIP|SCAM","verdictReason":"","scamFlags":[],"companySnapshot":"","matchedSkills":[],"missingSkills":[],"transferableNotes":"","coverLetter":"","projectIdea":"","projectAIPrompt":"","outreachMessage":""}\n\n' +
    'COVER LETTER (3 paragraphs, 250-350 words):\n' +
    '- ' + voiceInstruction + '\n' +
    (bannedPhrases && bannedPhrases.trim()
      ? '- The candidate has specifically flagged these phrases as ones they never use: ' + bannedPhrases.trim() + '\n'
      : '') +
    '- Never use hollow filler phrases that no real person says out loud\n' +
    '- No emojis ever — not in the cover letter, not in the outreach message\n' +
    '- ALWAYS stay strictly within the candidate\'s actual experience — never invent degrees, certifications, or background not in their resume\n' +
    '- Universal banned words: perfectly, perfect, leverage, synergy, transformative, utilize, seamlessly, innovative, impactful, robust, resonates\n' +
    '- Bridge skill gaps honestly using transferable experience\n' +
    '- End with a direct call to action\n' +
    '- Structure:\n' +
    userName + '\n' +
    userContact + '\n' +
    userLinks + '\n\n' +
    '[DATE]\n\n' +
    'Dear [Hiring Manager Name],\n\n' +
    '[P1]\n\n[P2]\n\n[P3]\n\n' +
    'Best regards,\n' +
    userName + '\n\n' +
    'OUTREACH: under 280 chars, direct, references the specific role\n\n' +
    'ALWAYS INCLUDE GAP-BRIDGING HELP:\n' +
    '- projectIdea: always provide one concrete portfolio project tailored to this job that can prove missing skills fast. Include recommended digital tools to build it (AI tools, automation tools, dev/design/analytics platforms as relevant)\n' +
    '- projectAIPrompt: provide a ready-to-copy prompt the candidate can paste into an AI assistant to help plan and build the suggested project step-by-step\n' +
    '- transferableNotes: keep it brief (2-4 sentences). Map existing strengths to missing skills, include 2-3 practical next steps, and mention specific digital tools/platforms that would help close the gaps quickly'
}

function OnboardingScreen({ onComplete }) {
  const [data, setData] = useState({ name:'', email:'', phone:'', linkedin:'', portfolio:'', matchThreshold:85 })
  const set = (k,v) => setData(d => ({...d,[k]:v}))
  const ready = data.name.trim() && data.email.trim()
  const field = { width:'100%', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', fontSize:14, fontFamily:"'DM Sans', sans-serif", background:C.surface, color:C.text, outline:'none', boxSizing:'border-box' }
  return (
    <div style={{ maxWidth:480, margin:'0 auto' }}>
      <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', marginBottom:4 }}>Welcome to MyApply <span style={{ color:C.cyan }}>▸</span></h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:32, lineHeight:1.6 }}>Set up your profile. This goes in your cover letter header and resume.</p>
      <Card>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[['name','Your name *',''],['email','Email *',''],['phone','Phone',''],['linkedin','LinkedIn URL','linkedin.com/in/yourname'],['portfolio','Portfolio URL','yoursite.com']].map(([k,l,ph]) => (
            <div key={k}><Label>{l}</Label><input value={data[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} style={field} /></div>
          ))}
        </div>
        <div style={{ marginTop:24 }}>
          <Btn primary onClick={() => onComplete(data)} disabled={!ready}>Get started →</Btn>
          <p style={{ fontSize:11, color:C.faint, marginTop:10 }}>Everything saved locally in your browser.</p>
        </div>
      </Card>
    </div>
  )
}

function SettingsTab({ profile, onProfileSaved }) {
  const [data, setData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    linkedin: profile?.linkedin || '',
    portfolio: profile?.portfolio || '',
    matchThreshold: Number.isFinite(Number(profile?.matchThreshold)) ? Number(profile.matchThreshold) : 85,
  })
  const [saved, setSaved] = useState(false)
  const set = (k, v) => {
    setSaved(false)
    setData(d => ({ ...d, [k]: v }))
  }
  const canSave = data.name.trim() && data.email.trim()
  const field = { width:'100%', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', fontSize:14, fontFamily:"'DM Sans', sans-serif", background:C.surface, color:C.text, outline:'none', boxSizing:'border-box' }

  function saveProfile() {
    if (!canSave) return
    onProfileSaved(data)
    setSaved(true)
  }

  function clearAll() {
    if (!window.confirm('This will clear all saved data and reload the app. Continue?')) return
    localStorage.clear()
    window.location.reload()
  }

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', marginBottom:4 }}>Settings <span style={{ color:C.cyan }}>▸</span></h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:24, lineHeight:1.6 }}>Update your profile details and manage local app data.</p>
      <Card>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[['name','Your name *',''],['email','Email *',''],['phone','Phone',''],['linkedin','LinkedIn URL','linkedin.com/in/yourname'],['portfolio','Portfolio URL','yoursite.com']].map(([k,l,ph]) => (
            <div key={k}><Label>{l}</Label><input value={data[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} style={field} /></div>
          ))}
          <div>
            <Label>Minimum match score to apply (%)</Label>
            <input
              type="number"
              min={0}
              max={100}
              value={data.matchThreshold}
              onChange={e => set('matchThreshold', Math.max(0, Math.min(100, Number(e.target.value || 0))))}
              style={field}
            />
          </div>
        </div>
        <div style={{ display:'flex', gap:12, marginTop:24, flexWrap:'wrap' }}>
          <Btn primary onClick={saveProfile} disabled={!canSave}>Update profile</Btn>
          <Btn onClick={clearAll} style={{ border:`1px solid rgba(155,35,53,0.25)`, color:C.red, background:C.redBg }}>Clear all data and start over</Btn>
        </div>
        {saved && <p style={{ fontSize:12, color:C.green, marginTop:12 }}>Profile updated.</p>}
      </Card>
    </div>
  )
}

function CoverLetterEditor({ coverLetter, jobTitle, company, onClose, profile }) {
  const parseFromText = (text) => {
    if (!text) return { greeting:'Dear Hiring Manager,', p1:'', p2:'', p3:'', date:'' }
    const lines = text.split('\n').map(l=>l.trim()).filter(Boolean)
    const gi = lines.findIndex(l=>l.startsWith('Dear '))
    const greeting = gi>=0 ? lines[gi] : 'Dear Hiring Manager,'
    const body = gi>=0 ? lines.slice(gi+1) : lines
    const si = body.findIndex(l=>l==='Best regards,'||l==='Sincerely,')
    const paras = (si>=0?body.slice(0,si):body).join('\n').split(/\n{2,}/).map(p=>p.trim()).filter(Boolean)
    const dm = text.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/m)
    return { date:dm?dm[0]:new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}), greeting, p1:paras[0]||'', p2:paras[1]||'', p3:paras[2]||'' }
  }
  const parsed = parseFromText(coverLetter)
  const [data, setData] = useState({
    name:profile?.name||'', email:profile?.email||'', phone:profile?.phone||'',
    linkedin:profile?.linkedin||'', portfolio:profile?.portfolio||'',
    date:parsed.date, greeting:parsed.greeting, p1:parsed.p1, p2:parsed.p2, p3:parsed.p3,
  })
  const set = (k,v) => setData(d=>({...d,[k]:v}))
  const fullText = [data.name, `${data.email}${data.phone?' | '+data.phone:''}`, `${data.linkedin}${data.portfolio?' | '+data.portfolio:''}`, '', data.date, '', data.greeting, '', data.p1, '', data.p2, '', data.p3, '', 'Best regards,', data.name].join('\n')
  const field = { width:'100%', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:"'DM Sans', sans-serif", background:C.surface2, color:C.text, outline:'none', boxSizing:'border-box', lineHeight:1.6 }
  return (
    <div style={{ marginTop:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>Cover letter editor</h2>
          {jobTitle && <p style={{ fontSize:12, color:C.muted, margin:'4px 0 0' }}>{jobTitle} at {company}</p>}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <CopyBtn text={fullText} />
          <Btn small primary onClick={() => generateCoverLetterPDF(data)}>Download PDF →</Btn>
          {onClose && <Btn small onClick={onClose}>← Back</Btn>}
        </div>
      </div>
      <Card>
        <div style={{ padding:16, borderRadius:10, background:C.surface2, border:`1px solid ${C.border}`, marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{data.name||'Your Name'}</div>
          <div style={{ fontSize:11, color:C.muted }}>
            {data.email && <a href={`mailto:${data.email}`} style={{ color:C.cyan }}>{data.email}</a>}
            {data.email&&data.phone&&' | '}{data.phone}
          </div>
          <div style={{ fontSize:11, color:C.muted }}>
            {data.linkedin && <a href={`https://${data.linkedin}`} target="_blank" rel="noreferrer" style={{ color:C.cyan }}>{data.linkedin}</a>}
            {data.linkedin&&data.portfolio&&' | '}
            {data.portfolio && <a href={`https://${data.portfolio}`} target="_blank" rel="noreferrer" style={{ color:C.cyan }}>{data.portfolio}</a>}
          </div>
        </div>
        <div style={{ marginBottom:14 }}><Label>Date</Label><input value={data.date} onChange={e=>set('date',e.target.value)} style={field} /></div>
        <div style={{ marginBottom:14 }}><Label>Greeting</Label><input value={data.greeting} onChange={e=>set('greeting',e.target.value)} style={field} /></div>
        {['p1','p2','p3'].map((k,i) => (
          <div key={k} style={{ marginBottom:14 }}>
            <Label>Paragraph {i+1}{i===0?' — opening':i===1?' — skills match':' — close'}</Label>
            <textarea value={data[k]} onChange={e=>set(k,e.target.value)} rows={4} style={{ ...field, resize:'vertical' }} />
          </div>
        ))}
        <div style={{ marginTop:8, padding:'12px 16px', background:C.surface2, borderRadius:8, fontSize:13, color:C.muted }}>
          Best regards,<br /><span style={{ fontWeight:600, color:C.text }}>{data.name||'Your Name'}</span>
        </div>
      </Card>
      <div style={{ marginTop:16 }}>
        <Label>Preview</Label>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:28, fontSize:12, lineHeight:1.8, fontFamily:"'DM Sans', sans-serif", color:C.text, whiteSpace:'pre-wrap' }}>{fullText}</div>
      </div>
    </div>
  )
}

function ResumeEditor({ onClose, profile }) {
  const [data, setData] = useState({
    name:profile?.name||'', tagline:'', location:'',
    phone:profile?.phone||'', email:profile?.email||'',
    linkedin:profile?.linkedin||'', portfolio:profile?.portfolio||'',
    summary:'', skills:'',
    experience:[{ header:'Role    Start – End    Company – Location', bullets:[''] }],
    projects:[{ name:'', tech:'', desc:'' }],
    education:[''],
  })
  const set = (k,v) => setData(d=>({...d,[k]:v}))
  const setExp = (i,k,v) => setData(d=>{ const e=[...d.experience]; e[i]={...e[i],[k]:v}; return {...d,experience:e} })
  const setBullet = (ei,bi,v) => setData(d=>{ const e=[...d.experience]; const b=[...e[ei].bullets]; b[bi]=v; e[ei]={...e[ei],bullets:b}; return {...d,experience:e} })
  const addBullet = (ei) => setData(d=>{ const e=[...d.experience]; e[ei]={...e[ei],bullets:[...e[ei].bullets,'']}; return {...d,experience:e} })
  const removeBullet = (ei,bi) => setData(d=>{ const e=[...d.experience]; e[ei]={...e[ei],bullets:e[ei].bullets.filter((_,i)=>i!==bi)}; return {...d,experience:e} })
  const setProj = (i,k,v) => setData(d=>{ const p=[...d.projects]; p[i]={...p[i],[k]:v}; return {...d,projects:p} })
  const addJob = () => setData(d=>({...d,experience:[...d.experience,{header:'Role    Start – End    Company – Location',bullets:['']}]}))
  const addProject = () => setData(d=>({...d,projects:[...d.projects,{name:'',tech:'',desc:''}]}))
  const setEdu = (i,v) => setData(d=>{ const e=[...d.education]; e[i]=v; return {...d,education:e} })
  const addEdu = () => setData(d=>({...d,education:[...d.education,'']}))
  const field = { width:'100%', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:"'DM Sans', sans-serif", background:C.surface2, color:C.text, outline:'none', boxSizing:'border-box', lineHeight:1.6 }
  const sec = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.dark, borderBottom:`1.5px solid ${C.dark}`, paddingBottom:4, marginBottom:12, marginTop:24 }
  return (
    <div style={{ marginTop:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>Resume editor</h2>
        <div style={{ display:'flex', gap:10 }}>
          <Btn small primary onClick={() => generateResumePDF(data)}>Download PDF →</Btn>
          {onClose && <Btn small onClick={onClose}>← Back</Btn>}
        </div>
      </div>
      <Card>
        <div style={sec}>Contact</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[['name','Name'],['location','Location'],['phone','Phone'],['email','Email'],['linkedin','LinkedIn'],['portfolio','Portfolio']].map(([k,l]) => (
            <div key={k}><Label>{l}</Label><input value={data[k]||''} onChange={e=>set(k,e.target.value)} style={field} /></div>
          ))}
        </div>
        <div style={{ marginTop:10 }}><Label>Title / Tagline</Label><input value={data.tagline||''} onChange={e=>set('tagline',e.target.value)} style={field} /></div>
        <div style={sec}>Summary</div>
        <textarea value={data.summary} onChange={e=>set('summary',e.target.value)} rows={4} style={{ ...field, resize:'vertical' }} />
        <div style={sec}>Skills</div>
        <textarea value={data.skills} onChange={e=>set('skills',e.target.value)} rows={3} style={{ ...field, resize:'vertical' }} />
        <p style={{ fontSize:11, color:C.faint, marginTop:4 }}>Separate with •</p>
        <div style={sec}>Experience</div>
        {data.experience.map((job,ei) => (
          <div key={ei} style={{ marginBottom:16, padding:16, background:C.surface2, borderRadius:10, border:`1px solid ${C.border}` }}>
            <Label>Job header</Label>
            <input value={job.header} onChange={e=>setExp(ei,'header',e.target.value)} style={{ ...field, marginBottom:12 }} />
            <Label>Bullets</Label>
            {job.bullets.map((b,bi) => (
              <div key={bi} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
                <span style={{ marginTop:10, color:C.muted }}>-</span>
                <textarea value={b} onChange={e=>setBullet(ei,bi,e.target.value)} rows={2} style={{ ...field, flex:1, resize:'vertical' }} />
                <button onClick={() => removeBullet(ei,bi)} style={{ marginTop:8, background:'none', border:'none', cursor:'pointer', color:C.red, fontSize:18 }}>×</button>
              </div>
            ))}
            <button onClick={() => addBullet(ei)} style={{ fontSize:12, color:C.cyan, background:'none', border:`1px solid ${C.cyanBorder}`, borderRadius:6, padding:'4px 12px', cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>+ Add bullet</button>
          </div>
        ))}
        <button onClick={addJob} style={{ fontSize:12, color:C.cyan, background:'none', border:`1px solid ${C.cyanBorder}`, borderRadius:6, padding:'6px 14px', cursor:'pointer', fontFamily:"'DM Sans', sans-serif", marginBottom:8 }}>+ Add job</button>
        <div style={sec}>Projects</div>
        {data.projects.map((p,i) => (
          <div key={i} style={{ marginBottom:12, padding:14, background:C.surface2, borderRadius:10, border:`1px solid ${C.border}` }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:8 }}>
              <div><Label>Name</Label><input value={p.name} onChange={e=>setProj(i,'name',e.target.value)} style={field} /></div>
              <div><Label>Tech stack</Label><input value={p.tech} onChange={e=>setProj(i,'tech',e.target.value)} style={field} /></div>
            </div>
            <Label>Description</Label>
            <input value={p.desc} onChange={e=>setProj(i,'desc',e.target.value)} style={field} />
          </div>
        ))}
        <button onClick={addProject} style={{ fontSize:12, color:C.cyan, background:'none', border:`1px solid ${C.cyanBorder}`, borderRadius:6, padding:'6px 14px', cursor:'pointer', fontFamily:"'DM Sans', sans-serif", marginBottom:8 }}>+ Add project</button>
        <div style={sec}>Education & Certifications</div>
        {data.education.map((e,i) => (
          <div key={i} style={{ marginBottom:8 }}><input value={e} onChange={ev=>setEdu(i,ev.target.value)} style={field} /></div>
        ))}
        <button onClick={addEdu} style={{ fontSize:12, color:C.cyan, background:'none', border:`1px solid ${C.cyanBorder}`, borderRadius:6, padding:'6px 14px', cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>+ Add entry</button>
      </Card>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('Analyze')
  const [apiKey, setApiKey] = useState(localStorage.getItem('va_key')||'')
  const [keySaved, setKeySaved] = useState(!!localStorage.getItem('va_key'))
  const [history, setHistory] = useState(() => loadStorage('va_history',[]))
  const [voiceProfile, setVoiceProfile] = useState(() => loadStorage('va_voice',null))
  const [profile, setProfile] = useState(() => loadStorage('va_profile',null))
  const [currentResult, setCurrentResult] = useState(null)
  const [docView, setDocView] = useState(null)

  function saveKey() {
    if (!apiKey.startsWith('sk-ant-')) { alert("Anthropic keys start with sk-ant-"); return }
    localStorage.setItem('va_key',apiKey); setKeySaved(true)
  }
  function onResult(result) {
    const entry = {...result, timestamp:new Date().toLocaleString(), id:Date.now()}
    const updated = [entry,...history].slice(0,50)
    setHistory(updated); localStorage.setItem('va_history',JSON.stringify(updated)); setCurrentResult(result)
  }
  function onVoiceSaved(p) { setVoiceProfile(p); localStorage.setItem('va_voice',JSON.stringify(p)) }
  function onProfileSaved(p) { setProfile(p); localStorage.setItem('va_profile',JSON.stringify(p)) }
  const lastWithCover = history.find(r=>r.coverLetter)

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", background:C.bg, minHeight:'100vh', color:C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&family=Rubik:wght@400&family=Syne:wght@700&display=swap" rel="stylesheet" />
      <header style={{ borderBottom:`1px solid ${C.border}`, background:C.bg, position:'sticky', top:0, zIndex:10 }}>
        <div style={{ maxWidth:760, margin:'0 auto', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:0 }}>
            <span style={{ fontSize:18, fontWeight:300, letterSpacing:'0.01em', color:'#9e9e96', fontFamily:"'Rubik', 'DM Sans', sans-serif", transform:'scaleX(1.08)', transformOrigin:'left center', display:'inline-block' }}>my</span>
            <span style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.02em', color:'#1c1c1a', fontFamily:"'Syne', 'DM Sans', sans-serif" }}>Apply</span>
            <span style={{ fontSize:13, color:'#4ecdc4', lineHeight:1, marginLeft:4 }}>▸</span>
          </div>
          {profile && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <nav style={{ display:'flex', gap:2 }}>
                {NAV.map(t => (
                  <button key={t} onClick={() => { setTab(t); setDocView(null) }} style={{
                    padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
                    fontSize:13, fontWeight:500, fontFamily:"'DM Sans', sans-serif",
                    background:tab===t?C.dark:'transparent', color:tab===t?'#fff':C.muted, transition:'all 0.15s',
                  }}>
                    {t}
                    {t==='History'&&history.length>0&&<span style={{ marginLeft:5, fontSize:10, background:C.cyanDim, color:C.cyan, padding:'1px 5px', borderRadius:10, fontFamily:'monospace' }}>{history.length}</span>}
                    {t==='VoicePrint'&&!voiceProfile&&<span style={{ marginLeft:5, fontSize:10, background:C.amberBg, color:C.amber, padding:'1px 5px', borderRadius:10 }}>!</span>}
                  </button>
                ))}
              </nav>
              <button
                onClick={() => { setTab('Settings'); setDocView(null) }}
                style={{
                  background:'none', border:'none', cursor:'pointer', padding:'7px 10px',
                  borderRadius:8, color:tab==='Settings'?C.text:C.muted, fontSize:13, fontWeight:500,
                  fontFamily:"'DM Sans', sans-serif", textDecoration:'underline', textUnderlineOffset:2,
                }}
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </header>
      <main style={{ maxWidth:760, margin:'0 auto', padding:'48px 24px' }}>
        {!profile ? <OnboardingScreen onComplete={onProfileSaved} /> : (
          <>
            {!keySaved && (
              <div style={{ marginBottom:32, padding:'14px 18px', borderRadius:12, background:C.amberBg, border:`1px solid rgba(122,79,0,0.15)`, display:'flex', flexWrap:'wrap', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:11, fontWeight:600, color:C.amber, textTransform:'uppercase', letterSpacing:'0.06em', display:'inline-flex', alignItems:'center', gap:6 }}><span aria-hidden="true">🔑</span>API Key</span>
                <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveKey()} placeholder="sk-ant-api03-..."
                  style={{ flex:1, minWidth:200, background:'transparent', border:'none', outline:'none', fontSize:13, fontFamily:"'DM Mono', monospace", color:C.text }} />
                <Btn small onClick={saveKey}>Save key</Btn>
                <span style={{ fontSize:11, color:C.faint, width:'100%' }}>Saved locally in your browser. Never sent anywhere except Anthropic's API.</span>
              </div>
            )}
            {keySaved && (
              <div style={{ marginBottom:32, padding:'10px 16px', borderRadius:12, background:C.greenBg, border:`1px solid rgba(45,106,79,0.15)`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, fontWeight:500, color:C.green }}>✓ API key saved</span>
                <button onClick={() => { localStorage.removeItem('va_key'); setKeySaved(false); setApiKey('') }} style={{ fontSize:12, color:C.faint, background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>Change</button>
              </div>
            )}
            {tab==='Analyze' && <AnalyzeTab apiKey={apiKey} keySaved={keySaved} voiceProfile={voiceProfile} onResult={onResult} currentResult={currentResult} setCurrentResult={setCurrentResult} setTab={setTab} profile={profile} />}
            {tab==='Documents' && (
              docView==='cover' ? <CoverLetterEditor coverLetter={lastWithCover?.coverLetter||''} jobTitle={lastWithCover?.jobTitle||''} company={lastWithCover?.company||''} onClose={() => setDocView(null)} profile={profile} />
              : docView==='resume' ? <ResumeEditor onClose={() => setDocView(null)} profile={profile} />
              : <DocumentsTab history={history} onOpenCover={() => setDocView('cover')} onOpenResume={() => setDocView('resume')} lastWithCover={lastWithCover} profile={profile} />
            )}
            {tab==='VoicePrint' && <VoicePrintTab apiKey={apiKey} keySaved={keySaved} voiceProfile={voiceProfile} onVoiceSaved={onVoiceSaved} />}
            {tab==='History' && <HistoryTab history={history} onView={r => { setCurrentResult(r); setTab('Analyze') }} />}
            {tab==='Settings' && <SettingsTab profile={profile} onProfileSaved={onProfileSaved} />}
          </>
        )}
      </main>
    </div>
  )
}

function AnalyzeTab({ apiKey, keySaved, voiceProfile, onResult, currentResult, setCurrentResult, setTab, profile }) {
  const [jd, setJd] = useState('')
  const [inputMode, setInputMode] = useState('description')
  const [jobUrl, setJobUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [error, setError] = useState('')
  const msgs = ['Reading the job posting...','Checking for scam signals...','Scoring your skills match...','Writing your cover letter...','Almost done...']

  async function analyze(override = false) {
    if (!keySaved) { alert('Save your API key first.'); return }
    if (inputMode === 'description' && !jd.trim()) { alert('Paste a job description first.'); return }
    if (inputMode === 'url' && !jobUrl.trim()) { alert('Paste a job URL first.'); return }
    setLoading(true); setError(''); setCurrentResult(null)
    let mi=0; setLoadMsg(msgs[0])
    const interval = setInterval(() => { mi=(mi+1)%msgs.length; setLoadMsg(msgs[mi]) }, 2500)
    try {
      const voiceSection = voiceProfile?.analysis ? '\n\nCANDIDATE VOICE PROFILE:\n'+voiceProfile.analysis.substring(0,800) : ''
      const resumeSection = voiceProfile?.resume ? '\n\nCANDIDATE RESUME:\n'+voiceProfile.resume.substring(0,1400) : ''
      const userName = profile?.name || 'Candidate'
      const userContact = [profile?.email, profile?.phone].filter(Boolean).join(' | ')
      const userLinks = [profile?.linkedin, profile?.portfolio].filter(Boolean).join(' | ')
      const bannedPhrases = voiceProfile?.bannedPhrases || ''
      const applyThreshold = Number.isFinite(Number(profile?.matchThreshold)) ? Number(profile.matchThreshold) : 85
      const userPrompt = inputMode === 'url'
        ? 'Analyze this job posting URL. If you cannot access it directly, infer likely role expectations from the URL path and explain uncertainty in verdictReason:\n\n' + jobUrl
        : 'Analyze this job posting:\n\n' + jd
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2500, system:buildSystemPrompt(resumeSection,voiceSection,userName,userContact,userLinks,bannedPhrases,applyThreshold,override), messages:[{ role:'user', content:userPrompt }] }),
      })
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||'API error '+res.status) }
      const data = await res.json()
      onResult(JSON.parse(data.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim()))
    } catch(e) { setError(e.message) }
    finally { clearInterval(interval); setLoading(false) }
  }

  return (
    <div>
      {!voiceProfile && (
        <div style={{ marginBottom:24, padding:'14px 18px', borderRadius:12, background:C.amberBg, border:`1px solid rgba(122,79,0,0.15)`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:C.amber }}>VoicePrint not set up</div>
            <div style={{ fontSize:12, color:C.amber, opacity:0.8, marginTop:2 }}>Cover letters will be generic. Set up VoicePrint first.</div>
          </div>
          <Btn small onClick={() => setTab('VoicePrint')} style={{ background:C.amberBg, border:`1px solid rgba(122,79,0,0.2)`, color:C.amber }}>Set up →</Btn>
        </div>
      )}
      <h1 style={{ fontSize:30, fontWeight:700, letterSpacing:'-0.02em', marginBottom:4, fontFamily:"'Syne', 'DM Sans', sans-serif" }}>Analyze Job</h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:24, lineHeight:1.6 }}>Paste a job description. Get your match score, cover letter, and outreach message.</p>
      <div style={{ marginBottom:14 }}>
        <Label>Mode</Label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { id:'description', label:'Paste description' },
            { id:'url', label:'Paste URL' },
          ].map(opt => (
            <button key={opt.id} onClick={() => setInputMode(opt.id)} style={{
              padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans', sans-serif",
              transition:'all 0.15s', background:inputMode===opt.id?C.dark:C.surface, color:inputMode===opt.id?'#fff':C.muted,
              border:inputMode===opt.id?`1px solid ${C.dark}`:`1px solid ${C.border}`,
            }}>{opt.label}</button>
          ))}
        </div>
      </div>
      {inputMode === 'description' ? (
        <>
          <Label>Job description</Label>
          <TextArea value={jd} onChange={e=>setJd(e.target.value)} rows={10} placeholder="Paste the full job description here..." />
        </>
      ) : (
        <>
          <Label>Job URL</Label>
          <input
            value={jobUrl}
            onChange={e=>setJobUrl(e.target.value)}
            placeholder="https://company.com/jobs/role"
            style={{ width:'100%', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', fontSize:13, fontFamily:"'DM Sans', sans-serif", background:C.surface, color:C.text, outline:'none', boxSizing:'border-box' }}
          />
        </>
      )}
      <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:16, justifyContent:'flex-end' }}>
        {loading && <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:13, marginRight:'auto' }}><Dots />{loadMsg}</div>}
        <button
          onClick={() => analyze(false)}
          disabled={loading}
          style={{
            border:'none', cursor:loading?'not-allowed':'pointer', background:'transparent',
            color:C.cyan, fontSize:44, fontWeight:700, lineHeight:1, opacity:loading?0.45:1,
            fontFamily:"'DM Sans', sans-serif", display:'inline-flex', alignItems:'center', justifyContent:'center',
            padding:0, textShadow:'0 3px 12px rgba(78,205,196,0.45)', transform:'translateY(-1px)',
            transition:'transform 0.15s ease, text-shadow 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={e => {
            if (loading) return
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.06)'
            e.currentTarget.style.textShadow = '0 5px 16px rgba(78,205,196,0.55)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.textShadow = '0 3px 12px rgba(78,205,196,0.45)'
          }}
          aria-label={loading ? 'Analyzing job' : 'Analyze job'}
          title={loading ? 'Analyzing...' : 'Analyze'}
        >
          ▸
        </button>
      </div>
      {error && <div style={{ marginTop:20, padding:'14px 18px', borderRadius:12, background:C.redBg, border:`1px solid rgba(155,35,53,0.15)`, fontSize:13, color:C.red }}><strong>Something went wrong:</strong> {error}</div>}
      {currentResult && <ResultCard result={currentResult} onOverride={() => analyze(true)} apiKey={apiKey} />}
    </div>
  )
}

function ResultCard({ result:r, onOverride, apiKey }) {
  const scoreColor = r.score>=85?C.green:r.score>=70?C.amber:C.red
  const vc = {APPLY:{bg:C.greenBg,color:C.green,border:'rgba(45,106,79,0.2)',label:'Apply'},SKIP:{bg:C.redBg,color:C.red,border:'rgba(155,35,53,0.2)',label:'Do not apply'},SCAM:{bg:C.amberBg,color:C.amber,border:'rgba(122,79,0,0.2)',label:'Likely scam — skip'}}[r.verdict]||{bg:C.surface2,color:C.muted,border:C.border,label:r.verdict}
  const projectPromptFallback = r.projectIdea
    ? `Help me build this portfolio project for a ${r.jobTitle || 'target role'} role:\n\n${r.projectIdea}\n\nGive me:\n1) A practical plan with milestones\n2) Recommended tools (including AI/automation tools)\n3) A simple architecture + feature scope for v1\n4) A 1-week execution checklist\n5) Resume bullet points and interview talking points from this project`
    : ''
  const projectAIPromptText = (r.projectAIPrompt && r.projectAIPrompt.trim()) ? r.projectAIPrompt.trim() : projectPromptFallback
  const [projectRunLoading, setProjectRunLoading] = useState(false)
  const [projectRunError, setProjectRunError] = useState('')
  const [projectRunResult, setProjectRunResult] = useState('')
  const [showProjectOptions, setShowProjectOptions] = useState(false)
  const [selectedProjectMode, setSelectedProjectMode] = useState('')

  const projectBuildModes = [
    { id:'mvp', label:'Fast MVP plan' },
    { id:'tools', label:'AI + tool stack' },
    { id:'steps', label:'Step-by-step build' },
    { id:'portfolio', label:'Portfolio-ready delivery' },
  ]

  const modePromptMap = {
    mvp: 'Give me a fast MVP plan I can execute quickly (scope, milestones, and must-have features only).',
    tools: 'Recommend the best digital tools for this build, including AI and automation tools, and explain why each is useful.',
    steps: 'Break this into clear build steps with practical implementation guidance for each step.',
    portfolio: 'Show how to shape this into a strong portfolio piece with measurable outcomes and interview talking points.',
  }

  async function runProjectPrompt(modeId) {
    if (!apiKey || !projectAIPromptText) return
    const modeInstruction = modePromptMap[modeId] || modePromptMap.mvp
    const runPrompt =
      `Project suggestion:\n${r.projectIdea || ''}\n\n` +
      `${modeInstruction}\n\n` +
      `Context prompt:\n${projectAIPromptText}`

    setProjectRunLoading(true)
    setProjectRunError('')
    setSelectedProjectMode(modeId)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1200,
          system:'You are a practical project coach. Give concise, actionable steps, concrete tool recommendations, and implementation details suitable for shipping quickly.',
          messages:[{ role:'user', content:runPrompt }],
        }),
      })
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||'API error '+res.status) }
      const data = await res.json()
      setProjectRunResult(data.content.map(b=>b.text||'').join('').trim())
      setShowProjectOptions(false)
    } catch (e) {
      setProjectRunError(e.message || 'Could not run AI prompt.')
    } finally {
      setProjectRunLoading(false)
    }
  }
  return (
    <div style={{ marginTop:32 }}>
      <Card>
        <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:16 }}>
          <span style={{ fontSize:48, fontWeight:300, fontFamily:"'DM Mono', monospace", color:scoreColor, lineHeight:1 }}>{r.score}%</span>
          <div style={{ paddingTop:4 }}>
            <div style={{ fontSize:17, fontWeight:600 }}>{r.jobTitle||'Unknown role'}</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>{r.company||'Unknown company'}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:20, background:vc.bg, color:vc.color, border:`1px solid ${vc.border}` }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', display:'inline-block' }} />{vc.label}
          </div>
          {r.verdict !== 'APPLY' && onOverride && (
            <button onClick={onOverride} style={{ fontSize:12, padding:'5px 14px', borderRadius:20, background:C.surface2, border:`1px solid ${C.border}`, cursor:'pointer', color:C.muted, fontFamily:"'DM Sans', sans-serif" }}>
              Apply anyway →
            </button>
          )}
        </div>
        <p style={{ fontSize:13, color:C.muted, lineHeight:1.65, marginBottom:16 }}>{r.verdictReason}</p>
        {r.companySnapshot && <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background:C.cyanDim, borderLeft:`2px solid ${C.cyan}`, fontSize:13, lineHeight:1.65 }}>{r.companySnapshot}</div>}
        {r.scamFlags?.length>0 && <div style={{ marginBottom:14 }}><Label>Scam signals</Label><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{r.scamFlags.map(f=><Pill key={f} color={C.amber} bg={C.amberBg}>{f}</Pill>)}</div></div>}
        {r.matchedSkills?.length>0 && <div style={{ marginBottom:14 }}><Label>Skills matched</Label><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{r.matchedSkills.map(s=><Pill key={s} color={C.green} bg={C.greenBg}>{s}</Pill>)}</div></div>}
        {r.missingSkills?.length>0 && <div style={{ marginBottom:14 }}><Label>Gaps</Label><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{r.missingSkills.map(s=><Pill key={s} color={C.red} bg={C.redBg}>{s}</Pill>)}</div></div>}
        {r.transferableNotes && (
          <div style={{ marginBottom:16, padding:'10px 12px', borderRadius:12, background:C.cyanDim, border:`1px solid ${C.cyanBorder}` }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.cyan, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Skill-gap strategy</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.55 }}>{r.transferableNotes}</div>
          </div>
        )}
        {r.projectIdea && (
          <div style={{ marginBottom:16, padding:'10px 12px', borderRadius:12, background:C.greenBg, border:'1px solid rgba(45,106,79,0.22)' }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.green, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Project suggestion</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.55 }}>{r.projectIdea}</div>
            {projectAIPromptText && (
              <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:C.surface, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                  <div />
                  <button
                    onClick={() => setShowProjectOptions(v => !v)}
                    disabled={projectRunLoading || !apiKey}
                    style={{ fontSize:12, lineHeight:1, padding:0, border:'none', background:'transparent', color:C.text, cursor:(projectRunLoading || !apiKey)?'not-allowed':'pointer', fontFamily:"'DM Sans', sans-serif", opacity:(projectRunLoading || !apiKey)?0.6:1, display:'inline-flex', alignItems:'center', gap:4, fontWeight:600 }}
                    title="Choose AI build mode"
                  >
                    AI <span style={{ color:C.cyan, fontSize:13 }}>{projectRunLoading ? '…' : '▸'}</span>
                  </button>
                </div>
                {showProjectOptions && !projectRunLoading && (
                  <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:8 }}>
                    {projectBuildModes.map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => runProjectPrompt(mode.id)}
                        style={{ fontSize:11, padding:'5px 9px', borderRadius:20, border:`1px solid ${C.border}`, background:C.surface2, color:C.muted, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                )}
                {projectRunError && <div style={{ marginTop:8, fontSize:12, color:C.red }}>{projectRunError}</div>}
                {projectRunLoading && <div style={{ marginTop:8, fontSize:12, color:C.muted }}>Running AI for {projectBuildModes.find(m => m.id===selectedProjectMode)?.label || 'project plan'}...</div>}
                {projectRunResult && <div style={{ marginTop:8, fontSize:12, color:C.text, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{projectRunResult}</div>}
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop:8 }}>
          {r.coverLetter && <Accordion title="Cover letter"><pre style={{ whiteSpace:'pre-wrap', fontSize:13, lineHeight:1.75, fontFamily:"'DM Sans', sans-serif", color:C.text }}>{r.coverLetter}</pre><CopyBtn text={r.coverLetter} /></Accordion>}
          {r.outreachMessage && <Accordion title="Outreach message"><pre style={{ whiteSpace:'pre-wrap', fontSize:13, lineHeight:1.75, fontFamily:"'DM Sans', sans-serif", color:C.text }}>{r.outreachMessage}</pre><CopyBtn text={r.outreachMessage} /></Accordion>}
        </div>
      </Card>
    </div>
  )
}

function DocumentsTab({ history, onOpenCover, onOpenResume, lastWithCover, profile }) {
  const applyThreshold = Number.isFinite(Number(profile?.matchThreshold)) ? Number(profile.matchThreshold) : 85
  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', marginBottom:4 }}>Documents <span style={{ color:C.cyan }}>▸</span></h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:28 }}>Edit, download, and copy your cover letter and resume.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32 }}>
        <Card style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Cover letter</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.6, flex:1 }}>{lastWithCover?`Last: ${lastWithCover.jobTitle} at ${lastWithCover.company}`:`No cover letter yet. Analyze a job that scores ${applyThreshold}%+ first.`}</div>
          <Btn primary small onClick={onOpenCover} disabled={!lastWithCover}>Open editor →</Btn>
        </Card>
        <Card style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Resume</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.6, flex:1 }}>Edit sections, update content, and download a clean PDF.</div>
          <Btn primary small onClick={onOpenResume}>Open editor →</Btn>
        </Card>
      </div>
      {history.filter(r=>r.coverLetter).length>0 && (
        <div>
          <Label>Cover letter history</Label>
          <Card style={{ padding:0, overflow:'hidden' }}>
            {history.filter(r=>r.coverLetter).map((r,i,arr) => (
              <div key={r.id||i} style={{ padding:'14px 20px', borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{r.jobTitle} at {r.company}</div>
                  <div style={{ fontSize:11, color:C.faint, marginTop:2 }}>{r.timestamp}</div>
                </div>
                <CopyBtn text={r.coverLetter} />
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

const VOICE_QUESTIONS = [
  { id:'tone', label:'How would you describe your communication style?', options:['Warm and conversational','Direct and professional','Casual and friendly','Formal and precise'] },
  { id:'humor', label:'Do you use humor in your writing?', options:['Yes, often','Sometimes','Rarely','Never'] },
  { id:'length', label:'How do you naturally write?', options:['Short and punchy','Medium — a few paragraphs','Detailed and thorough','Depends on the topic'] },
  { id:'openers', label:'How do you typically start messages?', options:['Jump straight in','A quick greeting first','Context before the point','With a question'] },
  { id:'values', label:'What matters most to you professionally?', options:['Getting things done','People and relationships','Learning and growth','Quality and precision'] },
]

function VoicePrintTab({ apiKey, keySaved, voiceProfile, onVoiceSaved }) {
  const [step, setStep] = useState(voiceProfile?'done':'build')
  const [samples, setSamples] = useState('')
  const [bannedPhrases, setBannedPhrases] = useState(voiceProfile?.bannedPhrases || '')
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resume, setResume] = useState(voiceProfile?.resume||'')
  const [resumeLoading, setResumeLoading] = useState(false)
  const fileRef = useRef()
  const allAnswered = VOICE_QUESTIONS.every(q=>answers[q.id])

  async function handleResumeFile(e) {
    const file=e.target.files[0]; if(!file) return
    setResumeLoading(true)
    try {
      if (file.type==='text/plain') { setResume(await file.text()) }
      else {
        const base64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file) })
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST', headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
          body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1500,messages:[{role:'user',content:[{type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},{type:'text',text:'Extract the full text of this resume exactly. Return only the text.'}]}]}),
        })
        const data=await resp.json(); setResume(data.content.map(b=>b.text||'').join('').trim())
      }
    } catch { alert('Could not read file. Try pasting instead.') }
    finally { setResumeLoading(false) }
  }

  async function buildProfile() {
    if (!keySaved) { alert('Save your API key first.'); return }
    if (!samples.trim()) { alert('Paste some writing samples first.'); return }
    if (!allAnswered) { alert('Answer all questions.'); return }
    setLoading(true); setError('')
    try {
      const answersText = VOICE_QUESTIONS.map(q=>q.label+'\nAnswer: '+answers[q.id]).join('\n\n')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:'Analyze this person\'s writing voice. Create a guide for writing cover letters that sound exactly like them.\n\nQUESTIONNAIRE:\n'+answersText+'\n\nWRITING SAMPLES:\n'+samples.substring(0,2000)+'\n\nWrite a voice guide (150 words max): tone, sentence rhythm, words they use, words they NEVER use (be specific — pull actual phrases from their writing to avoid), how they open and close, and never use emojis in cover letters or outreach messages. This banned list should reflect their actual voice, not generic AI advice.'}]}),
      })
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||'API error '+res.status) }
      const data=await res.json()
      onVoiceSaved({analysis:data.content.map(b=>b.text||'').join('').trim(),answers,resume,bannedPhrases})
      setStep('done')
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const btnStyle = sel => ({ padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans', sans-serif", transition:'all 0.15s', background:sel?C.dark:C.surface, color:sel?'#fff':C.muted, border:sel?`1px solid ${C.dark}`:`1px solid ${C.border}` })

  if (step==='done') return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', marginBottom:4 }}>VoicePrint <span style={{ color:C.cyan }}>▸</span></h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:24 }}>Your voice is active.</p>
      <div style={{ marginBottom:16, padding:'12px 18px', borderRadius:12, background:C.greenBg, border:`1px solid rgba(45,106,79,0.15)`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:13, fontWeight:500, color:C.green }}>✓ Voice profile active</span>
        <Btn small onClick={() => setStep('build')}>Update</Btn>
      </div>
      {voiceProfile?.analysis && <Card style={{ marginBottom:16 }}><Label>Your voice profile</Label><p style={{ fontSize:13, lineHeight:1.75 }}>{voiceProfile.analysis}</p></Card>}
      <Card>
        <Label>Your resume (used for job scoring)</Label>
        {voiceProfile?.resume ? (
          <div>
            <pre style={{ whiteSpace:'pre-wrap', fontSize:12, lineHeight:1.6, fontFamily:"'DM Sans', sans-serif", color:C.muted, background:C.surface2, padding:'12px 16px', borderRadius:10, border:`1px solid ${C.border}`, maxHeight:200, overflowY:'auto' }}>{voiceProfile.resume}</pre>
            <Btn small onClick={() => setStep('resume')} style={{ marginTop:12 }}>Update resume</Btn>
          </div>
        ) : <div><p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Add your resume to improve job scoring.</p><Btn primary onClick={() => setStep('resume')}>Add resume →</Btn></div>}
      </Card>
    </div>
  )

  if (step==='resume') return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', marginBottom:4 }}>Add your resume <span style={{ color:C.cyan }}>▸</span></h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:24 }}>Upload PDF or paste text. Used for job scoring only.</p>
      <div onClick={() => fileRef.current.click()} style={{ border:`2px dashed ${C.border}`, borderRadius:14, padding:32, textAlign:'center', cursor:'pointer', marginBottom:16 }}
        onMouseOver={e=>e.currentTarget.style.borderColor=C.cyan} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
        <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
        <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>{resumeLoading?'Reading PDF...':'Upload resume PDF'}</div>
        <div style={{ fontSize:12, color:C.faint }}>Click to browse — PDF or TXT</div>
        <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display:'none' }} onChange={handleResumeFile} />
      </div>
      <div style={{ textAlign:'center', fontSize:12, color:C.faint, marginBottom:14 }}>— or paste below —</div>
      <TextArea value={resume} onChange={e=>setResume(e.target.value)} rows={10} placeholder="Paste resume text here..." />
      <div style={{ display:'flex', gap:12, marginTop:16 }}>
        <Btn primary onClick={() => { onVoiceSaved({...voiceProfile,resume}); setStep('done') }} disabled={!resume.trim()}>Save resume →</Btn>
        <Btn onClick={() => setStep('done')}>Skip</Btn>
      </div>
    </div>
  )

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', marginBottom:4 }}>VoicePrint <span style={{ color:C.cyan }}>▸</span></h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:32 }}>Teach the app how you write so cover letters sound like you.</p>
      <div style={{ marginBottom:24 }}>
        <Label>Writing samples</Label>
        <p style={{ fontSize:12, color:C.muted, marginBottom:10, lineHeight:1.6 }}>Paste 3–5 things you've written — emails, LinkedIn posts, messages. The more natural the better.</p>
        <TextArea value={samples} onChange={e=>setSamples(e.target.value)} rows={8} placeholder="Paste your writing samples here..." />
      </div>
      <div style={{ marginBottom:24 }}>
        <Label>Phrases I never use (optional)</Label>
        <input
          value={bannedPhrases}
          onChange={e => setBannedPhrases(e.target.value)}
          placeholder="e.g. resonates with me, love this, speaks to me, circle back"
          style={{ width:'100%', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', fontSize:13, fontFamily:"'DM Sans', sans-serif", background:C.surface, color:C.text, outline:'none', boxSizing:'border-box' }}
        />
      </div>
      <div style={{ marginBottom:24 }}>
        <Label>A few quick questions</Label>
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {VOICE_QUESTIONS.map(q => (
            <div key={q.id}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:10 }}>{q.label}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {q.options.map(opt => <button key={opt} onClick={() => setAnswers(a=>({...a,[q.id]:opt}))} style={btnStyle(answers[q.id]===opt)}>{opt}</button>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {error && <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background:C.redBg, fontSize:13, color:C.red }}>{error}</div>}
      <Btn primary onClick={buildProfile} disabled={loading||!samples.trim()||!allAnswered}>{loading?'Building your voice profile...':<>Build VoicePrint <span style={{ color:C.cyan }}>▸</span></>}</Btn>
    </div>
  )
}

function HistoryTab({ history, onView }) {
  const ss = s => ({ fontSize:12, fontFamily:'monospace', padding:'3px 10px', borderRadius:20, background:s>=85?C.greenBg:s>=70?C.amberBg:C.redBg, color:s>=85?C.green:s>=70?C.amber:C.red })
  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', marginBottom:4 }}>History <span style={{ color:C.cyan }}>▸</span></h1>
      {!history.length ? <div style={{ textAlign:'center', padding:'64px 16px', color:C.faint, fontSize:14 }}>No jobs analyzed yet.</div> : (
        <>
          <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>{history.length} job{history.length!==1?'s':''} analyzed</p>
          <Card style={{ padding:0, overflow:'hidden' }}>
            {history.map((r,i) => (
              <div key={r.id||i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:i<history.length-1?`1px solid ${C.border}`:'none' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{r.jobTitle||'Unknown'} — {r.company||'Unknown'}</div>
                  <div style={{ fontSize:12, color:C.faint, marginTop:2 }}>{r.timestamp}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={ss(r.score)}>{r.score}%</span>
                  <Btn small onClick={() => onView(r)}>View</Btn>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}