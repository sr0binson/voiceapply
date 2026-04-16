import { useState, useEffect } from 'react'

const NAV = ['Analyze', 'Documents', 'VoicePrint', 'History']

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('va_history') || '[]') } catch { return [] }
}

export default function App() {
  const [tab, setTab] = useState('Analyze')
  const [apiKey, setApiKey] = useState(localStorage.getItem('va_key') || '')
  const [keySaved, setKeySaved] = useState(!!localStorage.getItem('va_key'))
  const [history, setHistory] = useState(loadHistory)
  const [currentResult, setCurrentResult] = useState(null)

  function saveKey() {
    if (!apiKey.startsWith('sk-ant-')) {
      alert("That doesn't look right — Anthropic keys start with sk-ant-")
      return
    }
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

  function viewFromHistory(entry) {
    setCurrentResult(entry)
    setTab('Analyze')
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
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? 'bg-[#1a1a18] text-white' : 'text-[#6b6b64] hover:text-[#1a1a18] hover:bg-black/5'
                }`}
              >
                {t}
                {t === 'History' && history.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-black/10 text-[#6b6b64] px-1.5 py-0.5 rounded-full">{history.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {!keySaved && (
          <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder="sk-ant-api03-..."
              className="flex-1 min-w-[200px] bg-transparent text-sm font-mono outline-none text-[#1a1a18] placeholder:text-[#9e9e96]"
            />
            <button onClick={saveKey} className="text-xs font-medium px-4 py-2 rounded-lg bg-white border border-black/15 hover:bg-gray-50 transition-all">
              Save key
            </button>
            <span className="text-xs text-[#9e9e96] w-full">Saved locally in your browser. Never sent anywhere except Anthropic's API.</span>
          </div>
        )}

        {keySaved && (
          <div className="mb-8 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between">
            <span className="text-xs font-medium text-green-700">✓ API key saved</span>
            <button onClick={() => { localStorage.removeItem('va_key'); setKeySaved(false); setApiKey('') }} className="text-xs text-[#9e9e96] hover:text-[#1a1a18]">Change</button>
          </div>
        )}

        {tab === 'Analyze' && <AnalyzeTab apiKey={apiKey} keySaved={keySaved} onResult={onResult} currentResult={currentResult} setCurrentResult={setCurrentResult} />}
        {tab === 'Documents' && <DocumentsTab history={history} />}
        {tab === 'VoicePrint' && <VoicePrintTab />}
        {tab === 'History' && <HistoryTab history={history} onView={viewFromHistory} />}
      </main>
    </div>
  )
}

function AnalyzeTab({ apiKey, keySaved, onResult, currentResult, setCurrentResult }) {
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [error, setError] = useState('')

  const msgs = ['Reading the job posting...', 'Checking for scam signals...', 'Scoring your skills match...', 'Writing your cover letter...', 'Almost done...']

  async function analyze() {
    if (!keySaved) { alert('Save your API key first.'); return }
    if (!jd.trim()) { alert('Paste a job description first.'); return }
    setLoading(true)
    setError('')
    setCurrentResult(null)
    let mi = 0
    setLoadMsg(msgs[0])
    const interval = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadMsg(msgs[mi]) }, 2500)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Analyze this job posting:\n\n${jd}` }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `API error ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content.map(b => b.text || '').join('')
      const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
      onResult(result)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Analyze a job</h1>
      <p className="text-sm text-[#6b6b64] mb-6">Paste a job description and get your match score, cover letter, and outreach message.</p>
      <label className="text-[10px] font-semibold uppercase tracking-widest text-[#9e9e96] block mb-2">Job description</label>
      <textarea
        value={jd}
        onChange={e => setJd(e.target.value)}
        rows={10}
        placeholder="Paste the full job description here..."
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed resize-y outline-none focus:border-black/25 transition-all placeholder:text-[#9e9e96]"
      />
      <button onClick={analyze} disabled={loading} className="mt-4 px-6 py-3 rounded-xl bg-[#1a1a18] text-white text-sm font-medium hover:opacity-85 transition-all disabled:opacity-50">
        {loading ? 'Analyzing...' : 'Analyze job →'}
      </button>
      {loading && (
        <div className="mt-6 flex items-center gap-3 text-sm text-[#6b6b64]">
          <div className="flex gap-1">
            {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#9e9e96] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
          {loadMsg}
        </div>
      )}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <strong>Something went wrong:</strong> {error}
        </div>
      )}
      {currentResult && <ResultCard result={currentResult} />}
    </div>
  )
}

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
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {verdictLabel}
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

function DocumentsTab({ history }) {
  const lastWithCover = history.find(r => r.coverLetter)
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Documents</h1>
      <p className="text-sm text-[#6b6b64] mb-6">Your cover letters — ready to copy or download.</p>
      {!lastWithCover ? (
        <div className="text-center py-16 text-[#9e9e96] text-sm">No cover letters yet. Analyze a job that scores 85%+ and your cover letter will appear here.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/10 p-6">
          <div className="text-xs text-[#9e9e96] mb-1">Most recent cover letter</div>
          <div className="font-medium mb-1">{lastWithCover.jobTitle} at {lastWithCover.company}</div>
          <div className="text-xs text-[#9e9e96] mb-4">{lastWithCover.timestamp}</div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-[#f7f6f3] p-4 rounded-xl border border-black/8">{lastWithCover.coverLetter}</pre>
          <CopyButton text={lastWithCover.coverLetter} />
        </div>
      )}
    </div>
  )
}

function VoicePrintTab() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">VoicePrint</h1>
      <p className="text-sm text-[#6b6b64] mb-6">Teach the app how you write so cover letters sound like you — not like AI.</p>
      <div className="text-center py-16 text-[#9e9e96] text-sm">Coming soon — paste writing samples or answer a few questions to build your voice profile.</div>
    </div>
  )
}

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
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-black/10 bg-gray-50 hover:bg-gray-100 transition-all"
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}

const SYSTEM_PROMPT = `You are a job match analyzer and cover letter writer for a job seeker.

SCORING: 0-100. 85+=APPLY+full output. 70-84=SKIP+no cover letter. <70=SKIP.
SCAM flags: no real company, vague duties, unusually high pay, MLM signals, asks personal/financial info, poor grammar.

OUTPUT — valid JSON only, no markdown, no preamble:
{"jobTitle":"","company":"","score":0,"verdict":"APPLY|SKIP|SCAM","verdictReason":"1-2 sentences","scamFlags":[],"companySnapshot":"2-3 sentences on company","matchedSkills":[],"missingSkills":[],"transferableNotes":"","coverLetter":"","projectIdea":"","outreachMessage":""}

COVER LETTER (score>=85 and verdict=APPLY only, 3 paragraphs, 250-350 words):
- Professional, warm, plain language. No em dashes. No buzzwords.
- BANNED: deeply resonates, genuinely, passionate, thrilled, leverage, synergy, innovative, transformative, proven track record, well-suited
- Don't open with "I am writing to apply for"
- Bridge gaps honestly. End with a clear call to action.

OUTREACH: under 280 chars, warm, direct, references the specific role`