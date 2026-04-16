import { useState, useRef } from 'react'

const NAV = ['Analyze', 'Documents', 'VoicePrint', 'History']

function loadStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
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
    <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="min-h-screen bg-[#f7f6f3] text-[#1a1a18]">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <header className="border-b border-black/10 bg-[#f7f6f3] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#9e9e96] uppercase block">Beta</span>
            <span className="text-lg font-semibold tracking-tight">VoiceApply</span>
          </div>
          <nav className="flex gap-1">
            {NAV.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-[#1a1a18] text-white' : 'text-[#6b6b64] hover:text-[#1a1a18] hover:bg-black/5'}`}>
                {t}
                {t === 'History' && history.length > 0 && <span className="ml-1.5 text-[10px] bg-black/10 text-[#6b6b64] px-1.5 py-0.5 rounded-full">{history.length}</span>}
                {t === 'VoicePrint' && !voiceProfile && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">!</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {!keySaved && (
          <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">API Key</span>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()} placeholder="sk-ant-api03-..."
              className="flex-1 min-w-[200px] bg-transparent text-sm font-mono outline-none placeholder:text-[#9e9e96]" />
            <button onClick={saveKey} className="text-xs font-medium px-4 py-2 rounded-lg bg-white border border-black/15 hover:bg-gray-50 transition-all">Save key</button>
            <span className="text-xs text-[#9e9e96] w-full">Saved locally in your browser. Never sent anywhere except Anthropic's API.</span>
          </div>
        )}
        {keySaved && (
          <div className="mb-8 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between">
            <span className="text-xs font-medium text-green-700">✓ API key saved</span>
            <button onClick={() => { localStorage.removeItem('va_key'); setKeySaved(false); setApiKey('') }} className="text-xs text-[#9e9e96] hover:text-[#1a1a18]">Change</button>
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
      const voiceSection = voiceProfile?.analysis ? `\n\nCANDIDATE VOICE PROFILE (use this to write the cover letter):\n${voiceProfile.analysis.substring(0, 800)}` : ''
      const resumeSection = voiceProfile?.resume ? `\n\nCANDIDATE RESUME:\n${voiceProfile.resume.substring(0, 1400)}` : ''
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
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-amber-800">VoicePrint not set up</div>
            <div className="text-xs text-amber-600 mt-0.5">Cover letters will be generic. Set up VoicePrint to make them sound like you.</div>
          </div>
          <button onClick={() => setTab('VoicePrint')} className="text-xs font-medium px-3 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all whitespace-nowrap ml-4">Set up →</button>
        </div>
      )}
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Analyze a job</h1>
      <p className="text-sm text-[#6b6b64] mb-6">Paste a job description and get your match score, cover letter, and outreach message.</p>
      <label className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] block mb-2">Job description</label>
      <textarea value={jd} onChange={e => setJd(e.target.value)} rows={10}
        placeholder="Paste the full job description here — include the title, company, and all requirements..."
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed resize-y outline-none focus:border-black/25 transition-all placeholder:text-[#9e9e96]" />
      <button onClick={analyze} disabled={loading}
        className="mt-4 px-6 py-3 rounded-xl bg-[#1a1a18] text-white text-sm font-medium hover:opacity-85 transition-all disabled:opacity-50">
        {loading ? 'Analyzing...' : 'Analyze job →'}
      </button>
      {loading && (
        <div className="mt-6 flex items-center gap-3 text-sm text-[#6b6b64]">
          <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#9e9e96] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
          {loadMsg}
        </div>
      )}
      {error && <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"><strong>Something went wrong:</strong> {error}</div>}
      {currentResult && <ResultCard result={currentResult} />}
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
  const [step, setStep] = useState(voiceProfile ? 'done' : 'intro')
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
        const text = await file.text()
        setResume(text)
      } else {
        // For PDF: read as base64 and send to Claude to extract text
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
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [{ role: 'user', content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: 'Extract the full text of this resume exactly as written. Return only the resume text, no commentary.' }
            ]}]
          }),
        })
        const data = await r.json()
        setResume(data.content.map(b => b.text || '').join('').trim())
      }
    } catch (e) {
      alert('Could not read file. Try pasting your resume text instead.')
    } finally {
      setResumeLoading(false)
    }
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Analyze this person's writing voice. Create a concise guide for writing cover letters that sound exactly like them.

QUESTIONNAIRE:
${answersText}

WRITING SAMPLES:
${samples.substring(0, 2000)}

Write a voice guide (150 words max) covering:
- Tone and energy level
- Sentence length and rhythm  
- Words/phrases they actually use
- What to NEVER write (specific banned words and patterns from their samples)
- How they open and close

Be specific. Quote their actual patterns. This will be used to write cover letters.`
          }]
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `API error ${res.status}`) }
      const data = await res.json()
      const analysis = data.content.map(b => b.text || '').join('').trim()
      onVoiceSaved({ analysis, answers, resume })
      setStep('done')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (step === 'done') {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">VoicePrint</h1>
        <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between mb-6">
          <div>
            <div className="text-sm font-medium text-green-800">✓ Voice profile active</div>
            <div className="text-xs text-green-600 mt-0.5">Your cover letters will sound like you.</div>
          </div>
          <button onClick={() => setStep('intro')} className="text-xs px-3 py-2 rounded-lg border border-green-300 text-green-700 hover:bg-green-100 transition-all">Update</button>
        </div>
        {voiceProfile?.analysis && (
          <div className="bg-white rounded-2xl border border-black/10 p-5 mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] mb-3">Your voice profile</div>
            <p className="text-sm leading-relaxed text-[#1a1a18]">{voiceProfile.analysis}</p>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-black/10 p-5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] mb-3">Your resume</div>
          {voiceProfile?.resume ? (
            <div>
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-[#6b6b64] bg-[#f7f6f3] p-3 rounded-lg border border-black/8 max-h-48 overflow-y-auto">{voiceProfile.resume}</pre>
              <button onClick={() => setStep('resume')} className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-black/10 hover:bg-gray-50 transition-all">Update resume</button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#6b6b64] mb-3">Add your resume so the app can score jobs against your actual skills.</p>
              <button onClick={() => setStep('resume')} className="text-xs px-4 py-2 rounded-lg bg-[#1a1a18] text-white hover:opacity-85 transition-all">Add resume →</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'resume') {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Add your resume</h1>
        <p className="text-sm text-[#6b6b64] mb-6">Upload your resume PDF or paste the text.</p>

        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-black/15 rounded-xl p-8 text-center cursor-pointer hover:border-black/30 hover:bg-black/[0.02] transition-all mb-4">
          <div className="text-2xl mb-2">📄</div>
          <div className="text-sm font-medium mb-1">{resumeLoading ? 'Reading PDF...' : 'Upload resume PDF'}</div>
          <div className="text-xs text-[#9e9e96]">Click to browse — PDF or TXT</div>
          <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleResumeFile} />
        </div>

        <div className="text-center text-xs text-[#9e9e96] mb-4">— or paste text below —</div>

        <textarea value={resume} onChange={e => setResume(e.target.value)} rows={10}
          placeholder="Paste your resume text here..."
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed resize-y outline-none focus:border-black/25 transition-all placeholder:text-[#9e9e96]" />

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { onVoiceSaved({ ...voiceProfile, resume }); setStep('done') }}
            disabled={!resume.trim()}
            className="px-6 py-3 rounded-xl bg-[#1a1a18] text-white text-sm font-medium hover:opacity-85 transition-all disabled:opacity-50">
            Save resume →
          </button>
          <button onClick={() => setStep('done')} className="px-4 py-3 rounded-xl border border-black/10 text-sm text-[#6b6b64] hover:bg-black/5 transition-all">Skip</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">VoicePrint</h1>
      <p className="text-sm text-[#6b6b64] mb-8">Teach the app how you write so cover letters sound like you — not like AI.</p>

      <div className="mb-8 p-4 rounded-xl bg-[#f0efe9] border border-black/8 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Connect Buffer <span className="text-xs text-[#9e9e96] ml-1">Coming soon</span></div>
          <div className="text-xs text-[#6b6b64] mt-0.5">Pull your real posts automatically for a more accurate voice profile.</div>
        </div>
        <button disabled className="text-xs px-3 py-2 rounded-lg border border-black/10 text-[#9e9e96] cursor-not-allowed">Connect →</button>
      </div>

      <div className="mb-6">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] block mb-2">Writing samples</label>
        <p className="text-xs text-[#6b6b64] mb-3">Paste 3-5 things you've written — emails, LinkedIn posts, Slack messages, anything. The more natural the better.</p>
        <textarea value={samples} onChange={e => setSamples(e.target.value)} rows={8}
          placeholder="Paste your writing samples here..."
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed resize-y outline-none focus:border-black/25 transition-all placeholder:text-[#9e9e96]" />
      </div>

      <div className="mb-6 space-y-5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96]">A few quick questions</div>
        {VOICE_QUESTIONS.map(q => (
          <div key={q.id}>
            <div className="text-sm font-medium mb-2">{q.label}</div>
            <div className="flex flex-wrap gap-2">
              {q.options.map(opt => (
                <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                  className={`text-xs px-3 py-2 rounded-lg border transition-all ${answers[q.id] === opt ? 'bg-[#1a1a18] text-white border-[#1a1a18]' : 'border-black/10 text-[#6b6b64] hover:border-black/25 hover:text-[#1a1a18]'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <button onClick={buildProfile} disabled={loading || !samples.trim() || !allAnswered}
        className="px-6 py-3 rounded-xl bg-[#1a1a18] text-white text-sm font-medium hover:opacity-85 transition-all disabled:opacity-50">
        {loading ? 'Building your voice profile...' : 'Build VoicePrint →'}
      </button>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ result: r }) {
  const scoreColor = r.score >= 85 ? 'text-green-700' : r.score >= 70 ? 'text-amber-700' : 'text-red-700'
  const verdictStyle = { APPLY: 'bg-green-50 text-green-700 border-green-200', SKIP: 'bg-red-50 text-red-700 border-red-200', SCAM: 'bg-amber-50 text-amber-700 border-amber-200' }[r.verdict] || 'bg-gray-50 text-gray-700 border-gray-200'
  const verdictLabel = { APPLY: 'Apply', SKIP: 'Do not apply', SCAM: 'Likely scam — skip' }[r.verdict] || r.verdict
  return (
    <div className="mt-8 bg-white rounded-2xl border border-black/10 p-6">
      <div className="flex items-start gap-4 mb-4">
        <span className={`text-5xl font-light font-mono tracking-tight ${scoreColor}`}>{r.score}%</span>
        <div>
          <div className="font-semibold text-base">{r.jobTitle || 'Unknown role'}</div>
          <div className="text-sm text-[#6b6b64]">{r.company || 'Unknown company'}</div>
        </div>
      </div>
      <span className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border mb-3 ${verdictStyle}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />{verdictLabel}
      </span>
      <p className="text-sm text-[#6b6b64] leading-relaxed mb-4">{r.verdictReason}</p>
      {r.companySnapshot && <div className="mb-4 p-3 rounded-lg bg-blue-50 border-l-2 border-blue-300 text-sm leading-relaxed">{r.companySnapshot}</div>}
      {r.scamFlags?.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] mb-2">Scam signals</div>
          <div className="flex flex-wrap gap-1.5">{r.scamFlags.map(f => <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-mono">{f}</span>)}</div>
        </div>
      )}
      {r.matchedSkills?.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] mb-2">Skills matched</div>
          <div className="flex flex-wrap gap-1.5">{r.matchedSkills.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-mono">{s}</span>)}</div>
        </div>
      )}
      {r.missingSkills?.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] mb-2">Gaps</div>
          <div className="flex flex-wrap gap-1.5">{r.missingSkills.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-mono">{s}</span>)}</div>
        </div>
      )}
      {r.transferableNotes && <p className="text-sm text-[#6b6b64] italic mb-2 leading-relaxed">{r.transferableNotes}</p>}
      <div className="border-t border-black/8 mt-4">
        {r.coverLetter && <Accordion title="Cover letter"><pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{r.coverLetter}</pre><CopyButton text={r.coverLetter} /></Accordion>}
        {r.projectIdea && <Accordion title="Project idea"><p className="text-sm leading-relaxed p-3 bg-blue-50 rounded-lg border-l-2 border-blue-300">{r.projectIdea}</p></Accordion>}
        {r.outreachMessage && <Accordion title="Outreach message"><pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{r.outreachMessage}</pre><CopyButton text={r.outreachMessage} /></Accordion>}
      </div>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ history }) {
  const covers = history.filter(r => r.coverLetter)
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Documents</h1>
      <p className="text-sm text-[#6b6b64] mb-6">Your cover letters — ready to copy.</p>
      {!covers.length ? (
        <div className="text-center py-16 text-[#9e9e96] text-sm">No cover letters yet. Analyze a job that scores 85%+ and your cover letter will appear here.</div>
      ) : (
        <div className="space-y-4">
          {covers.map((r, i) => (
            <div key={r.id || i} className="bg-white rounded-2xl border border-black/10 p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-sm">{r.jobTitle} at {r.company}</div>
                  <div className="text-xs text-[#9e9e96] mt-0.5">{r.timestamp}</div>
                </div>
                <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${r.score >= 85 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{r.score}%</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-[#f7f6f3] p-4 rounded-xl border border-black/8">{r.coverLetter}</pre>
              <CopyButton text={r.coverLetter} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ history, onView }) {
  const badge = s => s >= 85 ? 'bg-green-50 text-green-700' : s >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">History</h1>
      {!history.length ? (
        <div className="text-center py-16 text-[#9e9e96] text-sm">No jobs analyzed yet.</div>
      ) : (
        <>
          <p className="text-sm text-[#6b6b64] mb-6">{history.length} job{history.length !== 1 ? 's' : ''} analyzed</p>
          <div className="bg-white rounded-2xl border border-black/10 divide-y divide-black/8">
            {history.map((r, i) => (
              <div key={r.id || i} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium">{r.jobTitle || 'Unknown'} — {r.company || 'Unknown'}</div>
                  <div className="text-xs text-[#9e9e96] mt-0.5">{r.timestamp}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full ${badge(r.score)}`}>{r.score}%</span>
                  <button onClick={() => onView(r)} className="text-xs px-3 py-1.5 rounded-lg border border-black/10 hover:bg-gray-50 transition-all">View</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function Accordion({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-black/8 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center py-3 text-sm font-medium text-left hover:text-[#6b6b64] transition-colors">
        {title}
        <span className={`text-xs text-[#9e9e96] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-black/10 bg-gray-50 hover:bg-gray-100 transition-all">
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
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

COVER LETTER rules (score>=85 and verdict=APPLY only, 3 paragraphs, 250-350 words):
- Use the candidate's voice profile above — match their exact tone, rhythm, and word choices
- Professional but human. Warm but not gushing.
- NO em dashes. Ever.
- HARD BANNED WORDS — do not use any of these under any circumstances:
  perfectly, deeply, genuinely, passionate, thrilled, excited to, leverage, synergy,
  innovative, transformative, impactful, robust, utilize, perfect, particularly, ideally,
  uniquely, exceptionally, seamlessly, incredibly, proven track record, demonstrated ability,
  strong foundation, valuable asset, well-suited, well-positioned, deeply committed,
  dedicated to, I am eager, I am excited, it is with great, I would love to
- Do not open with "I am writing to apply for"
- Short sentences. Specific details. Real language.
- Bridge gaps honestly — don't hide them, frame them
- End with a direct call to action, not a flowery close
- Structure: name/contact header, date, Dear [Hiring Manager Name], P1, P2, P3, Best regards / [Name]

OUTREACH: under 280 chars, warm, direct, references the specific role, sounds like a real person wrote it`
}