import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
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
  gapPanelBg: 'rgba(78,205,196,0.14)',
  gapPanelBorder: 'rgba(55,175,165,0.32)',
  gapPanelTitle: '#2a756e',
  projectPanelBg: 'rgba(45,106,79,0.11)',
  projectPanelBorder: 'rgba(34,88,62,0.26)',
  projectPanelTitle: '#1e4a33',
  letterPanelBg: 'rgba(58,72,88,0.06)',
  letterPanelBorder: 'rgba(58,72,88,0.18)',
  letterPanelTitle: '#4a5565',
  connectPanelBg: 'rgba(122,95,60,0.09)',
  connectPanelBorder: 'rgba(122,95,60,0.24)',
  connectPanelTitle: '#5c4a26',
  kitResumeBg: '#faf9f7',
  kitCoverBg: '#f3f1ed',
  /** Tailored resume typography (darkest name → lighter headline → section titles) */
  resumeName: '#0a0a09',
  resumeHeadline: '#6a6a64',
  resumeSectionTitle: '#2c2c28',
  resumeBody: '#1c1c1a',
  resumeLinkCyan: '#157a73',
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
function CopyBtn({ text, style: styleProp = {} }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{
        marginTop: 10, fontSize: 12, padding: '6px 14px', borderRadius: 8, minHeight: 32, boxSizing: 'border-box',
        border: `1px solid ${C.border}`, background: C.surface2, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: C.muted,
        ...styleProp,
      }}>
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}

const KIT_ACTION_BTN = {
  fontSize: 12,
  padding: '6px 14px',
  minHeight: 32,
  boxSizing: 'border-box',
  borderRadius: 8,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  cursor: 'pointer',
}

function CyanMicroTriangle({ open }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 0,
        height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderLeft: `8px solid ${C.cyan}`,
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.2s ease',
        transformOrigin: 'center',
        flexShrink: 0,
      }}
      aria-hidden
    />
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

function generateCoverLetterPDF(fullText) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 72, pageW = 612, contentW = pageW - margin * 2
  let y = margin
  const lineH = 16
  const text = fullText || ''
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(28, 28, 26)
  for (const line of text.split('\n')) {
    if (line === '') { y += lineH * 0.5; continue }
    doc.splitTextToSize(line, contentW).forEach(w => {
      if (y > 720) { doc.addPage(); y = margin }
      doc.text(w, margin, y); y += lineH
    })
  }
  const firstLine = text.split('\n').find(l => l.trim()) || 'Cover_Letter'
  doc.save(`${firstLine.replace(/\s+/g, '_').slice(0, 50)}_Cover_Letter.pdf`)
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

function qualifiesForApplyLetterOutputs(r, matchThreshold) {
  if (!r) return false
  const th = Number.isFinite(Number(matchThreshold)) ? Math.max(0, Math.min(100, Number(matchThreshold))) : 85
  const scoreN = Number(r.score)
  return r.applyAnyway === true || (Number.isFinite(scoreN) && scoreN >= th)
}

const KIT_TAILORED_RESUME_PREFIX = 'va_kit_tailored_resume_'

function resumeLineLooksSection(trimmed) {
  return (
    trimmed.length >= 3 &&
    trimmed.length <= 52 &&
    trimmed === trimmed.toUpperCase() &&
    /^[A-Z0-9\s&/().,'+\-]+$/.test(trimmed) &&
    trimmed.split(/\s+/).length <= 6
  )
}

/** Which section we're in for tailored resume layout (experience = title/date rows). */
function resumeSectionId(headerLine) {
  const u = String(headerLine || '').toUpperCase()
  if (/\bSKILLS\b/.test(u) || /\bCOMPETENCIES\b/.test(u)) return 'skills'
  if (/\bEXPERIENCE\b/.test(u) || /\bEMPLOYMENT\b/.test(u) || /\bWORK HISTORY\b/.test(u)) return 'experience'
  if (/\bPROJECTS?\b/.test(u)) return 'projects'
  if (/\bEDUCATION\b/.test(u) || /\bCERTIFICATIONS?\b/.test(u) || /\bACADEMIC\b/.test(u)) return 'education'
  return 'other'
}

function looksLikeDateFragment(s) {
  const t = String(s || '').trim()
  if (!t) return false
  return (
    /\d{4}/.test(t) &&
    /(Present|Current|Ongoing|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{4})/i.test(t)
  )
}

/** Split job title (bold left) from date range (italic right); use 2+ spaces or tab in source when possible. */
function splitTitleAndDates(line) {
  const t = String(line || '').trim()
  if (!t) return { title: '', dates: null }
  const byGap = t.split(/\s{2,}|\t+/)
  if (byGap.length >= 2) {
    const dates = byGap[byGap.length - 1].trim()
    const title = byGap.slice(0, -1).join(' ').trim()
    if (looksLikeDateFragment(dates)) return { title, dates }
  }
  const monthStart = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/i
  let best = -1
  let m
  while ((m = monthStart.exec(t)) !== null) best = m.index
  if (best > 0) return { title: t.slice(0, best).trim(), dates: t.slice(best).trim() }
  const y = t.search(/\b(20\d{2}|19\d{2})\s*[–—-]\s*/)
  if (y > 0) return { title: t.slice(0, y).trim(), dates: t.slice(y).trim() }
  return { title: t, dates: null }
}

function normalizeContactForDisplay(raw) {
  const s = Array.isArray(raw) ? raw.join(' | ') : String(raw || '')
  return s
    .split(/\s*[|•]\s*/)
    .map(x => x.trim())
    .filter(Boolean)
    .join('  •  ')
}

/** Multiple title phrases → single line with pipes. */
function normalizeHeadlineDisplay(headline) {
  let h = String(headline || '').trim()
  if (!h) return ''
  if (!h.includes('|')) {
    h = h
      .split(/\s*\/\s*/)
      .map(s => s.trim())
      .filter(Boolean)
      .join(' | ')
  }
  if (!h.includes('|') && /,/.test(h)) {
    h = h
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .join(' | ')
  }
  return h
}

/** Contact line only: email + http(s)/www — phones stay plain text (not links, not underlined). */
const LINKIFY_CONTACT_RE = /(https?:\/\/[^\s|•]+|www\.[^\s|•]+|[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,})/gi

const linkStyleContact = {
  color: C.resumeLinkCyan,
  textDecoration: 'underline',
  display: 'inline-block',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
}

function linkifyContactLine(text) {
  const s = String(text || '')
  if (!s) return null
  const out = []
  let last = 0
  let m
  const re = new RegExp(LINKIFY_CONTACT_RE.source, 'gi')
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index))
    const token = m[0]
    const isEmail = /^[\w.%+-]+@/.test(token)
    let href = token
    if (isEmail) href = `mailto:${token}`
    else if (/^www\./i.test(token)) href = `https://${token}`
    out.push(
      <a
        key={`lc-${m.index}-${out.length}`}
        href={href}
        {...(isEmail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        style={linkStyleContact}
      >
        {token}
      </a>,
    )
    last = m.index + token.length
  }
  if (last < s.length) out.push(s.slice(last))
  return out.length ? out : s
}

/** Name (bold 25 darkest), headline (12 bold medium grey), contact — links only for email & sites. */
function TailoredResumeFirstHeader({ paraLines }) {
  const lines = paraLines.map(l => l.trim()).filter(Boolean)
  if (!lines.length) return null
  const contactBlock = (raw) => {
    const joined = normalizeContactForDisplay(raw)
    return (
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.55,
          fontWeight: 400,
          color: C.resumeBody,
          wordBreak: 'normal',
          overflowWrap: 'break-word',
        }}
      >
        {linkifyContactLine(joined)}
      </div>
    )
  }
  const nameStyle = {
    fontSize: 25,
    fontWeight: 700,
    lineHeight: 1.2,
    color: C.resumeName,
    letterSpacing: '-0.02em',
  }
  const headlineStyle = {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.45,
    color: C.resumeHeadline,
    marginBottom: 6,
  }
  if (lines.length === 1) {
    return (
      <div style={{ width: '100%', margin: '0 0 14px', textAlign: 'left' }}>
        <div style={{ ...nameStyle, marginBottom: 0 }}>{lines[0]}</div>
      </div>
    )
  }
  if (lines.length === 2) {
    return (
      <div style={{ width: '100%', margin: '0 0 14px', textAlign: 'left' }}>
        <div style={{ ...nameStyle, marginBottom: 6 }}>{lines[0]}</div>
        {contactBlock(lines[1])}
      </div>
    )
  }
  const name = lines[0]
  const contactLine = lines[lines.length - 1]
  const headline = normalizeHeadlineDisplay(lines.slice(1, -1).join(' | '))
  return (
    <div style={{ width: '100%', margin: '0 0 16px', textAlign: 'left' }}>
      <div style={{ ...nameStyle, marginBottom: 4 }}>{name}</div>
      {headline ? <div style={headlineStyle}>{headline}</div> : null}
      {contactBlock(contactLine)}
    </div>
  )
}

/** Experience: bold title (11) + italic dates right-aligned in a column; company lines below. */
function TailoredExperienceParagraph({ paraLines }) {
  if (!paraLines.length) return null
  const first = paraLines[0].trim()
  const rest = paraLines.slice(1).map(l => l.trim()).filter(Boolean)
  const { title, dates } = splitTitleAndDates(first)
  return (
    <div style={{ margin: '0 0 12px', textAlign: 'left' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(148px, max-content)',
          columnGap: 28,
          alignItems: 'baseline',
          marginBottom: rest.length ? 3 : 5,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 11, color: C.resumeBody, lineHeight: 1.35 }}>{title}</span>
        {dates ? (
          <span
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 11,
              color: C.resumeBody,
              textAlign: 'right',
              whiteSpace: 'nowrap',
              lineHeight: 1.35,
            }}
          >
            {dates}
          </span>
        ) : (
          <span />
        )}
      </div>
      {rest.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: 11,
            fontWeight: 400,
            lineHeight: 1.45,
            color: C.resumeBody,
            marginBottom: i < rest.length - 1 ? 2 : 0,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  )
}

/** Projects / Education: first line is title (bold); following lines body. */
function TailoredTitleBodyParagraph({ paraLines }) {
  if (!paraLines.length) return null
  const first = paraLines[0].trim()
  const rest = paraLines.slice(1).map(l => l.trim()).filter(Boolean)
  return (
    <div style={{ margin: '0 0 12px', textAlign: 'left' }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 11,
          color: C.resumeBody,
          lineHeight: 1.35,
          marginBottom: rest.length ? 4 : 0,
        }}
      >
        {first}
      </div>
      {rest.length > 0 ? (
        <div style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.45, color: C.resumeBody, whiteSpace: 'pre-line' }}>
          {rest.join('\n')}
        </div>
      ) : null}
    </div>
  )
}

/** ~0.5in outer padding; section headers + bullet lists; merged body lines to avoid odd gaps */
function TailoredResumeView({ text, paperBg = C.kitResumeBg }) {
  const body = String(text || '').trim()
  if (!body) {
    return (
      <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.55 }}>
        Your tailored resume will appear here after generation.
      </p>
    )
  }
  const lines = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const nodes = []
  let bulletBuf = []
  let isFirstContactBlock = true
  /** Last ALL-CAPS section seen — drives skills layout and experience job rows. */
  let activeSectionId = null
  const flushBullets = () => {
    if (!bulletBuf.length) return
    if (activeSectionId === 'skills') {
      nodes.push(
        <div
          key={`b-${nodes.length}`}
          style={{
            margin: '0 0 12px 0',
            fontSize: 11,
            lineHeight: 1.65,
            color: C.resumeBody,
          }}
        >
          {bulletBuf.map((item, i) => (
            <span key={i}>
              {item.trim()}
              {i < bulletBuf.length - 1 && (
                <span style={{ color: C.resumeHeadline, userSelect: 'none', fontSize: 10 }} aria-hidden>
                  {' '}
                  •{' '}
                </span>
              )}
            </span>
          ))}
        </div>,
      )
    } else {
      nodes.push(
        <ul
          key={`b-${nodes.length}`}
          style={{
            margin: '0 0 12px 0',
            padding: '0 0 0 1.1em',
            listStyleType: 'disc',
            listStylePosition: 'outside',
            fontSize: 11,
            lineHeight: 1.48,
            color: C.resumeBody,
          }}
        >
          {bulletBuf.map((item, i) => (
            <li key={i} style={{ marginBottom: 6, paddingLeft: 2 }}>{item}</li>
          ))}
        </ul>,
      )
    }
    bulletBuf = []
  }
  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      flushBullets()
      i++
      continue
    }
    const isBullet = /^[-*•▪]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)
    if (isBullet) {
      const bulletText = trimmed.replace(/^[-*•▪]\s*/, '').replace(/^\d+[.)]\s+/, '')
      bulletBuf.push(bulletText)
      i++
      continue
    }
    flushBullets()
    if (resumeLineLooksSection(trimmed)) {
      activeSectionId = resumeSectionId(trimmed)
      nodes.push(
        <div
          key={`s-${nodes.length}`}
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: C.resumeSectionTitle,
            marginTop: nodes.length ? 12 : 0,
            marginBottom: 8,
            padding: 0,
            paddingBottom: 0,
            lineHeight: 1.15,
            borderBottom: `1px solid ${C.borderStrong}`,
          }}
        >
          {trimmed}
        </div>,
      )
      i++
      continue
    }
    const paraLines = [trimmed]
    i++
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t) break
      if (/^[-*•▪]\s/.test(t) || /^\d+[.)]\s/.test(t)) break
      if (resumeLineLooksSection(t)) break
      paraLines.push(t)
      i++
    }
    nodes.push(
      isFirstContactBlock ? (
        <TailoredResumeFirstHeader key={`p-${nodes.length}`} paraLines={paraLines} />
      ) : activeSectionId === 'experience' ? (
        <TailoredExperienceParagraph key={`p-${nodes.length}`} paraLines={paraLines} />
      ) : activeSectionId === 'projects' || activeSectionId === 'education' ? (
        <TailoredTitleBodyParagraph key={`p-${nodes.length}`} paraLines={paraLines} />
      ) : (
        <p
          key={`p-${nodes.length}`}
          style={{
            margin: '0 auto 10px',
            maxWidth: '100%',
            fontSize: 11.5,
            lineHeight: 1.48,
            color: C.resumeBody,
            whiteSpace: 'pre-line',
          }}
        >
          {paraLines.join('\n')}
        </p>
      ),
    )
    isFirstContactBlock = false
  }
  flushBullets()
  return (
    <article
      style={{
        padding: '28px 32px 24px',
        background: paperBg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 'min(100%, 680px)',
        margin: '0 auto',
        overflowX: 'auto',
        fontFamily: "'DM Sans', sans-serif",
        textAlign: 'left',
        color: C.resumeBody,
      }}
    >
      {nodes}
    </article>
  )
}

function collapsibleChevronStyle(open) {
  return {
    fontSize: 9,
    color: C.cyan,
    lineHeight: 1,
    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease',
    transformOrigin: 'center',
  }
}

function kitFetchMessages(apiKey, system, userContent, maxTokens = 3500) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
}

function KitActionRow({
  onRegenerate,
  regenDisabled,
  regenLabel,
  copyText,
  onEditInContent,
  editOpen,
  editValue,
  onEditChange,
  greigeBg,
}) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
        <button
          type="button"
          disabled={regenDisabled}
          onClick={onRegenerate}
          style={{
            ...KIT_ACTION_BTN,
            border: 'none',
            background: C.dark,
            color: '#fff',
            opacity: regenDisabled ? 0.45 : 1,
            cursor: regenDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {regenLabel}
        </button>
        <CopyBtn text={copyText} style={{ marginTop: 0, minHeight: 32 }} />
        <button
          type="button"
          onClick={onEditInContent}
          style={{
            ...KIT_ACTION_BTN,
            border: `1px solid ${C.borderStrong}`,
            background: C.surface,
            color: C.text,
          }}
        >
          {editOpen ? 'Close editor' : 'Edit in Content'}
        </button>
      </div>
      {editOpen && (
        <textarea
          value={editValue}
          onChange={e => onEditChange(e.target.value)}
          rows={12}
          style={{
            width: '100%',
            marginTop: 12,
            boxSizing: 'border-box',
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.65,
            background: greigeBg,
            color: C.text,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      )}
    </>
  )
}

function MyResumePlusSection({ r, voiceProfile, apiKey, keySaved, allowApplyOutputs, showCoverLetter, showOutreach, embedded }) {
  const storageKey = KIT_TAILORED_RESUME_PREFIX + String(r?.id ?? `${r?.jobTitle || ''}_${r?.company || ''}`.replace(/\s/g, '_'))
  const [mainOpen, setMainOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [tailored, setTailored] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [resumeVar, setResumeVar] = useState(0)
  const [coverText, setCoverText] = useState('')
  const [coverLoading, setCoverLoading] = useState(false)
  const [coverErr, setCoverErr] = useState('')
  const [coverVar, setCoverVar] = useState(0)
  const [coverRegenCount, setCoverRegenCount] = useState(0)
  const [connectText, setConnectText] = useState('')
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectErr, setConnectErr] = useState('')
  const [connectVar, setConnectVar] = useState(0)
  const [connectRegenCount, setConnectRegenCount] = useState(0)
  const [resumeEdit, setResumeEdit] = useState(false)
  const [coverEdit, setCoverEdit] = useState(false)
  const [connectEdit, setConnectEdit] = useState(false)
  const autoGenAttemptedRef = useRef(null)

  useEffect(() => {
    setMainOpen(false)
    setConnectOpen(false)
    setCoverOpen(false)
    setResumeOpen(false)
    setResumeEdit(false)
    setCoverEdit(false)
    setConnectEdit(false)
    autoGenAttemptedRef.current = null
    setResumeVar(0)
    setCoverVar(0)
    setCoverRegenCount(0)
    setConnectVar(0)
    setConnectRegenCount(0)
    try {
      setTailored(sessionStorage.getItem(storageKey) || '')
    } catch {
      setTailored('')
    }
    setCoverText(String(r?.coverLetter || ''))
    setConnectText(String(r?.outreachMessage || ''))
  }, [storageKey, r?.coverLetter, r?.outreachMessage])

  const jdText = String(r?.analyzedJobPosting || '').trim()
  const jdUrl = String(r?.jobPostingUrl || '').trim()
  const jdBlock = jdText || (jdUrl ? `Job listing URL:\n${jdUrl}` : '')
  const jobLine = `${r?.jobTitle || 'Role'} · ${r?.company || 'Company'}`
  const sourceResume = String(voiceProfile?.resume || '').trim()
  const canGenerate = !!sourceResume && (!!jdBlock || !!(r?.jobTitle || r?.company))
  const gapsLine = (Array.isArray(r?.missingSkills) ? r.missingSkills : []).filter(Boolean).join(', ')
  const transferNotes = String(r?.transferableNotes || '').trim()
  const voiceSec = voiceProfile?.analysis
    ? '\n\nVOICEPRINT (tone and wording only — do not add facts from here):\n' + String(voiceProfile.analysis).slice(0, 1400)
    : ''

  const generateTailoredResume = useCallback(async (variationRound = 0, isRegenerate = false) => {
    if (!keySaved || !apiKey) {
      alert('Save your API key first.')
      return
    }
    if (!sourceResume) {
      alert('Add your resume in VoicePrint first.')
      return
    }
    if (!jdBlock && !r?.jobTitle) {
      alert('Re-run analysis with the job description pasted in (or a job URL) so we can tailor your resume.')
      return
    }
    setLoading(true)
    setErr('')
    try {
      const gapsSec = gapsLine
        ? '\n\nSKILL GAPS IDENTIFIED FOR THIS JOB (honest framing only — rephrase existing experience toward these themes; do NOT claim new tools, years, or credentials):\n' + gapsLine + '\n'
        : ''
      const transferSec = transferNotes
        ? '\n\nTRANSFERABLE / GAP-BRIDGING NOTES FROM ANALYSIS (use for wording and emphasis only; every fact must still appear in the source resume):\n' + transferNotes.slice(0, 6000) + '\n'
        : ''
      const varHint =
        isRegenerate
          ? `\n\nREGENERATION — idea ${variationRound + 1} of 3: meaningfully different layout or bullet emphasis; SAME facts as source resume only. No new employers, dates, tools, or metrics.\n`
          : ''
      const userContent =
        'Target role: ' + jobLine + '\n\n' +
        (jdBlock ? 'JOB DESCRIPTION (prioritize alignment; do not invent qualifications):\n' + jdBlock.slice(0, 8000) + '\n\n' : '') +
        gapsSec +
        transferSec +
        varHint +
        'SOURCE RESUME — sole source of truth for facts (employers, dates, titles, education, tools, metrics). Do not add, remove, or alter facts:\n' +
        sourceResume.slice(0, 12000) +
        voiceSec +
        '\n\nTASK: Produce a tailored resume for this job using ONLY information supported by the source resume. You may reorder sections, emphasize relevant bullets, and use honest transferable phrasing suggested by the gap notes and job description — without inventing experience.\n' +
        'FORMAT (plain text, no markdown), all left-aligned in spirit:\n' +
        '- Header before SUMMARY: line 1 = full name only; middle line(s) = professional headline with each title phrase separated by | (example: IT Support | Help Desk | Automation); last line of header = contact ONLY in this order when available: City/Location • phone as 555-555-5555 • email • https:// URLs for LinkedIn/portfolio (use • between items). Full https:// links for websites.\n' +
        '- Section order (skip empty sections; ALL-CAPS section title alone on its own line): SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION & CERTIFICATIONS.\n' +
        '- EXPERIENCE: For each role, line 1 = job title (bold in UI) then TWO OR MORE spaces (or a tab) then the date range (e.g. March 2021 – Present). Line 2 = Company — Location (plain). Then bullet lines with "- " for achievements. Repeat for each job.\n' +
        '- Aim for one page for entry-level / early-career: concise bullets, tight wording.\n' +
        '- Blank line between sections. In SKILLS, one skill per "- " line (short phrase).\n' +
        '- No emoji, tables, or decorative characters.\n' +
        'Return ONLY the resume text.'

      const res = await kitFetchMessages(
        apiKey,
        'You edit resumes for specific job postings. Facts may come ONLY from the candidate source resume text supplied by the user. The job description and skill-gap notes guide emphasis and honest transferable framing; they are NOT permission to invent employers, dates, degrees, certifications, tools, or metrics. If VoicePrint style notes are provided, match tone only. Never hallucinate. Never use emojis.',
        userContent,
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error?.message || 'API error ' + res.status)
      }
      const data = await res.json()
      const text = data.content.map(b => b.text || '').join('').trim()
      setTailored(text)
      try {
        sessionStorage.setItem(storageKey, text)
      } catch { /* ignore */ }
    } catch (e) {
      setErr(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [keySaved, apiKey, sourceResume, jdBlock, jobLine, gapsLine, transferNotes, r?.jobTitle, voiceProfile?.analysis, storageKey])

  const generateCoverVariant = useCallback(
    async (variationRound = 0) => {
      if (!keySaved || !apiKey) {
        alert('Save your API key first.')
        return
      }
      const base = String(coverText || r?.coverLetter || '').trim()
      if (!base) return
      setCoverLoading(true)
      setCoverErr('')
      try {
        const varHint = `REGENERATION — idea ${variationRound + 1} of 3: different opening and paragraph emphasis; same facts as resume and reference only.\n\n`
        const userContent =
          varHint +
          'Target role: ' + jobLine + '\n\n' +
          (jdBlock ? 'JOB DESCRIPTION:\n' + jdBlock.slice(0, 6000) + '\n\n' : '') +
          'CANDIDATE RESUME (facts only):\n' + sourceResume.slice(0, 8000) + '\n' +
          voiceSec +
          '\n\nREFERENCE COVER LETTER (keep all facts consistent with resume; improve into a fresh version):\n' + base.slice(0, 12000) +
          '\n\nReturn ONLY the full cover letter plain text. No markdown. No emojis. Do not invent experience.'

        const res = await kitFetchMessages(
          apiKey,
          'You revise cover letters using only facts supported by the candidate resume. Never hallucinate credentials or experience.',
          userContent,
          2500,
        )
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error?.message || 'API error ' + res.status)
        }
        const data = await res.json()
        setCoverText(data.content.map(b => b.text || '').join('').trim())
      } catch (e) {
        setCoverErr(e.message || 'Something went wrong.')
      } finally {
        setCoverLoading(false)
      }
    },
    [keySaved, apiKey, r?.coverLetter, coverText, jobLine, jdBlock, sourceResume, voiceSec],
  )

  const generateConnectVariant = useCallback(
    async (variationRound = 0) => {
      if (!keySaved || !apiKey) {
        alert('Save your API key first.')
        return
      }
      const base = String(connectText || r?.outreachMessage || '').trim()
      if (!base) return
      setConnectLoading(true)
      setConnectErr('')
      try {
        const varHint = `REGENERATION — idea ${variationRound + 1} of 3: different hook; same facts and honesty.\n\n`
        const userContent =
          varHint +
          'Job: ' + jobLine + '\n' +
          (jdBlock ? 'Context:\n' + jdBlock.slice(0, 4000) + '\n\n' : '') +
          'REFERENCE MESSAGE:\n' + base.slice(0, 2000) +
          '\n\nRewrite as a short outreach message (under 280 characters if possible). Plain text. No emojis. Facts only from reference. Return ONLY the message.'

        const res = await kitFetchMessages(
          apiKey,
          'You write concise outreach messages. Never invent employers or roles. No emojis.',
          userContent,
          600,
        )
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error?.message || 'API error ' + res.status)
        }
        const data = await res.json()
        setConnectText(data.content.map(b => b.text || '').join('').trim())
      } catch (e) {
        setConnectErr(e.message || 'Something went wrong.')
      } finally {
        setConnectLoading(false)
      }
    },
    [keySaved, apiKey, r?.outreachMessage, connectText, jobLine, jdBlock],
  )

  useEffect(() => {
    if (!resumeOpen || !canGenerate || !keySaved || !apiKey) return
    let cached = ''
    try {
      cached = sessionStorage.getItem(storageKey) || ''
    } catch { /* ignore */ }
    if (cached.trim()) {
      setTailored(t => (t.trim() ? t : cached))
      return
    }
    if (autoGenAttemptedRef.current === storageKey) return
    autoGenAttemptedRef.current = storageKey
    setResumeVar(0)
    generateTailoredResume(0, false)
  }, [resumeOpen, storageKey, canGenerate, keySaved, apiKey, generateTailoredResume])

  useEffect(() => {
    if (!coverOpen || !showCoverLetter) return
    if (coverLoading) return
    const t = String(coverText || '').trim()
    if (t) return
    const fromR = String(r?.coverLetter || '').trim()
    if (fromR) setCoverText(fromR)
  }, [coverOpen, showCoverLetter, r?.coverLetter, coverText, coverLoading])

  useEffect(() => {
    if (!connectOpen || !showOutreach) return
    if (connectLoading) return
    const t = String(connectText || '').trim()
    if (t) return
    const fromR = String(r?.outreachMessage || '').trim()
    if (fromR) setConnectText(fromR)
  }, [connectOpen, showOutreach, r?.outreachMessage, connectText, connectLoading])

  const onResumeRowClick = () => {
    setResumeOpen(v => {
      const n = !v
      if (n) {
        setResumeEdit(false)
      }
      return n
    })
  }

  const onCoverRowClick = () => {
    setCoverOpen(v => {
      const n = !v
      if (n) {
        setCoverEdit(false)
        const fromR = String(r?.coverLetter || '').trim()
        if (fromR && !String(coverText || '').trim()) setCoverText(fromR)
      }
      return n
    })
  }

  const onConnectRowClick = () => {
    setConnectOpen(v => {
      const n = !v
      if (n) {
        setConnectEdit(false)
        const fromR = String(r?.outreachMessage || '').trim()
        if (fromR && !String(connectText || '').trim()) setConnectText(fromR)
      }
      return n
    })
  }

  const handleResumeRegen = async () => {
    const next = (resumeVar + 1) % 3
    setResumeVar(next)
    await generateTailoredResume(next, true)
  }

  const handleCoverRegen = async () => {
    const slot = coverRegenCount % 3
    setCoverRegenCount(c => c + 1)
    setCoverVar(slot)
    await generateCoverVariant(slot)
  }

  const handleConnectRegen = async () => {
    const slot = connectRegenCount % 3
    setConnectRegenCount(c => c + 1)
    setConnectVar(slot)
    await generateConnectVariant(slot)
  }

  if (!allowApplyOutputs || (!showCoverLetter && !showOutreach)) return null

  const subBtn = {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${C.border}`,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: C.text,
    textAlign: 'left',
  }

  return (
    <div
      style={
        embedded
          ? { borderTop: `1px solid ${C.border}` }
          : { marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 4 }
      }
    >
      <button
        type="button"
        onClick={() =>
          setMainOpen(v => {
            const next = !v
            if (!next) {
              setResumeOpen(false)
              setCoverOpen(false)
              setConnectOpen(false)
              setResumeEdit(false)
              setCoverEdit(false)
              setConnectEdit(false)
            }
            return next
          })
        }
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 6,
          padding: '14px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          color: C.text,
          textAlign: 'left',
        }}
      >
        <span>myResume+</span>
        <span style={collapsibleChevronStyle(mainOpen)} aria-hidden>
          ▶
        </span>
      </button>
      {mainOpen && (
        <div style={{ paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ marginBottom: 4 }}>
            <button type="button" onClick={onResumeRowClick} style={{ ...subBtn, borderBottom: resumeOpen || showCoverLetter || showOutreach ? `1px solid ${C.border}` : 'none' }}>
              <span>Tailored resume</span>
              <CyanMicroTriangle open={resumeOpen} />
            </button>
            {resumeOpen && (
              <div style={{ padding: '12px 0 8px', borderBottom: showCoverLetter || showOutreach ? `1px solid ${C.border}` : 'none' }}>
                {loading && (
                  <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
                    <Dots /> Drafting your resume for this role…
                  </div>
                )}
                {!loading && (
                  <>
                    {err && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{err}</div>}
                    {!resumeEdit && <TailoredResumeView text={tailored} paperBg={C.kitResumeBg} />}
                    <KitActionRow
                      onRegenerate={handleResumeRegen}
                      regenDisabled={loading || !canGenerate}
                      regenLabel={tailored.trim() ? `Regenerate (${resumeVar + 1}/3)` : 'Generate'}
                      copyText={tailored}
                      onEditInContent={() => setResumeEdit(e => !e)}
                      editOpen={resumeEdit}
                      editValue={tailored}
                      onEditChange={v => {
                        setTailored(v)
                        try {
                          sessionStorage.setItem(storageKey, v)
                        } catch { /* ignore */ }
                      }}
                      greigeBg={C.kitResumeBg}
                    />
                    {!sourceResume && (
                      <p style={{ fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 0 }}>Add your resume under VoicePrint to enable tailoring.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {showCoverLetter && (
            <div style={{ marginBottom: 4 }}>
              <button type="button" onClick={onCoverRowClick} style={{ ...subBtn, borderBottom: coverOpen || showOutreach ? `1px solid ${C.border}` : 'none' }}>
                <span>Cover letter</span>
                <CyanMicroTriangle open={coverOpen} />
              </button>
              {coverOpen && (
                <div style={{ padding: '12px 0 16px', borderBottom: showOutreach ? `1px solid ${C.border}` : 'none' }}>
                  {coverLoading && (
                    <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
                      <Dots /> Working on your cover letter…
                    </div>
                  )}
                  {!coverLoading && (
                    <>
                      {coverErr && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{coverErr}</div>}
                      {!coverEdit && (
                        <div style={{ padding: '12px 14px', borderRadius: 12, background: C.kitCoverBg, border: `1px solid ${C.letterPanelBorder}` }}>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.72, fontFamily: "'DM Sans', sans-serif", color: C.text, margin: 0 }}>{coverText}</pre>
                        </div>
                      )}
                      <KitActionRow
                        onRegenerate={handleCoverRegen}
                        regenDisabled={coverLoading || !String(coverText || r?.coverLetter || '').trim()}
                        regenLabel={`Regenerate (${coverVar + 1}/3)`}
                        copyText={coverText}
                        onEditInContent={() => setCoverEdit(e => !e)}
                        editOpen={coverEdit}
                        editValue={coverText}
                        onEditChange={setCoverText}
                        greigeBg={C.kitCoverBg}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {showOutreach && (
            <div style={{ marginBottom: 4 }}>
              <button type="button" onClick={onConnectRowClick} style={{ ...subBtn, borderBottom: 'none' }}>
                <span>Connect</span>
                <CyanMicroTriangle open={connectOpen} />
              </button>
              {connectOpen && (
                <div style={{ padding: '12px 0 16px' }}>
                  {connectLoading && (
                    <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
                      <Dots /> Working on your message…
                    </div>
                  )}
                  {!connectLoading && (
                    <>
                      {connectErr && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{connectErr}</div>}
                      {!connectEdit && (
                        <div style={{ padding: '12px 14px', borderRadius: 12, background: C.connectPanelBg, border: `1px solid ${C.connectPanelBorder}` }}>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.72, fontFamily: "'DM Sans', sans-serif", color: C.text, margin: 0 }}>{connectText}</pre>
                        </div>
                      )}
                      <KitActionRow
                        onRegenerate={handleConnectRegen}
                        regenDisabled={connectLoading || !String(connectText || r?.outreachMessage || '').trim()}
                        regenLabel={`Regenerate (${connectVar + 1}/3)`}
                        copyText={connectText}
                        onEditInContent={() => setConnectEdit(e => !e)}
                        editOpen={connectEdit}
                        editValue={connectText}
                        onEditChange={setConnectText}
                        greigeBg={C.connectPanelBg}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function buildSystemPrompt(resumeSection, voiceSection, userName, userContact, userLinks, bannedPhrases, applyThreshold, override) {
  const voiceInstruction = (voiceSection && voiceSection.trim().length > 0)
    ? 'Match the candidate voice profile exactly — their tone, rhythm, word choices, and anything they flag as unnatural. The voice profile is the only style guide. Do not impose your own style.'
    : 'No voice profile provided. Write professionally and neutrally. Clear, direct, human-sounding.'

  const threshold = Number.isFinite(Number(applyThreshold)) ? Math.max(0, Math.min(100, Number(applyThreshold))) : 85
  const scoringRules = override
    ? 'OVERRIDE MODE: User has chosen to apply regardless of score. Generate full output including cover letter, project idea, and outreach message no matter what. Still provide an honest score and verdict but always include all outputs.'
    : `SCORING: 0-100. ${threshold}+=APPLY+full output (include coverLetter and outreachMessage). <${threshold}=SKIP: verdict SKIP, set coverLetter to "" and outreachMessage to "" (no draft apply materials). Verdict SCAM: set coverLetter and outreachMessage to "".\nSCAM flags: no real company, vague duties, unusually high pay, MLM, asks personal info, poor grammar.`

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

function parseCoverLetterBody(text) {
  if (!text) return { greeting: 'Dear Hiring Manager,', p1: '', p2: '', p3: '', date: '' }
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const gi = lines.findIndex(l => l.startsWith('Dear '))
  const greeting = gi >= 0 ? lines[gi] : 'Dear Hiring Manager,'
  const body = gi >= 0 ? lines.slice(gi + 1) : lines
  const si = body.findIndex(l => l === 'Best regards,' || l === 'Sincerely,')
  const paras = (si >= 0 ? body.slice(0, si) : body).join('\n').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const dm = text.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/m)
  return {
    date: dm ? dm[0] : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    greeting, p1: paras[0] || '', p2: paras[1] || '', p3: paras[2] || '',
  }
}

function coverLetterEditorInitialFullText(coverLetter, profile) {
  const raw = coverLetter || ''
  const firstLine = raw.split('\n')[0]?.trim()
  if (profile?.name && firstLine === profile.name.trim() && raw.includes('Dear ')) return raw
  const { date, greeting, p1, p2, p3 } = parseCoverLetterBody(coverLetter)
  const name = profile?.name || ''
  const email = profile?.email || ''
  const phone = profile?.phone || ''
  const linkedin = profile?.linkedin || ''
  const portfolio = profile?.portfolio || ''
  return [
    name,
    `${email}${phone ? ' | ' + phone : ''}`,
    `${linkedin}${portfolio ? ' | ' + portfolio : ''}`,
    '',
    date,
    '',
    greeting,
    '',
    p1,
    '',
    p2,
    '',
    p3,
    '',
    'Best regards,',
    name,
  ].join('\n')
}

function CoverLetterEditor({ coverLetter, jobTitle, company, onClose, profile }) {
  const initialFullText = useMemo(() => coverLetterEditorInitialFullText(coverLetter, profile), [coverLetter, profile])
  const [data, setData] = useState({})
  const fullText = data._raw !== undefined ? data._raw : initialFullText
  const ta = {
    width: '100%', minHeight: 420, boxSizing: 'border-box', display: 'block',
    border: 'none', borderRadius: 0, padding: '16px 20px', margin: 0,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8, color: C.text,
    background: C.surface2, outline: 'none', resize: 'vertical',
  }
  return (
    <div style={{ marginTop: 24 }}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Cover letter</h2>
            {jobTitle && <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>{jobTitle} at {company}</p>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <CopyBtn text={fullText} />
            <Btn small primary onClick={() => generateCoverLetterPDF(fullText)}>Download PDF →</Btn>
            {onClose && <Btn small onClick={onClose}>← Back</Btn>}
          </div>
        </div>
        <textarea
          value={fullText}
          onChange={e => setData(d => ({ ...d, _raw: e.target.value }))}
          rows={26}
          spellCheck
          style={ta}
        />
      </Card>
    </div>
  )
}

function DocumentsTab({ onOpenCover, onOpenResume, lastWithCover }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, fontFamily: "'Syne', 'DM Sans', sans-serif" }}>Documents <span style={{ color: C.cyan }}>▸</span></h1>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>Edit your cover letter or resume for download and copy.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Cover letter</div>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.55 }}>
            {lastWithCover ? <>From your latest analysis: <strong style={{ color: C.text }}>{lastWithCover.jobTitle || 'Role'}</strong> at {lastWithCover.company || 'Company'}.</> : 'Run an analysis with a cover letter first, then you can edit it here.'}
          </p>
          <Btn primary small disabled={!lastWithCover} onClick={onOpenCover}>Open editor</Btn>
        </Card>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Resume</div>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.55 }}>Build and export your resume PDF.</p>
          <Btn primary small onClick={onOpenResume}>Open editor</Btn>
        </Card>
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
    setHistory(updated); localStorage.setItem('va_history',JSON.stringify(updated)); setCurrentResult(entry)
  }
  function onVoiceSaved(p) { setVoiceProfile(p); localStorage.setItem('va_voice',JSON.stringify(p)) }
  function onProfileSaved(p) { setProfile(p); localStorage.setItem('va_profile',JSON.stringify(p)) }
  const applyLetterThreshold = Number.isFinite(Number(profile?.matchThreshold)) ? Number(profile.matchThreshold) : 85
  const lastWithCover = history.find(r => r.coverLetter && qualifiesForApplyLetterOutputs(r, applyLetterThreshold))

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
              docView==='cover' ? <CoverLetterEditor key={lastWithCover?.id ?? 'cover'} coverLetter={lastWithCover?.coverLetter||''} jobTitle={lastWithCover?.jobTitle||''} company={lastWithCover?.company||''} onClose={() => setDocView(null)} profile={profile} />
              : docView==='resume' ? <ResumeEditor onClose={() => setDocView(null)} profile={profile} />
              : <DocumentsTab onOpenCover={() => setDocView('cover')} onOpenResume={() => setDocView('resume')} lastWithCover={lastWithCover} />
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
      const parsed = JSON.parse(data.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim())
      onResult({
        ...parsed,
        applyAnyway: !!override,
        analyzedJobPosting: inputMode === 'description' ? jd.trim() : '',
        jobPostingUrl: inputMode === 'url' ? jobUrl.trim() : '',
      })
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
      {inputMode === 'description' && jd.trim() && !loading && (
        <div style={{ marginTop: 4, marginLeft: 6 }}>
          <button
            type="button"
            onClick={() => { setJd(''); setCurrentResult(null); setError('') }}
            style={{
              padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface2,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: C.muted,
              lineHeight: 1.3, textDecoration: 'none',
            }}
          >
            Clear
          </button>
        </div>
      )}
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13, marginRight: 'auto' }}>
            <Dots />
            {loadMsg}
          </div>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>Start</span>
          <button
            onClick={() => analyze(false)}
            disabled={loading}
            style={{
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: C.cyan,
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1,
              opacity: loading ? 0.45 : 1,
              fontFamily: "'DM Sans', sans-serif",
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              margin: 0,
              marginLeft: -2,
              textShadow: '0 3px 12px rgba(78,205,196,0.45)',
              transform: 'translateY(-1px)',
              transition: 'transform 0.15s ease, text-shadow 0.15s ease, opacity 0.15s ease',
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
      </div>
      {error && <div style={{ marginTop:20, padding:'14px 18px', borderRadius:12, background:C.redBg, border:`1px solid rgba(155,35,53,0.15)`, fontSize:13, color:C.red }}><strong>Something went wrong:</strong> {error}</div>}
      {currentResult && (
        <ResultCard
          result={currentResult}
          onOverride={() => analyze(true)}
          apiKey={apiKey}
          keySaved={keySaved}
          voiceProfile={voiceProfile}
          matchThreshold={Number.isFinite(Number(profile?.matchThreshold)) ? Number(profile.matchThreshold) : 85}
        />
      )}
    </div>
  )
}

function ResultCard({ result:r, onOverride, apiKey, keySaved, voiceProfile, matchThreshold }) {
  const allowApplyOutputs = qualifiesForApplyLetterOutputs(r, matchThreshold)
  const showCoverLetter = !!(r.coverLetter && String(r.coverLetter).trim()) && allowApplyOutputs
  const showOutreach = !!(r.outreachMessage && String(r.outreachMessage).trim()) && allowApplyOutputs
  const hasUpskillShell = !!(r.missingSkills?.length > 0 && allowApplyOutputs && (r.transferableNotes || r.projectIdea))
  const scoreColor = r.score>=85?C.green:r.score>=70?C.amber:C.red
  const vc = {APPLY:{bg:C.greenBg,color:C.green,border:'rgba(45,106,79,0.2)',label:'Apply'},SKIP:{bg:C.redBg,color:C.red,border:'rgba(155,35,53,0.2)',label:'Do not apply'},SCAM:{bg:C.amberBg,color:C.amber,border:'rgba(122,79,0,0.2)',label:'Likely scam — skip'}}[r.verdict]||{bg:C.surface2,color:C.muted,border:C.border,label:r.verdict}

  const [panelOpen, setPanelOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const chatBottomRef = useRef(null)
  const [upskillOpen, setUpskillOpen] = useState(false)

  useEffect(() => {
    setUpskillOpen(false)
  }, [r.id])

  function closePanel() {
    setPanelOpen(false)
    setChatMessages([])
    setChatInput('')
    setChatError('')
  }

  function renderMessage(text) {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('```')) return null
      const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
      return (
        <div key={i} style={{ marginBottom: line === '' ? 6 : 2 }}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**'))
              return <strong key={j}>{part.slice(2,-2)}</strong>
            if (part.startsWith('`') && part.endsWith('`'))
              return <code key={j} style={{ background:C.surface2, padding:'1px 5px', borderRadius:4, fontFamily:"'DM Mono', monospace", fontSize:11 }}>{part.slice(1,-1)}</code>
            return <span key={j}>{part}</span>
          })}
        </div>
      )
    })
  }

  async function sendMessage(userText, options) {
    if (!apiKey) return
    const userMsg = { role:'user', content: userText }
    const updated = [...chatMessages, userMsg]
    setChatMessages(updated)
    setChatInput('')
    setChatLoading(true)
    setChatError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body:JSON.stringify({
          model:'claude-haiku-4-5-20251001',
          max_tokens:800,
          system:
            'You are a practical project coach helping a job seeker build a portfolio project to close skill gaps for a specific job.\n' +
            'Job title: ' + (r.jobTitle||'unknown') + '\n' +
            'Project idea: ' + (r.projectIdea||'not specified') + '\n' +
            'Skill gaps to close: ' + (r.missingSkills?.join(', ')||'none listed') + '\n\n' +
            'Rules:\n' +
            '- Be conversational and concise. No walls of text.\n' +
            '- Ask one question at a time.\n' +
            '- When recommending a tool, include a direct URL to sign up or get started.\n' +
            '- Write code when helpful, in code blocks using backticks.\n' +
            '- Use **bold** for section headers or key terms.\n' +
            '- Keep responses under 200 words unless writing a full plan or code.\n' +
            '- Never use buzzwords or filler phrases.\n' +
            '- When you ask a question that has clear choices, end your message with OPTIONS: followed by 2-3 comma-separated options on the same line. Example: OPTIONS: Beginner,Some experience,Just need a refresher',
          messages: updated.map(m => ({ role:m.role, content:m.content })),
        }),
      })
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||'API error '+res.status) }
      const data = await res.json()
      const reply = data.content.map(b=>b.text||'').join('').trim()
      const optionsMatch = reply.match(/OPTIONS:\s*(.+)$/m)
      const opts = optionsMatch ? optionsMatch[1].split(',').map(s=>s.trim()) : []
      const cleanReply = reply.replace(/OPTIONS:\s*.+$/m, '').trim()
      setChatMessages(prev => [...prev, { role:'assistant', content:cleanReply, options:opts }])
    } catch(e) {
      setChatError(e.message||'Something went wrong.')
    } finally {
      setChatLoading(false)
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    }
  }

  async function openPanel() {
    if (!apiKey) return
    setPanelOpen(true)
    setChatMessages([])
    setChatLoading(true)
    setChatError('')
    const gaps = r.missingSkills?.join(', ') || 'the skill gaps for this role'
    const opening =
      'I can help you build this project step by step so you have something real to show ' +
      (r.jobTitle ? 'for the ' + r.jobTitle + ' role' : 'a hiring manager') + '.\n\n' +
      'First — how comfortable are you with ' + gaps + ' right now?\n\nOPTIONS: Beginner,Some experience,Just need a refresher'
    setChatMessages([{ role:'assistant', content: opening.replace(/OPTIONS:\s*.+$/m,'').trim(), options:['Beginner','Some experience','Just need a refresher'] }])
    setChatLoading(false)
  }

  return (
    <div style={{ marginTop:32 }}>
      {panelOpen && (
        <div
          onClick={closePanel}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.15)', zIndex:999 }}
        />
      )}
      {panelOpen && (
        <div style={{
          position:'fixed', top:0, right:0, width:420, height:'100vh',
          background:C.surface, borderLeft:`1px solid ${C.border}`,
          zIndex:1000, display:'flex', flexDirection:'column',
          boxShadow:'-4px 0 24px rgba(0,0,0,0.08)',
          fontFamily:"'DM Sans', sans-serif",
        }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>Project Builder</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{r.jobTitle||'Role'}</div>
            </div>
            <button onClick={closePanel} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.muted, lineHeight:1, padding:4 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:msg.role==='user'?'flex-end':'flex-start' }}>
                <div style={{
                  maxWidth:'85%', padding:'10px 14px', borderRadius:12,
                  background:msg.role==='user'?C.cyanDim:C.surface2,
                  border:`1px solid ${msg.role==='user'?C.cyanBorder:C.border}`,
                  fontSize:13, lineHeight:1.6, color:C.text,
                }}>
                  {renderMessage(msg.content)}
                </div>
                {msg.options?.length>0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                    {msg.options.map(opt => (
                      <button key={opt} onClick={() => sendMessage(opt)}
                        style={{ fontSize:12, padding:'5px 12px', borderRadius:20, border:`1px solid ${C.border}`, background:C.surface, color:C.text, cursor:'pointer', fontFamily:"'DM Sans', sans-serif' " }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display:'flex', alignItems:'flex-start' }}>
                <div style={{ padding:'10px 14px', borderRadius:12, background:C.surface2, border:`1px solid ${C.border}` }}>
                  <Dots />
                </div>
              </div>
            )}
            {chatError && <div style={{ fontSize:12, color:C.red, padding:'8px 12px', background:C.redBg, borderRadius:8 }}>{chatError}</div>}
            <div ref={chatBottomRef} />
          </div>
          <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8, flexShrink:0 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && chatInput.trim() && !chatLoading && sendMessage(chatInput)}
              placeholder="Ask anything about this project..."
              style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:"'DM Sans', sans-serif", background:C.surface2, color:C.text, outline:'none' }}
            />
            <button
              onClick={() => chatInput.trim() && !chatLoading && sendMessage(chatInput)}
              disabled={chatLoading || !chatInput.trim()}
              style={{ padding:'8px 14px', borderRadius:8, border:'none', background:C.dark, color:'#fff', cursor:chatLoading||!chatInput.trim()?'not-allowed':'pointer', opacity:chatLoading||!chatInput.trim()?0.45:1, fontSize:13, fontFamily:"'DM Sans', sans-serif" }}
            >
              ▸
            </button>
          </div>
        </div>
      )}
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
        {r.missingSkills?.length > 0 && allowApplyOutputs && (r.transferableNotes || r.projectIdea) && (
          <div style={{ marginBottom: 16, borderTop: `1px solid ${C.border}` }}>
            <button
              type="button"
              onClick={() => setUpskillOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 6,
                padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: C.text, textAlign: 'left',
              }}
            >
              <span>Upskill</span>
              <span
                style={{
                  fontSize: 9, color: C.cyan, display: 'inline-block', lineHeight: 1,
                  transform: upskillOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease',
                  transformOrigin: 'center',
                }}
                aria-hidden="true"
              >▶</span>
            </button>
            {upskillOpen && (
              <div style={{ paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {r.transferableNotes && (
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: C.gapPanelBg, border: `1px solid ${C.gapPanelBorder}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.gapPanelTitle, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Skill Gap Strategy</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.65 }}>{r.transferableNotes}</div>
                  </div>
                )}
                {r.projectIdea && (
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: C.projectPanelBg, border: `1px solid ${C.projectPanelBorder}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.projectPanelTitle, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Project Idea</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{r.projectIdea}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={openPanel}
                        disabled={!apiKey}
                        title={apiKey ? 'Open project builder' : 'Save your API key first'}
                        style={{
                          margin: 0, padding: '4px 8px', border: 'none', background: 'transparent',
                          cursor: !apiKey ? 'not-allowed' : 'pointer', opacity: !apiKey ? 0.45 : 1, fontFamily: "'DM Sans', sans-serif",
                          display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 5, color: C.text,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>Build with AI</span>
                        <CyanMicroTriangle open={false} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {allowApplyOutputs && (showCoverLetter || showOutreach) && (
              <MyResumePlusSection
                r={r}
                voiceProfile={voiceProfile}
                apiKey={apiKey}
                keySaved={keySaved}
                allowApplyOutputs={allowApplyOutputs}
                showCoverLetter={showCoverLetter}
                showOutreach={showOutreach}
                embedded
              />
            )}
          </div>
        )}
        {!r.missingSkills?.length && r.transferableNotes && (
          <div style={{ marginBottom:16, padding:'10px 12px', borderRadius:12, background:C.gapPanelBg, border:`1px solid ${C.gapPanelBorder}` }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.gapPanelTitle, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Skill Gap Strategy</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.55 }}>{r.transferableNotes}</div>
          </div>
        )}
        {!r.missingSkills?.length && r.projectIdea && (
          <div style={{ marginBottom:16, padding:'10px 12px', borderRadius:12, background:C.projectPanelBg, border:`1px solid ${C.projectPanelBorder}` }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.projectPanelTitle, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Project Idea</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.55, whiteSpace:'pre-wrap', marginBottom:10 }}>{r.projectIdea}</div>
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center' }}>
              <button
                type="button"
                onClick={openPanel}
                disabled={!apiKey}
                title={apiKey ? 'Open project builder' : 'Save your API key first'}
                style={{
                  margin:0, padding:'4px 8px', border:'none', background:'transparent',
                  cursor:!apiKey?'not-allowed':'pointer', opacity:!apiKey?0.45:1, fontFamily:"'DM Sans', sans-serif",
                  display:'inline-flex', flexDirection:'row', alignItems:'center', gap:5, color:C.text,
                }}
              >
                <span style={{ fontSize:13, fontWeight:600, letterSpacing:'0.04em' }}>Build with AI</span>
                <CyanMicroTriangle open={false} />
              </button>
            </div>
          </div>
        )}
        {!hasUpskillShell && allowApplyOutputs && (showCoverLetter || showOutreach) && (
          <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}` }}>
            <MyResumePlusSection
              r={r}
              voiceProfile={voiceProfile}
              apiKey={apiKey}
              keySaved={keySaved}
              allowApplyOutputs={allowApplyOutputs}
              showCoverLetter={showCoverLetter}
              showOutreach={showOutreach}
            />
          </div>
        )}
      </Card>
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