import { useState, useRef } from 'react'

const NAV = ['Analyze', 'Documents', 'VoicePrint', 'History']

function loadStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

// ─── Design tokens matching s-rportfolio.vercel.app ──────────────────────────
const C = {
  bg: '#f5f4f0',
  surface: '#ffffff',
  surface2: '#f0efe9',
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.15)',
  text: '#1c1c1a',
  muted: '#6b6b64',
  faint: '#9e9e96',
  cyan: '#4ecdc4',
  cyanDim: 'rgba(78,205,196,0.12)',
  cyanBorder: 'rgba(78,205,196,0.3)',
  dark: '#1c1c1a',
  green: '#2d6a4f',
  greenBg: 'rgba(45,106,79,0.08)',
  red: '#9b2335',
  redBg: 'rgba(155,35,53,0.07)',
  amber: '#7a4f00',
  amberBg: 'rgba(122,79,0,0.07)',
}

export default function App() {
  const [tab, setTab] = useState('Analyze')
  const [apiKey, setApiKey] = useState(localStorage.getItem('va_key') || '')
  const [keySaved, setKeySaved] = useState(!!localStorage.getItem('va_key'))
  const [history, setHistory] = useState(() => loadStorage('va_history', []))
  const [voiceProfile, setVoiceProfile] = useState(() => loadStorage('va_voice', null))
  const [currentResult, setCurrentResult] = useState(null)

  function saveKey() {
    if (!apiKey.startsWith('sk-ant-')) { alert("Anthropic keys start with sk-ant-"); return }
    localStorage.setItem('va_key', apiKey)
    setKeySaved(true)
  }

  function onResult(result) {
    const entry = { ...result, timestamp: new Date().toLocaleString(), id: Date.now() }
    const updated = [entry, ...history].slice(0, 50)
    setHistory(updated)
    localStorage.setItem('va_history', JSON.stringify(updated))
    setCurrentResult(result)
  }

  function onVoiceSaved(profile) {
    setVoiceProfile(profile)
    localStorage.setItem('va_voice', JSON.stringify(profile))
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, minHeight: '100vh', color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, background: C.bg, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>VoiceApply</span>
            <span style={{ fontSize: 11, color: C.cyan, fontFamily: "'DM Mono', monospace" }}>✦ beta</span>
          </div>
          <nav style={{ display: 'flex', gap: 2 }}>
            {NAV.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                background: tab === t ? C.dark : 'transparent',
                color: tab === t ? '#fff' : C.muted,
                position: 'relative', transition: 'all 0.15s',
              }}>
                {t}
                {t === 'History' && history.length > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, background: C.cyanDim, color: C.cyan, padding: '1px 5px', borderRadius: 10, fontFamily: 'monospace' }}>{history.length}</span>
                )}
                {t === 'VoicePrint' && !voiceProfile && (
                  <span style={{ marginLeft: 5, fontSize: 10, background: C.amberBg, color: C.amber, padding: '1px 5px', borderRadius: 10 }}>!</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        {/* API Key */}
        {!keySaved && (
          <div style={{ marginBottom: 32, padding: '14px 18px', borderRadius: 12, background: C.amberBg, border: `1px solid rgba(122,79,0,0.15)`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.06em' }}>API Key</span>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()} placeholder="sk-ant-api03-..."
              style={{ flex: 1, minWidth: 200, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: "'DM Mono', monospace", color: C.text }} />
            <button onClick={saveKey} style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: C.surface, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
              Save key
            </button>
            <span style={{ fontSize: 11, color: C.faint, width: '100%' }}>Saved locally in your browser. Never sent anywhere except Anthropic's API.</span>
          </div>
        )}

        {keySaved && (
          <div style={{ marginBottom: 32, padding: '10px 16px', borderRadius: 12, background: C.greenBg, border: `1px solid rgba(45,106,79,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.green }}>✓ API key saved</span>
            <button onClick={() => { localStorage.removeItem('va_key'); setKeySaved(false); setApiKey('') }}
              style={{ fontSize: 12, color: C.faint, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Change</button>
          </div>
        )}

        {tab === 'Analyze' && <AnalyzeTab apiKey={apiKey} keySaved={keySaved} voiceProfile={voiceProfile} onResult={onResult} currentResult={currentResult} setCurrentResult={setCurrentResult} setTab={setTab} />}
        {tab === 'Documents' && <DocumentsTab history={history} />}
        {tab === 'VoicePrint' && <VoicePrintTab apiKey={apiKey} keySaved={keySaved} voiceProfile={voiceProfile} onVoiceSaved={onVoiceSaved} />}
        {tab === 'History' && <HistoryTab history={history} onView={r => { setCurrentResult(r); setTab('Analyze') }} />}
      </main>
    </div>
  )
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.faint, marginBottom: 8 }}>{children}</div>
}

function Card({ children, style = {} }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px', ...style }}>{children}</div>
}

function Pill({ children, color = C.text, bg = C.surface2 }) {
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: bg, color, fontFamily: "'DM Mono', monospace", display: 'inline-block' }}>{children}</span>
}

function Btn({ children, onClick, disabled, primary, small, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '6px 14px' : '11px 22px',
      borderRadius: 10, border: primary ? 'none' : `1px solid ${C.borderStrong}`,
      background: primary ? C.dark : C.surface,
      color: primary ? '#fff' : C.text,
      fontSize: small ? 12 : 14, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: "'DM Sans', sans-serif", opacity: disabled ? 0.45 : 1,
      transition: 'opacity 0.15s', ...style
    }}>{children}</button>
  )
}

function TextArea({ value, onChange, rows = 8, placeholder }) {
  return (
    <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} style={{
      width: '100%', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px',
      fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: C.surface, color: C.text,
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
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  )
}

// ─── Analyze Tab ──────────────────────────────────────────────────────────────
function AnalyzeTab({ apiKey, keySaved, voiceProfile, onResult, currentResult, setCurrentResult, setTab }) {
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [error, setError] = useState('')
  const msgs = ['Reading the job posting...', 'Checking for scam signals...', 'Scoring your skills match...', 'Writing your cover letter...', 'Almost done...']

  async function analyze() {
    if (!keySaved) { alert('Save your API key first.'); return }
    if (!jd.trim()) { alert('Paste a job description first.'); return }
    setLoading(true); setError(''); setCurrentResult(null)
    let mi = 0; setLoadMsg(msgs[0])
    const interval = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadMsg(msgs[mi]) }, 2500)
    try {
      const voiceSection = voiceProfile?.analysis
        ? `\n\nCANDIDATE VOICE PROFILE (use this to write the cover letter in their voice):\n${voiceProfile.analysis.substring(0, 800)}`
        : ''
      const resumeSection = voiceProfile?.resume
        ? `\n\nCANDIDATE RESUME:\n${voiceProfile.resume.substring(0, 1400)}`
        : ''
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2500,
          system: buildSystemPrompt(resumeSection, voiceSection),
          messages: [{ role: 'user', content: `Analyze this job posting:\n\n${jd}` }],
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `API error ${res.status}`) }
      const data = await res.json()
      const result = JSON.parse(data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim())
      onResult(result)
    } catch (e) { setError(e.message) }
    finally { clearInterval(interval); setLoading(false) }
  }

  return (
    <div>
      {!voiceProfile && (
        <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 12, background: C.amberBg, border: `1px solid rgba(122,79,0,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.amber }}>VoicePrint not set up</div>
            <div style={{ fontSize: 12, color: C.amber, opacity: 0.8, marginTop: 2 }}>Cover letters will be generic. Set up VoicePrint to make them sound like you.</div>
          </div>
          <Btn small onClick={() => setTab('VoicePrint')} style={{ whiteSpace: 'nowrap', background: C.amberBg, border: `1px solid rgba(122,79,0,0.2)`, color: C.amber }}>Set up →</Btn>
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Analyze a job <span style={{ color: C.cyan }}>✦</span></h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>Paste a job description. Get your match score, a cover letter in your voice, and an outreach message.</p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Label>Job description</Label>
        <TextArea value={jd} onChange={e => setJd(e.target.value)} rows={10} placeholder="Paste the full job description here — title, company, requirements..." />
      </div>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Btn primary onClick={analyze} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze job →'}</Btn>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
            <Dots />{loadMsg}
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 12, background: C.redBg, border: `1px solid rgba(155,35,53,0.15)`, fontSize: 13, color: C.red }}>
          <strong>Something went wrong:</strong> {error}
        </div>
      )}

      {currentResult && <ResultCard result={currentResult} />}
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ result: r }) {
  const scoreColor = r.score >= 85 ? C.green : r.score >= 70 ? C.amber : C.red
  const verdictConfig = {
    APPLY: { bg: C.greenBg, color: C.green, border: 'rgba(45,106,79,0.2)', label: 'Apply' },
    SKIP:  { bg: C.redBg,   color: C.red,   border: 'rgba(155,35,53,0.2)', label: 'Do not apply' },
    SCAM:  { bg: C.amberBg, color: C.amber, border: 'rgba(122,79,0,0.2)',  label: 'Likely scam — skip' },
  }[r.verdict] || { bg: C.surface2, color: C.muted, border: C.border, label: r.verdict }

  return (
    <div style={{ marginTop: 32 }}>
      <Card>
        {/* Score row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 16 }}>
          <span style={{ fontSize: 48, fontWeight: 300, fontFamily: "'DM Mono', monospace", color: scoreColor, lineHeight: 1 }}>{r.score}%</span>
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{r.jobTitle || 'Unknown role'}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{r.company || 'Unknown company'}</div>
          </div>
        </div>

        {/* Verdict pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600,
          padding: '5px 14px', borderRadius: 20, marginBottom: 12,
          background: verdictConfig.bg, color: verdictConfig.color, border: `1px solid ${verdictConfig.border}` }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {verdictConfig.label}
        </div>

        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>{r.verdictReason}</p>

        {/* Company snapshot */}
        {r.companySnapshot && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: C.cyanDim, borderLeft: `2px solid ${C.cyan}`, fontSize: 13, lineHeight: 1.65 }}>
            {r.companySnapshot}
          </div>
        )}

        {/* Scam flags */}
        {r.scamFlags?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Label>Scam signals</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.scamFlags.map(f => <Pill key={f} color={C.amber} bg={C.amberBg}>{f}</Pill>)}
            </div>
          </div>
        )}

        {/* Skills matched */}
        {r.matchedSkills?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Label>Skills matched</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.matchedSkills.map(s => <Pill key={s} color={C.green} bg={C.greenBg}>{s}</Pill>)}
            </div>
          </div>
        )}

        {/* Gaps */}
        {r.missingSkills?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Label>Gaps</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.missingSkills.map(s => <Pill key={s} color={C.red} bg={C.redBg}>{s}</Pill>)}
            </div>
          </div>
        )}

        {r.transferableNotes && (
          <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', marginBottom: 8, lineHeight: 1.65 }}>{r.transferableNotes}</p>
        )}

        {/* Accordions */}
        <div style={{ marginTop: 8 }}>
          {r.coverLetter && (
            <Accordion title="Cover letter">
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.75, fontFamily: "'DM Sans', sans-serif", color: C.text }}>{r.coverLetter}</pre>
              <CopyBtn text={r.coverLetter} />
            </Accordion>
          )}
          {r.projectIdea && (
            <Accordion title="Project idea">
              <div style={{ padding: '12px 16px', borderRadius: 10, background: C.cyanDim, borderLeft: `2px solid ${C.cyan}`, fontSize: 13, lineHeight: 1.65 }}>{r.projectIdea}</div>
            </Accordion>
          )}
          {r.outreachMessage && (
            <Accordion title="Outreach message">
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.75, fontFamily: "'DM Sans', sans-serif", color: C.text }}>{r.outreachMessage}</pre>
              <CopyBtn text={r.outreachMessage} />
            </Accordion>
          )}
        </div>
      </Card>
    </div>
  )
}

// ─── VoicePrint Tab ───────────────────────────────────────────────────────────
const VOICE_QUESTIONS = [
  { id: 'tone', label: 'How would you describe your communication style?', options: ['Warm and conversational', 'Direct and professional', 'Casual and friendly', 'Formal and precise'] },
  { id: 'humor', label: 'Do you use humor in your writing?', options: ['Yes, often', 'Sometimes', 'Rarely', 'Never'] },
  { id: 'length', label: 'How do you naturally write?', options: ['Short and punchy', 'Medium — a few paragraphs', 'Detailed and thorough', 'Depends on the topic'] },
  { id: 'openers', label: 'How do you typically start messages?', options: ['Jump straight in', 'A quick greeting first', 'Context before the point', 'With a question'] },
  { id: 'values', label: 'What matters most to you professionally?', options: ['Getting things done', 'People and relationships', 'Learning and growth', 'Quality and precision'] },
]

function VoicePrintTab({ apiKey, keySaved, voiceProfile, onVoiceSaved }) {
  const [step, setStep] = useState(voiceProfile ? 'done' : 'build')
  const [samples, setSamples] = useState('')
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resume, setResume] = useState(voiceProfile?.resume || '')
  const [resumeLoading, setResumeLoading] = useState(false)
  const fileRef = useRef()
  const allAnswered = VOICE_QUESTIONS.every(q => answers[q.id])

  async function handleResumeFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setResumeLoading(true)
    try {
      if (file.type === 'text/plain') {
        setResume(await file.text())
      } else {
        const base64 = await new Promise((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res(reader.result.split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(file)
        })
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 1500,
            messages: [{ role: 'user', content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: 'Extract the full text of this resume exactly as written. Return only the resume text, no commentary.' }
            ]}]
          }),
        })
        const data = await r.json()
        setResume(data.content.map(b => b.text || '').join('').trim())
      }
    } catch { alert('Could not read file. Try pasting your resume text instead.') }
    finally { setResumeLoading(false) }
  }

  async function buildProfile() {
    if (!keySaved) { alert('Save your API key first.'); return }
    if (!samples.trim()) { alert('Please paste some writing samples first.'); return }
    if (!allAnswered) { alert('Please answer all questions.'); return }
    setLoading(true); setError('')
    try {
      const answersText = VOICE_QUESTIONS.map(q => `${q.label}\nAnswer: ${answers[q.id]}`).join('\n\n')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 600,
          messages: [{ role: 'user', content: `Analyze this person's writing voice. Create a guide for writing cover letters that sound exactly like them.

QUESTIONNAIRE:
${answersText}

WRITING SAMPLES:
${samples.substring(0, 2000)}

Write a voice guide (150 words max):
- Tone and energy
- Sentence rhythm and length
- Words/phrases they actually use
- What to NEVER write (specific words and patterns to avoid)
- How they open and close

Be specific. Quote their actual patterns.` }]
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `API error ${res.status}`) }
      const data = await res.json()
      onVoiceSaved({ analysis: data.content.map(b => b.text || '').join('').trim(), answers, resume })
      setStep('done')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (step === 'done') return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>VoicePrint <span style={{ color: C.cyan }}>✦</span></h1>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Your voice is active. Cover letters will sound like you.</p>

      <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 12, background: C.greenBg, border: `1px solid rgba(45,106,79,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.green }}>✓ Voice profile active</span>
        <Btn small onClick={() => setStep('build')}>Update</Btn>
      </div>

      {voiceProfile?.analysis && (
        <Card style={{ marginBottom: 16 }}>
          <Label>Your voice profile</Label>
          <p style={{ fontSize: 13, lineHeight: 1.75, color: C.text }}>{voiceProfile.analysis}</p>
        </Card>
      )}

      <Card>
        <Label>Your resume</Label>
        {voiceProfile?.resume ? (
          <div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", color: C.muted, background: C.surface2, padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}`, maxHeight: 200, overflowY: 'auto' }}>{voiceProfile.resume}</pre>
            <Btn small onClick={() => setStep('resume')} style={{ marginTop: 12 }}>Update resume</Btn>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Add your resume so the app can score jobs against your actual skills.</p>
            <Btn primary onClick={() => setStep('resume')}>Add resume →</Btn>
          </div>
        )}
      </Card>
    </div>
  )

  if (step === 'resume') return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Add your resume <span style={{ color: C.cyan }}>✦</span></h1>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Upload your PDF or paste the text.</p>

      <div onClick={() => fileRef.current.click()} style={{
        border: `2px dashed ${C.border}`, borderRadius: 14, padding: '32px', textAlign: 'center',
        cursor: 'pointer', marginBottom: 16, transition: 'border-color 0.15s',
      }}
        onMouseOver={e => e.currentTarget.style.borderColor = C.cyan}
        onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{resumeLoading ? 'Reading PDF...' : 'Upload resume PDF'}</div>
        <div style={{ fontSize: 12, color: C.faint }}>Click to browse — PDF or TXT</div>
        <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleResumeFile} />
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: C.faint, marginBottom: 14 }}>— or paste below —</div>
      <TextArea value={resume} onChange={e => setResume(e.target.value)} rows={10} placeholder="Paste your resume text here..." />

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <Btn primary onClick={() => { onVoiceSaved({ ...voiceProfile, resume }); setStep('done') }} disabled={!resume.trim()}>Save resume →</Btn>
        <Btn onClick={() => setStep('done')}>Skip</Btn>
      </div>
    </div>
  )

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>VoicePrint <span style={{ color: C.cyan }}>✦</span></h1>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>Teach the app how you write so cover letters sound like you — not like AI.</p>

      {/* Buffer teaser */}
      <div style={{ marginBottom: 28, padding: '14px 18px', borderRadius: 12, background: C.surface2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Connect Buffer</span>
          <span style={{ fontSize: 11, color: C.cyan, marginLeft: 8, fontFamily: 'monospace' }}>✦ coming soon</span>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Pull your real posts automatically for a more accurate voice profile.</div>
        </div>
        <Btn small disabled style={{ color: C.faint }}>Connect →</Btn>
      </div>

      {/* Writing samples */}
      <div style={{ marginBottom: 24 }}>
        <Label>Writing samples</Label>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>Paste 3–5 things you've written — emails, LinkedIn posts, Slack messages. The more natural the better.</p>
        <TextArea value={samples} onChange={e => setSamples(e.target.value)} rows={8} placeholder="Paste your writing samples here..." />
      </div>

      {/* Questions */}
      <div style={{ marginBottom: 24 }}>
        <Label>A few quick questions</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {VOICE_QUESTIONS.map(q => (
            <div key={q.id}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{q.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {q.options.map(opt => (
                  <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))} style={{
                    padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                    background: answers[q.id] === opt ? C.dark : C.surface,
                    color: answers[q.id] === opt ? '#fff' : C.muted,
                    border: answers[q.id] === opt ? `1px solid ${C.dark}` : `1px solid ${C.border}`,
                  }}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: C.redBg, fontSize: 13, color: C.red }}>{error}</div>}

      <Btn primary onClick={buildProfile} disabled={loading || !samples.trim() || !allAnswered}>
        {loading ? 'Building your voice profile...' : 'Build VoicePrint ✦'}
      </Btn>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ history }) {
  const covers = history.filter(r => r.coverLetter)
  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Documents <span style={{ color: C.cyan }}>✦</span></h1>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Your cover letters — ready to copy.</p>
      {!covers.length ? (
        <div style={{ textAlign: 'center', padding: '64px 16px', color: C.faint, fontSize: 14 }}>
          No cover letters yet. Analyze a job that scores 85%+ and your cover letter will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {covers.map((r, i) => (
            <Card key={r.id || i}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.jobTitle} at {r.company}</div>
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{r.timestamp}</div>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'monospace', padding: '3px 10px', borderRadius: 20, background: r.score >= 85 ? C.greenBg : C.amberBg, color: r.score >= 85 ? C.green : C.amber }}>{r.score}%</span>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.75, fontFamily: "'DM Sans', sans-serif", background: C.surface2, padding: '16px', borderRadius: 10, border: `1px solid ${C.border}` }}>{r.coverLetter}</pre>
              <CopyBtn text={r.coverLetter} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ history, onView }) {
  const scoreStyle = s => ({ fontSize: 12, fontFamily: 'monospace', padding: '3px 10px', borderRadius: 20, background: s >= 85 ? C.greenBg : s >= 70 ? C.amberBg : C.redBg, color: s >= 85 ? C.green : s >= 70 ? C.amber : C.red })
  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>History <span style={{ color: C.cyan }}>✦</span></h1>
      {!history.length ? (
        <div style={{ textAlign: 'center', padding: '64px 16px', color: C.faint, fontSize: 14 }}>No jobs analyzed yet.</div>
      ) : (
        <>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>{history.length} job{history.length !== 1 ? 's' : ''} analyzed</p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {history.map((r, i) => (
              <div key={r.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < history.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.jobTitle || 'Unknown'} — {r.company || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{r.timestamp}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={scoreStyle(r.score)}>{r.score}%</span>
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

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(resumeSection, voiceSection) {
  return `You are a job match analyzer and cover letter writer.
${resumeSection}
${voiceSection}

SCORING: 0-100. 85+=APPLY+full output. 70-84=SKIP+no cover letter. <70=SKIP.
SCAM flags: no real company, vague duties, unusually high pay, MLM signals, asks personal/financial info, poor grammar.

OUTPUT — valid JSON only, no markdown, no preamble:
{"jobTitle":"","company":"","score":0,"verdict":"APPLY|SKIP|SCAM","verdictReason":"1-2 sentences","scamFlags":[],"companySnapshot":"2-3 sentences on company","matchedSkills":[],"missingSkills":[],"transferableNotes":"","coverLetter":"","projectIdea":"","outreachMessage":""}

COVER LETTER (score>=85 and verdict=APPLY only, 3 paragraphs, 250-350 words):
- Match the candidate's voice profile exactly — their rhythm, tone, word choices
- Warm but not gushing. Professional but human.
- NO em dashes. Ever.
- HARD BANNED — never use these words under any circumstances:
  perfectly, deeply, genuinely, passionate, thrilled, excited to, leverage, synergy,
  innovative, transformative, impactful, robust, utilize, perfect, particularly, ideally,
  uniquely, exceptionally, seamlessly, incredibly, proven track record, demonstrated ability,
  strong foundation, valuable asset, well-suited, well-positioned, deeply committed,
  dedicated to, I am eager, I am excited, it is with great pleasure, I would love to,
  I am writing to apply
- Short sentences. Specific details. Real language a real person would say out loud.
- Bridge gaps honestly — don't hide them, frame them with transferable experience
- End with a direct, simple call to action

OUTREACH: under 280 chars, warm, direct, references the specific role, sounds like a real person`
}