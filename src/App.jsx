import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { jsPDF } from 'jspdf'

const NAV = [
  { id: 'Analyze', label: 'Analyze' },
  { id: 'Documents', label: 'myResume+' },
  { id: 'VoicePrint', label: 'VoicePrint' },
  { id: 'History', label: 'History' },
]

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
  kitResumeBg: '#fafafa',
  /** Edit textarea in myResume+ tailored resume — same family as kitResumeBg, one step lighter */
  kitResumeTextareaBg: '#fcfcfc',
  /** Tailored resume (generated JSON / plaintext preview): neutral greys, no brown undertones. */
  resumeName: '#0f0f0f',
  resumeHeadline: '#3a3a3a',
  /** Plain contact text (location, phone); links use C.cyan */
  resumeContact: '#8f8f8f',
  resumeContactSep: '#b0b0b0',
  resumeSectionTitle: '#363636',
  resumeBody: '#4a4a4a',
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

/** jsPDF: match C.kitResumeBg #fafafa — full-bleed fill every page (avoids white seams). */
const PDF_RESUME_BG = [250, 250, 250]
/** Foreground text for tailored resume PDF — #1c1c1a only (name, headline, body, bullets, section titles, job titles, contact). */
const PDF_INK = [28, 28, 26]
const PDF_NAME = PDF_INK
const PDF_HEADLINE = PDF_INK
const PDF_BODY = PDF_INK
const PDF_SECTION_TITLE = PDF_INK
/** Section underline — C.borderStrong-ish, not near-black (avoids a “bar” at page breaks). */
const PDF_SECTION_RULE = [217, 217, 215]

function pdfResumePageBackground(doc) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setFillColor(...PDF_RESUME_BG)
  doc.rect(0, 0, w, h, 'F')
}

function pdfNormalizeResumeUrl(s) {
  const t = String(s || '').trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  if (/^mailto:/i.test(t)) return t
  if (/^www\./i.test(t)) return `https://${t}`
  return `https://${t}`
}

/** Contact row: location • phone • email • LinkedIn • portfolio (links still clickable; ink #1c1c1a). */
function pdfDrawResumeContactLine(doc, margin, contentW, startY, data) {
  const parts = []
  if (String(data.location || '').trim()) parts.push({ text: String(data.location).trim() })
  if (String(data.phone || '').trim()) parts.push({ text: String(data.phone).trim() })
  if (String(data.email || '').trim()) {
    const em = String(data.email).trim()
    parts.push({ text: em, url: `mailto:${em}` })
  }
  if (String(data.linkedin || '').trim()) {
    const raw = String(data.linkedin).trim()
    parts.push({ text: raw, url: pdfNormalizeResumeUrl(raw) })
  }
  if (String(data.portfolio || '').trim()) {
    const raw = String(data.portfolio).trim()
    parts.push({ text: raw, url: pdfNormalizeResumeUrl(raw) })
  }
  if (!parts.length) return startY

  const sep = '  •  '
  let x = margin
  let y = startY
  const maxX = margin + contentW
  const fs = 9.5
  const lineH = fs * 1.28
  doc.setFontSize(fs)
  doc.setFont('helvetica', 'normal')

  parts.forEach((p, i) => {
    if (i > 0) {
      doc.setTextColor(...PDF_INK)
      const sw = doc.getTextWidth(sep)
      if (x + sw > maxX && x > margin) {
        x = margin
        y += lineH
      }
      doc.text(sep, x, y)
      x += sw
    }
    const label = p.text
    let w = doc.getTextWidth(label)
    if (x + w > maxX && x > margin) {
      x = margin
      y += lineH
    }
    if (p.url) {
      doc.setTextColor(...PDF_INK)
      doc.text(label, x, y)
      doc.link(x, y - fs * 0.9, w, fs * 1.2, { url: p.url })
    } else {
      doc.setTextColor(...PDF_INK)
      doc.text(label, x, y)
    }
    x += w
  })
  return y + 6
}

/** Contact row from tailored JSON — same #1c1c1a ink as the rest of the resume PDF. */
function pdfDrawTailoredJsonContactLine(doc, margin, contentW, startY, contact, { scale = 1 } = {}) {
  const c = normalizeTailoredResumeJson({ contact }).contact
  const parts = []
  if (String(c.location || '').trim()) parts.push({ text: String(c.location).trim() })
  if (String(c.phone || '').trim()) parts.push({ text: String(c.phone).trim() })
  if (String(c.email || '').trim()) {
    const em = String(c.email).trim()
    parts.push({ text: em, url: `mailto:${em}` })
  }
  for (const w of c.websites || []) {
    if (!String(w || '').trim()) continue
    const raw = String(w).trim()
    parts.push({ text: raw, url: pdfNormalizeResumeUrl(raw) })
  }
  if (!parts.length) return startY

  const sep = '  •  '
  let x = margin
  let y = startY
  const maxX = margin + contentW
  const fs = Math.max(7, 10 * scale)
  const lineH = fs * 1.28
  doc.setFontSize(fs)
  doc.setFont('helvetica', 'normal')

  parts.forEach((p, i) => {
    if (i > 0) {
      doc.setTextColor(...PDF_INK)
      const sw = doc.getTextWidth(sep)
      if (x + sw > maxX && x > margin) {
        x = margin
        y += lineH
      }
      doc.text(sep, x, y)
      x += sw
    }
    const label = p.text
    let w = doc.getTextWidth(label)
    if (x + w > maxX && x > margin) {
      x = margin
      y += lineH
    }
    if (p.url) {
      doc.setTextColor(...PDF_INK)
      doc.text(label, x, y)
      doc.link(x, y - fs * 0.9, w, fs * 1.2, { url: p.url })
    } else {
      doc.setTextColor(...PDF_INK)
      doc.text(label, x, y)
    }
    x += w
  })
  return y + 6 * scale
}

/** Max pages from Settings (va_experience_level): Entry/Mid → 1; Senior/Lead & Executive → 2. */
function getResumePdfMaxPages() {
  try {
    const v = localStorage.getItem('va_experience_level')
    if (v === 'Senior / Lead' || v === 'Executive') return 2
  } catch { /* ignore */ }
  return 1
}

const PDF_BULLET = '\u2022'

/**
 * Structured tailored resume PDF (Helvetica ≈ DM Sans). `scale` shrinks type/spacing so Entry/Mid can stay on one page.
 */
function buildTailoredResumePdfDoc(data, { maxPages, scale }) {
  const d = normalizeTailoredResumeJson(data)
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  /** 0.5in (36pt) side margins — wider line for contact URLs; jsPDF letter width 612pt. */
  const margin = 36
  const pageW = 612
  const contentW = pageW - margin * 2
  const pageH = doc.internal.pageSize.getHeight()
  const bottomY = pageH - margin
  let y = margin
  const fs = n => Math.max(6, n * scale)
  const gap = n => n * scale
  const bulletIndent = 12 * scale
  const bulletX = margin + 3 * scale
  /** PDF hierarchy: name (20) → section headers (slightly above body) → headline (12) → body / job titles (11). */
  const PDF_HEADLINE_PT = 12
  const PDF_BODY_PT = 11
  const PDF_SECTION_HEADER_PT = 12
  /** Match Experience: 15 after title row, 13 per wrapped body line (bullets, company, descriptions). */
  const expGapAfterTitle = 15
  const expBodyLine = 13
  const sectionGapBefore = 16
  const sectionGapTitleToRule = 7
  const sectionGapAfterRule = 12

  pdfResumePageBackground(doc)

  const checkPage = (need = 24) => {
    const n = need * scale
    if (y + n <= bottomY) return
    if (doc.getNumberOfPages() < maxPages) {
      doc.addPage()
      pdfResumePageBackground(doc)
      y = margin
    }
  }

  doc.setFontSize(fs(20))
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_NAME)
  checkPage(30)
  doc.text(d.name || 'Resume', margin, y)
  y += gap(26)

  if (d.headline) {
    const hl = normalizeHeadlineDisplay(d.headline)
    doc.setFontSize(fs(PDF_HEADLINE_PT))
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PDF_HEADLINE)
    const hlLines = doc.splitTextToSize(hl, contentW)
    checkPage(18)
    doc.text(hlLines[0] || '', margin, y)
    y += gap(15)
  }

  y = pdfDrawTailoredJsonContactLine(doc, margin, contentW, y, d.contact, { scale })
  y += gap(8)

  const flushBullets = (bulletBuf, sectionId) => {
    if (!bulletBuf.length) return
    if (sectionId === 'skills') {
      const txt = bulletBuf.join(' • ')
      doc.setFontSize(fs(PDF_BODY_PT))
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...PDF_BODY)
      doc.splitTextToSize(txt, contentW).forEach(line => {
        checkPage(16)
        doc.text(line, margin, y)
        y += gap(14)
      })
    } else {
      bulletBuf.forEach(b => {
        checkPage(18)
        doc.setFontSize(fs(PDF_BODY_PT))
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...PDF_BODY)
        const lines = doc.splitTextToSize(b, contentW - bulletIndent)
        lines.forEach((line, li) => {
          checkPage(16)
          if (li === 0) {
            doc.text(PDF_BULLET, bulletX, y)
            doc.text(line, margin + bulletIndent, y)
          } else {
            doc.text(line, margin + bulletIndent, y)
          }
          y += gap(14)
        })
      })
    }
    bulletBuf.length = 0
  }

  for (const sec of d.sections) {
    const sid = resumeSectionId(sec.title)
    const ls = (sec.lines || []).map(l => String(l).trim()).filter(Boolean)
    checkPage(52)
    y += gap(sectionGapBefore)
    doc.setFontSize(fs(PDF_SECTION_HEADER_PT))
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PDF_SECTION_TITLE)
    doc.text(String(sec.title || 'SECTION').toUpperCase(), margin, y)
    y += gap(sectionGapTitleToRule)
    doc.setDrawColor(...PDF_SECTION_RULE)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageW - margin, y)
    y += gap(sectionGapAfterRule)

    if (sid === 'projects') {
      const blocks = splitProjectLines(ls)
      /* Same vertical rhythm as Experience: heading line(s) at expBodyLine, then expGapAfterTitle before body, body at expBodyLine. */
      for (let bi = 0; bi < blocks.length; bi++) {
        const b = blocks[bi]
        checkPage(28)
        doc.setFontSize(fs(PDF_BODY_PT))
        doc.setTextColor(...PDF_BODY)
        doc.setFont('helvetica', 'bold')
        const tw = doc.getTextWidth(b.title)
        const toolsStr = b.tools ? ` - ${b.tools}` : ''
        doc.setFont('helvetica', 'normal')
        const toolsW = b.tools ? doc.getTextWidth(toolsStr) : 0
        if (b.tools && tw + toolsW <= contentW) {
          doc.setFont('helvetica', 'bold')
          doc.text(b.title, margin, y)
          doc.setFont('helvetica', 'normal')
          doc.text(toolsStr, margin + tw, y)
          if (b.desc.length) y += gap(expGapAfterTitle)
          else y += gap(expBodyLine)
        } else {
          doc.setFont('helvetica', 'bold')
          doc.splitTextToSize(b.title, contentW).forEach(line => {
            checkPage(16)
            doc.text(line, margin, y)
            y += gap(expBodyLine)
          })
          if (b.tools) {
            doc.setFont('helvetica', 'normal')
            doc.splitTextToSize(toolsStr.trim(), contentW).forEach(line => {
              checkPage(16)
              doc.text(line, margin, y)
              y += gap(expBodyLine)
            })
          }
          if (b.desc.length) y += gap(expGapAfterTitle)
        }
        if (b.desc.length) {
          for (const dline of b.desc) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(fs(PDF_BODY_PT))
            doc.setTextColor(...PDF_BODY)
            doc.splitTextToSize(dline, contentW).forEach(line => {
              checkPage(16)
              doc.text(line, margin, y)
              y += gap(expBodyLine)
            })
          }
        }
      }
      continue
    }

    if (sid === 'education') {
      const eduLs = expandEducationRawLines(ls)
      const blocks = splitEducationLines(eduLs)
      for (const b of blocks) {
        checkPage(22)
        doc.setFontSize(fs(PDF_BODY_PT))
        doc.setTextColor(...PDF_BODY)
        doc.setFont('helvetica', 'bold')
        const titleText = formatEducationTitleLine(b.title)
        const titleLines = doc.splitTextToSize(titleText, contentW)
        const eduBody = joinEducationDescriptionParts(b.desc)
        if (titleLines.length === 1) {
          checkPage(16)
          doc.text(titleLines[0], margin, y)
          y += eduBody ? gap(expGapAfterTitle) : gap(expBodyLine)
        } else {
          titleLines.forEach(line => {
            checkPage(16)
            doc.text(line, margin, y)
            y += gap(expBodyLine)
          })
          if (eduBody) y += gap(expGapAfterTitle)
        }
        doc.setFont('helvetica', 'normal')
        if (eduBody) {
          doc.splitTextToSize(eduBody, contentW).forEach(line => {
            checkPage(16)
            doc.text(line, margin, y)
            y += gap(expBodyLine)
          })
        }
      }
      continue
    }

    let bulletBuf = []
    let i = 0
    while (i < ls.length) {
      if (lineLooksLikeResumeBulletLine(ls[i])) {
        bulletBuf.push(stripResumeBulletPrefix(ls[i]))
        i++
        continue
      }
      flushBullets(bulletBuf, sid)
      const para = []
      while (i < ls.length && !lineLooksLikeResumeBulletLine(ls[i])) {
        para.push(ls[i++])
      }
      if (!para.length) continue
      if (sid === 'experience') {
        const first = para[0]
        const { title: jobTitle, dates } = splitTitleAndDates(first)
        checkPage(22)
        doc.setFontSize(fs(PDF_BODY_PT))
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...PDF_BODY)
        doc.text(jobTitle, margin, y)
        if (dates) {
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(...PDF_BODY)
          const dw = doc.getTextWidth(dates)
          doc.text(dates, pageW - margin - dw, y)
          doc.setFont('helvetica', 'bold')
        }
        y += gap(expGapAfterTitle)
        for (let j = 1; j < para.length; j++) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...PDF_BODY)
          doc.splitTextToSize(para[j], contentW).forEach(line => {
            checkPage(16)
            doc.text(line, margin, y)
            y += gap(expBodyLine)
          })
        }
      } else {
        doc.setFontSize(fs(PDF_BODY_PT))
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...PDF_BODY)
        doc.splitTextToSize(para.join('\n'), contentW).forEach(line => {
          checkPage(16)
          doc.text(line, margin, y)
          y += gap(14)
        })
      }
    }
    flushBullets(bulletBuf, sid)
  }

  return doc
}

/** PDF from structured tailored resume JSON — matches on-screen layout; page count follows va_experience_level. */
function generateTailoredResumeJsonPDF(data, filenameBase = 'Resume') {
  const maxPages = getResumePdfMaxPages()
  let scale = 1
  let doc = buildTailoredResumePdfDoc(data, { maxPages, scale })
  for (let attempt = 0; attempt < 9 && doc.getNumberOfPages() > maxPages; attempt++) {
    scale -= 0.045
    if (scale < 0.72) break
    doc = buildTailoredResumePdfDoc(data, { maxPages, scale })
  }
  const safe = String(filenameBase || 'Resume')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 80)
  doc.save(`${safe}_Resume.pdf`)
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
  pdfResumePageBackground(doc)
  const checkPage = (n = 20) => {
    if (y + n > 730) {
      doc.addPage()
      pdfResumePageBackground(doc)
      y = margin
    }
  }
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
  doc.setFontSize(25); doc.setFont('helvetica','bold'); doc.setTextColor(28,28,26)
  doc.text(data.name||'', margin, y); y += 24
  if (data.tagline) { doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(28,28,26); doc.text(data.tagline, margin, y); y += 16 }
  y = pdfDrawResumeContactLine(doc, margin, contentW, y, data)
  doc.setDrawColor(200, 200, 196)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 4
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
    data.projects.forEach(p => { addLine(`${p.name}    ${p.tech}`, {bold:true, lineH:15}); addLine(p.desc, {color:[28,28,26], lineH:14}); y += 4 })
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
/** Faster model for myResume+ (tailored resume / cover / connect) — Sonnet was timing out for many users. */
const KIT_MESSAGES_MODEL = 'claude-haiku-4-5-20251001'

const VA_EXPERIENCE_LEVEL_KEY = 'va_experience_level'
const EXPERIENCE_LEVEL_OPTIONS = Object.freeze(['Entry Level', 'Mid Level', 'Senior / Lead', 'Executive'])

function loadExperienceLevel() {
  try {
    const v = localStorage.getItem(VA_EXPERIENCE_LEVEL_KEY)
    if (v && EXPERIENCE_LEVEL_OPTIONS.includes(v)) return v
  } catch { /* ignore */ }
  return 'Mid Level'
}

/** Tailored JSON resume system prompt — page length follows Settings experience level. */
function buildTailoredResumeSystemPrompt(experienceLevel) {
  const level = EXPERIENCE_LEVEL_OPTIONS.includes(experienceLevel) ? experienceLevel : 'Mid Level'
  const isEntryOrMid = level === 'Entry Level' || level === 'Mid Level'
  const pageRule = isEntryOrMid
    ? 'Resume length: target one printed page. Prioritize relevance, keep bullets concise, avoid filler.'
    : 'Resume length: at most two printed pages; use a second page only when needed for depth, not padding.'
  const entryMidDensity =
    isEntryOrMid
      ? ' Generate a concise one-page resume. Limit to 3-4 bullets per job maximum. Each bullet must be 1-2 lines max. Keep the summary to 3 sentences max. Be selective, prioritize the most relevant experience only.'
      : ''
  return (
    'You output tailored resumes as a single JSON object only (valid JSON, no markdown). Produce one complete, polished version — your best layout and wording in this single response; do not assume a second pass. Integrate job-description alignment (keywords and role fit), resume truth (only source of facts), and VoicePrint (tone/style only when provided). Skill-gap notes guide emphasis; they are NOT permission to invent employers, dates, degrees, certifications, tools, or metrics. Never hallucinate. Never use emojis. ' +
    'Contact line: in contact.websites, always omit https:// and http:// from every URL (show domain and path only, e.g. linkedin.com/in/username). ' +
    `Candidate experience level (user setting): ${level}. ${pageRule}${entryMidDensity}`
  )
}

/** All-caps lines that are real section titles (not e.g. a person's name). */
function lineLooksLikeKnownResumeSectionTitle(trimmed) {
  const u = String(trimmed || '').toUpperCase()
  return (
    /\b(SUMMARY|PROFILE|OBJECTIVE|SKILLS|COMPETENCIES|EXPERIENCE|EMPLOYMENT|WORK HISTORY|PROJECTS?|EDUCATION|CERTIFICATIONS?|ACADEMIC|AWARDS?|PUBLICATIONS?|VOLUNTEER|REFERENCES)\b/.test(u) ||
    /^(WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|TECHNICAL SKILLS|CORE COMPETENCIES)$/i.test(trimmed)
  )
}

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

/** Tools string: split on • , ; and rejoin with spaced bullets. */
function normalizeToolsString(s) {
  return String(s || '')
    .split(/[•,;]+/)
    .map(x => x.trim())
    .filter(Boolean)
    .join(' • ')
}

/** First line of a project: "Title - tool1 • tool2" or "Title    tools". */
function parseProjectTitleTools(line) {
  const t = String(line || '').trim()
  if (!t) return { title: '', tools: '' }
  const dash = t.split(/\s+-\s+/)
  if (dash.length >= 2) {
    const title = dash[0].trim()
    const tools = normalizeToolsString(dash.slice(1).join(' - '))
    return { title, tools }
  }
  const gap = t.split(/\s{2,}/)
  if (gap.length >= 2) {
    return { title: gap[0].trim(), tools: normalizeToolsString(gap.slice(1).join(' ')) }
  }
  return { title: t, tools: '' }
}

function isProjectHeaderLine(line) {
  const t = String(line || '').trim()
  if (!t) return false
  if (/\s+-\s+/.test(t)) {
    const parts = t.split(/\s+-\s+/)
    if (parts.length >= 2 && parts[0].length < 90 && parts[1].trim().length > 0) return true
  }
  if (/\s{2,}/.test(t)) {
    const parts = t.split(/\s{2,}/)
    if (parts.length >= 2 && parts[0].length < 80) return true
  }
  return false
}

function splitProjectLines(ls) {
  const out = []
  let i = 0
  while (i < ls.length) {
    if (lineLooksLikeResumeBulletLine(ls[i])) {
      i++
      continue
    }
    const parsed = parseProjectTitleTools(ls[i])
    i++
    const desc = []
    while (i < ls.length) {
      if (lineLooksLikeResumeBulletLine(ls[i])) {
        desc.push(`• ${stripResumeBulletPrefix(ls[i])}`)
        i++
        continue
      }
      if (isProjectHeaderLine(ls[i])) break
      desc.push(ls[i])
      i++
    }
    out.push({ title: parsed.title, tools: parsed.tools, desc })
  }
  return out
}

function isLikelyEducationTitleLine(line, prevLine) {
  const t = String(line || '').trim()
  if (!t || t.length > 140) return false
  if (/^[a-z]/.test(t)) return false
  if (/\b(CompTIA|AWS|Google|Certificate|Degree|B\.S\.|B\.A\.|M\.S\.|M\.A\.|MBA|Ph\.D|Bachelor|Master|University|College|Bootcamp|Coursera|edX)\b/i.test(t)) return true
  if (/\(in progress\)/i.test(t)) return true
  if (prevLine && prevLine.length > 100 && t.length < 100 && /^[A-Z(]/.test(t)) return true
  return false
}

function splitEducationLines(ls) {
  const out = []
  let i = 0
  while (i < ls.length) {
    if (lineLooksLikeResumeBulletLine(ls[i])) {
      i++
      continue
    }
    const title = ls[i++]
    const desc = []
    while (i < ls.length) {
      const line = ls[i]
      if (lineLooksLikeResumeBulletLine(line)) {
        desc.push(stripResumeBulletPrefix(line))
        i++
        continue
      }
      const prev = desc.length ? desc[desc.length - 1] : title
      if (isLikelyEducationTitleLine(line, prev)) break
      desc.push(line)
      i++
    }
    out.push({ title, desc })
  }
  return out
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

/** Strip NAME:/HEADLINE:/CONTACT: prefixes from model output (one pass per line). */
function stripResumeHeaderLabel(line) {
  return String(line || '')
    .replace(/^\s*NAME:\s*/i, '')
    .replace(/^\s*HEADLINE:\s*/i, '')
    .replace(/^\s*CONTACT:\s*/i, '')
    .trim()
}

/** `-` / `*` bullets need a space so we do not treat hyphenated words as bullets; •/▪ often touch text. */
function lineLooksLikeResumeBulletLine(s) {
  const t = String(s || '').trim()
  if (!t) return false
  if (/^[-*]\s+/.test(t)) return true
  if (/^[•▪]\s*/.test(t)) return true
  if (/^\d+[.)]\s*/.test(t)) return true
  return false
}

function stripResumeBulletPrefix(t) {
  return String(t || '')
    .trim()
    .replace(/^[-*]\s+/, '')
    .replace(/^[•▪]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
}

/** Education detail lines: plain prose only; commas between items, never • or list bullets. */
function formatEducationDescriptionPlain(s) {
  let t = String(s || '').trim()
  if (!t) return ''
  t = stripResumeBulletPrefix(t)
  t = t.replace(/\*\*/g, '')
  t = t.replace(/\s*[•·]\s*/g, ', ')
  t = t.replace(/\s{2,}/g, ' ')
  t = t.replace(/,\s*,+/g, ', ')
  t = t.replace(/^\s*,\s*|\s*,\s*$/g, '')
  return t.trim()
}

function joinEducationDescriptionParts(desc) {
  const parts = (desc || []).map(formatEducationDescriptionPlain).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0]
  return parts.every(p => p.length <= 140) ? parts.join(', ') : parts.join(' ')
}

/** Education title line only (bold in UI): strip accidental markdown. */
function formatEducationTitleLine(s) {
  return String(s || '')
    .replace(/\*\*/g, '')
    .replace(/^\s*#+\s*/, '')
    .trim()
}

/** Split lines that embed newlines so line 1 = title, line 2+ = description for each credential. */
function expandEducationRawLines(rawLines) {
  const out = []
  for (const l of rawLines) {
    const s = String(l).trim()
    if (!s) continue
    s.split(/\r?\n/).forEach(part => {
      const p = part.trim()
      if (p) out.push(p)
    })
  }
  return out
}

/** Classify a single contact fragment for strict display order. */
function classifyContactSegment(seg) {
  const s = String(seg || '').trim()
  if (!s) return null
  if (/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(s)) return 'email'
  if (/linkedin\.com/i.test(s)) return 'linkedin'
  if (/https?:\/\//i.test(s) || /^www\./i.test(s)) {
    return 'portfolio'
  }
  if (/\d{3}[-.\s)]?\d{3}[-.\s]?\d{4}/.test(s) || /\(\d{3}\)\s*\d{3}/.test(s) || /\b\d{3}-\d{3}-\d{4}\b/.test(s)) return 'phone'
  return 'location'
}

/** location → phone → email → LinkedIn → portfolio (other https after LinkedIn). */
function orderContactLineForDisplay(raw) {
  const s = stripResumeHeaderLabel(Array.isArray(raw) ? raw.join(' | ') : String(raw || ''))
  const segments = s.split(/\s*[|•]\s*/).map(x => stripResumeHeaderLabel(x)).map(x => x.trim()).filter(Boolean)
  const loc = []
  const phone = []
  const email = []
  const li = []
  const port = []
  for (const seg of segments) {
    const k = classifyContactSegment(seg)
    if (k === 'location') loc.push(seg)
    else if (k === 'phone') phone.push(seg)
    else if (k === 'email') email.push(seg)
    else if (k === 'linkedin') li.push(seg)
    else if (k === 'portfolio') port.push(seg)
  }
  return [...loc, ...phone, ...email, ...li, ...port].join('  •  ')
}

const TAILORED_RESUME_JSON_VERSION = 1

/** Strip ```json fences from model output. */
function stripAssistantJsonFence(s) {
  let t = String(s || '').trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '')
    const idx = t.lastIndexOf('```')
    if (idx !== -1) t = t.slice(0, idx)
  }
  return t.trim()
}

function normalizeTailoredResumeJson(raw) {
  const c = raw && typeof raw.contact === 'object' ? raw.contact : {}
  let websites = Array.isArray(c.websites) ? c.websites.map(w => String(w || '').trim()) : []
  while (websites.length < 2) websites.push('')
  websites = websites.slice(0, 2)
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map(s => {
        const title = String(s.title || '').trim()
        const rawLines = Array.isArray(s.lines) ? s.lines.map(l => String(l)) : []
        const lines =
          resumeSectionId(title) === 'education' ? expandEducationRawLines(rawLines) : rawLines
        return { title, lines }
      })
    : []
  return {
    version: TAILORED_RESUME_JSON_VERSION,
    name: String(raw.name || '').trim(),
    headline: String(raw.headline || '').trim(),
    contact: {
      location: String(c.location || '').trim(),
      phone: String(c.phone || '').trim(),
      email: String(c.email || '').trim(),
      websites,
    },
    sections,
  }
}

/** @returns {{ ok: true, data: object } | { ok: false }} */
function parseTailoredResumeJson(text) {
  const t = stripAssistantJsonFence(text)
  if (!t.startsWith('{')) return { ok: false }
  try {
    const raw = JSON.parse(t)
    if (!raw || typeof raw !== 'object') return { ok: false }
    const data = normalizeTailoredResumeJson(raw)
    return { ok: true, data }
  } catch {
    return { ok: false }
  }
}

function tailoredResumeJsonToPlainText(data) {
  const d = normalizeTailoredResumeJson(data)
  const { contact: c } = d
  const web = (c.websites || []).filter(Boolean).join(' • ')
  const contactLine = [c.location, c.phone, c.email, web].filter(Boolean).join(' • ')
  const lines = [d.name, d.headline, contactLine, '', ...d.sections.flatMap(sec => [sec.title.toUpperCase(), ...sec.lines, ''])]
  return lines.join('\n').trim()
}

function tailoredResumeHrefForWebsite(w) {
  const s = String(w || '').trim()
  if (!s) return '#'
  if (/^https?:\/\//i.test(s)) return s
  if (/^www\./i.test(s)) return `https://${s}`
  return `https://${s}`
}

/** Contact row: location • phone • email (mailto) • up to 2 URLs — single line, 10px, scroll if needed; links cyan. */
function TailoredResumeJsonContactRow({ contact }) {
  const c = normalizeTailoredResumeJson({ contact }).contact
  const chunks = []
  let k = 0
  const sep = <span key={`sep-${k++}`} style={{ color: C.resumeContactSep, userSelect: 'none' }}> · </span>
  const pushSep = () => {
    if (chunks.length) chunks.push(sep)
  }
  if (c.location) {
    chunks.push(
      <span key={`loc-${k++}`} style={{ color: C.resumeContact }}>
        {c.location}
      </span>,
    )
  }
  if (c.phone) {
    pushSep()
    chunks.push(
      <span key={`ph-${k++}`} style={{ color: C.resumeContact }}>
        {c.phone}
      </span>,
    )
  }
  if (c.email) {
    pushSep()
    chunks.push(
      <a key={`em-${k++}`} href={`mailto:${c.email}`} style={linkStyleContact}>
        {c.email}
      </a>,
    )
  }
  for (const w of c.websites || []) {
    if (!String(w).trim()) continue
    pushSep()
    const href = tailoredResumeHrefForWebsite(w)
    chunks.push(
      <a key={`w-${k++}`} href={href} target="_blank" rel="noopener noreferrer" style={linkStyleContact}>
        {w}
      </a>,
    )
  }
  return (
    <div
      style={{
        fontSize: 10,
        lineHeight: 1.45,
        fontWeight: 400,
        color: C.resumeContact,
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        overflowY: 'hidden',
        maxWidth: '100%',
        WebkitOverflowScrolling: 'touch',
        marginTop: 2,
      }}
    >
      {chunks}
    </div>
  )
}

function TailoredResumeJsonProjectLines({ lines }) {
  const ls = lines.map(l => String(l).trim()).filter(Boolean)
  if (!ls.length) return null
  const blocks = splitProjectLines(ls)
  return (
    <>
      {blocks.map((b, idx) => (
        <div key={idx} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, lineHeight: 1.45, color: C.resumeBody }}>
            <span style={{ fontWeight: 700, color: C.resumeSectionTitle }}>{b.title}</span>
            {b.tools ? (
              <>
                <span style={{ fontWeight: 400, color: C.resumeBody }}>{' - '}</span>
                <span style={{ fontWeight: 400, color: C.resumeBody }}>{b.tools}</span>
              </>
            ) : null}
          </div>
          {b.desc.map((d, j) => (
            <p
              key={j}
              style={{
                margin: '2px 0 0',
                fontSize: 11,
                fontWeight: 400,
                lineHeight: 1.5,
                color: C.resumeBody,
                whiteSpace: 'pre-wrap',
              }}
            >
              {d}
            </p>
          ))}
        </div>
      ))}
    </>
  )
}

function TailoredResumeJsonEducationLines({ lines }) {
  const ls = expandEducationRawLines(lines.map(l => String(l).trim()).filter(Boolean))
  if (!ls.length) return null
  const blocks = splitEducationLines(ls)
  return (
    <>
      {blocks.map((b, idx) => (
        <div key={idx} style={{ marginBottom: 10 }}>
          {/* Line 1 only: bold title (school / certificate + platform). */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontStyle: 'normal',
              lineHeight: 1.45,
              color: C.resumeSectionTitle,
            }}
          >
            {formatEducationTitleLine(b.title)}
          </div>
          {/* Line 2+: always regular weight — never bold. */}
          {b.desc.length ? (
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                fontWeight: 400,
                fontStyle: 'normal',
                lineHeight: 1.5,
                color: C.resumeBody,
              }}
            >
              <p style={{ margin: 0, fontWeight: 400, fontStyle: 'normal', color: 'inherit' }}>
                {joinEducationDescriptionParts(b.desc)}
              </p>
            </div>
          ) : null}
        </div>
      ))}
    </>
  )
}

/** Skills: one flowing block — skill • skill • … wraps like a paragraph (not a vertical list). */
function TailoredResumeJsonSkillsInline({ items }) {
  if (!items?.length) return null
  return (
    <div
      style={{
        margin: '0 0 12px 0',
        fontSize: 11,
        lineHeight: 1.65,
        color: C.resumeBody,
        maxWidth: '100%',
      }}
    >
      {items.map((item, i) => (
        <span key={i}>
          {item}
          {i < items.length - 1 && (
            <span style={{ color: C.resumeContactSep, userSelect: 'none' }} aria-hidden>
              {' '}
              •{' '}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

/** Render one section's lines (bullets + paragraphs); experience uses TailoredExperienceParagraph. */
function TailoredResumeJsonSectionLines({ lines, sectionId }) {
  if (sectionId === 'projects') return <TailoredResumeJsonProjectLines lines={lines} />
  if (sectionId === 'education') return <TailoredResumeJsonEducationLines lines={lines} />
  const ls = lines.map(l => String(l).trim()).filter(Boolean)
  if (!ls.length) return null
  const nodes = []
  let bulletBuf = []
  let key = 0

  const flushBullets = () => {
    if (!bulletBuf.length) return
    if (sectionId === 'skills') {
      nodes.push(<TailoredResumeJsonSkillsInline key={`sk-${key++}`} items={bulletBuf} />)
    } else {
      nodes.push(
        <ul
          key={`ul-${key++}`}
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
            <li key={i} style={{ marginBottom: 6, paddingLeft: 2 }}>
              {item}
            </li>
          ))}
        </ul>,
      )
    }
    bulletBuf = []
  }
  let i = 0
  while (i < ls.length) {
    if (lineLooksLikeResumeBulletLine(ls[i])) {
      bulletBuf.push(stripResumeBulletPrefix(ls[i]))
      i++
      continue
    }
    flushBullets()
    const para = []
    while (i < ls.length && !lineLooksLikeResumeBulletLine(ls[i])) {
      para.push(ls[i])
      i++
    }
    if (para.length) {
      if (sectionId === 'experience') {
        nodes.push(<TailoredExperienceParagraph key={`exp-${key++}`} paraLines={para} />)
      } else if (sectionId === 'skills') {
        const items = para
          .flatMap(line => String(line).split(/[,;]+/))
          .map(s => s.trim())
          .filter(Boolean)
        if (items.length) {
          nodes.push(<TailoredResumeJsonSkillsInline key={`sk-para-${key++}`} items={items} />)
        }
      } else {
        nodes.push(
          <p
            key={`p-${key++}`}
            style={{
              margin: '0 auto 10px',
              maxWidth: '100%',
              fontSize: 11.5,
              lineHeight: 1.48,
              color: C.resumeBody,
              whiteSpace: 'pre-line',
            }}
          >
            {para.join('\n')}
          </p>,
        )
      }
    }
  }
  flushBullets()
  return <>{nodes}</>
}

function TailoredResumeJsonView({ data, paperBg = C.kitResumeBg }) {
  const d = normalizeTailoredResumeJson(data)
  const articleStyle = {
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
  }
  const nameStyle = {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.2,
    color: C.resumeName,
    letterSpacing: '-0.02em',
    margin: '0 0 6px',
    padding: 0,
  }
  const headlineStyle = {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.35,
    color: C.resumeHeadline,
    margin: '0 0 8px',
    padding: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
  return (
    <article style={articleStyle}>
      {d.name ? <h2 style={nameStyle}>{d.name}</h2> : null}
      {d.headline ? <div style={headlineStyle}>{normalizeHeadlineDisplay(d.headline)}</div> : null}
      <TailoredResumeJsonContactRow contact={d.contact} />
      {d.sections.map((sec, idx) => {
        const sid = resumeSectionId(sec.title)
        const titleU = sec.title || `SECTION ${idx + 1}`
        return (
          <div key={`sec-${idx}`} style={{ marginTop: idx === 0 ? 14 : 12 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: C.resumeSectionTitle,
                marginBottom: 8,
                padding: 0,
                paddingBottom: 0,
                lineHeight: 1.15,
                borderBottom: `1px solid ${C.borderStrong}`,
              }}
            >
              {titleU}
            </div>
            <TailoredResumeJsonSectionLines lines={sec.lines} sectionId={sid} />
          </div>
        )
      })}
    </article>
  )
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

/** Lines that look like contact/URL — never chosen as the name. */
function isLineExcludedFromNamePick(line) {
  const s = String(line || '').trim()
  if (!s) return true
  if (s.includes('@')) return true
  if (/http/i.test(s)) return true
  if (/linkedin/i.test(s)) return true
  if (/github/i.test(s)) return true
  if (s.includes('.com')) return true
  if (s.includes('•')) return true
  if (/\d{3}[-.\s)]?\d{3}[-.\s]?\d{4}/.test(s)) return true
  if (/\(\d{3}\)/.test(s)) return true
  if (/\b\d{3}-\d{3}-\d{4}\b/.test(s)) return true
  return false
}

/**
 * From lines above the contact row: ignore contact-like lines, then shortest remaining line = name;
 * all other non-excluded lines = headline parts (order preserved).
 */
function resolveNameHeadlineSlots(innerLines) {
  const inner = innerLines.map(l => String(l || '').trim()).filter(Boolean)
  if (inner.length === 0) return { name: '', headlineParts: [] }
  if (inner.length === 1) return { name: inner[0], headlineParts: [] }

  const candidates = inner.filter(l => !isLineExcludedFromNamePick(l))
  if (candidates.length === 0) {
    return { name: inner[0], headlineParts: inner.slice(1) }
  }
  if (candidates.length === 1) {
    return { name: candidates[0], headlineParts: [] }
  }

  let minLen = Infinity
  for (const line of candidates) {
    if (line.length < minLen) minLen = line.length
  }
  const nameIdx = candidates.findIndex(l => l.length === minLen)
  const name = candidates[nameIdx]
  const headlineParts = candidates.filter((_, i) => i !== nameIdx)
  return { name, headlineParts }
}

/** If the resolver picked a piped line as "name", it's a headline — show headline styling only for that text. */
function demotePipedNameToHeadline(name, headlineParts) {
  const n = String(name || '').trim()
  const parts = Array.isArray(headlineParts) ? [...headlineParts] : []
  if (n.includes('|')) {
    return { name: '', headlineParts: [n, ...parts] }
  }
  return { name: n, headlineParts: parts }
}

/** True if this line is clearly contact (email, URL, phone) — not a headline. */
function lineLooksLikeContact(line) {
  const s = String(line || '').trim()
  if (!s) return false
  if (/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(s)) return true
  if (/https?:\/\//i.test(s) || /\bwww\.[^\s]+/i.test(s)) return true
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(s)) return true
  if (/\b(linkedin\.com|github\.com|portfolio)\b/i.test(s)) return true
  if (/•/.test(s) && (/@|https?:|www\.|\d{3}-\d{3}/.test(s) || s.length > 24)) return true
  return false
}

/** Contact line only: email + http(s)/www — phones stay plain text (not links, not underlined). */
const LINKIFY_CONTACT_RE = /(https?:\/\/[^\s|•]+|www\.[^\s|•]+|[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,})/gi

const linkStyleContact = {
  color: C.cyan,
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

/** Name = 20px; headline = 12px — separate style objects; wrapper must not set fontSize (avoids inheritance issues). */
function TailoredResumeFirstHeader({ paraLines }) {
  const lines = paraLines.map(l => stripResumeHeaderLabel(String(l).trim())).filter(Boolean)
  if (!lines.length) {
    const raw = paraLines.map(l => String(l).trim()).filter(Boolean).join('\n')
    if (!raw) return null
    return (
      <p
        style={{
          margin: '0 0 14px',
          maxWidth: '100%',
          fontSize: 11.5,
          lineHeight: 1.48,
          color: C.resumeBody,
          whiteSpace: 'pre-line',
        }}
      >
        {raw}
      </p>
    )
  }
  const contactBlock = (raw) => {
    const joined = orderContactLineForDisplay(raw)
    return (
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.55,
          fontWeight: 400,
          color: C.resumeContact,
          wordBreak: 'normal',
          overflowWrap: 'break-word',
        }}
      >
        {linkifyContactLine(joined)}
      </div>
    )
  }
  const tailoredResumeNameStyle = {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.2,
    color: C.resumeName,
    letterSpacing: '-0.02em',
    textTransform: 'none',
    margin: 0,
    padding: 0,
  }
  const tailoredResumeHeadlineStyle = {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.45,
    color: C.resumeHeadline,
    margin: 0,
    marginBottom: 6,
    padding: 0,
    maxWidth: '100%',
  }
  if (lines.length === 1) {
    return (
      <div style={{ width: '100%', margin: '0 0 14px', textAlign: 'left' }}>
        <div style={{ ...tailoredResumeNameStyle, marginBottom: 0 }}>{lines[0]}</div>
      </div>
    )
  }
  if (lines.length === 2) {
    /** Blank line before contact → only 2 lines in block: often headline then name (not name+contact). */
    if (lineLooksLikeContact(lines[1])) {
      let name = ''
      let headline = ''
      if (lines[0].includes('|')) {
        name = ''
        headline = normalizeHeadlineDisplay(lines[0])
      } else {
        const parsed = demotePipedNameToHeadline(lines[0], [])
        name = parsed.name
        headline = normalizeHeadlineDisplay(parsed.headlineParts.join(' | '))
      }
      console.log('[TailoredResumeFirstHeader] 2-line (name + contact)', { name, headline })
      return (
        <div style={{ width: '100%', margin: '0 0 14px', textAlign: 'left' }}>
          {name ? <div style={{ ...tailoredResumeNameStyle, marginBottom: headline ? 4 : 6 }}>{name}</div> : null}
          {headline ? <div style={{ ...tailoredResumeHeadlineStyle, marginBottom: 6 }}>{headline}</div> : null}
          {contactBlock(lines[1])}
        </div>
      )
    }
    let { name, headlineParts } = resolveNameHeadlineSlots(lines)
    ;({ name, headlineParts } = demotePipedNameToHeadline(name, headlineParts))
    console.log('[TailoredResumeFirstHeader] 2-line (name + headline)', { name, headlineParts })
    const headline = normalizeHeadlineDisplay(headlineParts.join(' | '))
    return (
      <div style={{ width: '100%', margin: '0 0 14px', textAlign: 'left' }}>
        {name ? <div style={{ ...tailoredResumeNameStyle, marginBottom: headline ? 4 : 0 }}>{name}</div> : null}
        {headline ? <div style={tailoredResumeHeadlineStyle}>{headline}</div> : null}
      </div>
    )
  }
  const contactLine = lines[lines.length - 1]
  const inner = lines.slice(0, -1)
  let { name, headlineParts } = resolveNameHeadlineSlots(inner)
  ;({ name, headlineParts } = demotePipedNameToHeadline(name, headlineParts))
  console.log('[TailoredResumeFirstHeader] 3+ line (name + headline + contact)', { name, headlineParts })
  const headline = normalizeHeadlineDisplay(headlineParts.join(' | '))
  return (
    <div style={{ width: '100%', margin: '0 0 16px', textAlign: 'left' }}>
      {name ? <div style={{ ...tailoredResumeNameStyle, marginBottom: 4 }}>{name}</div> : null}
      {headline ? <div style={tailoredResumeHeadlineStyle}>{headline}</div> : null}
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
        <span style={{ fontWeight: 700, fontSize: 11, color: C.resumeSectionTitle, lineHeight: 1.35 }}>{title}</span>
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
          color: C.resumeSectionTitle,
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
                <span style={{ color: C.resumeContactSep, userSelect: 'none', fontSize: 10 }} aria-hidden>
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
    const isBullet = lineLooksLikeResumeBulletLine(trimmed)
    if (isBullet) {
      const bulletText = stripResumeBulletPrefix(trimmed)
      bulletBuf.push(bulletText)
      i++
      continue
    }
    flushBullets()
    if (
      resumeLineLooksSection(trimmed) &&
      (!isFirstContactBlock || lineLooksLikeKnownResumeSectionTitle(trimmed))
    ) {
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
      isFirstContactBlock = false
      i++
      continue
    }
    const paraLines = [trimmed]
    i++
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t) break
      if (lineLooksLikeResumeBulletLine(t)) break
      if (
        resumeLineLooksSection(t) &&
        (!isFirstContactBlock || lineLooksLikeKnownResumeSectionTitle(t))
      ) {
        break
      }
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
  const articleStyle = {
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
  }
  if (!nodes.length && body) {
    return (
      <article style={articleStyle}>
        <p
          style={{
            margin: '0 auto 10px',
            maxWidth: '100%',
            fontSize: 11.5,
            lineHeight: 1.48,
            color: C.resumeBody,
            whiteSpace: 'pre-line',
          }}
        >
          {body}
        </p>
      </article>
    )
  }
  return (
    <article style={articleStyle}>
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

/** Plain assistant text from Anthropic Messages API (multiple block shapes / thinking blocks). */
function anthropicMessageText(data) {
  const raw = data?.content ?? data?.message?.content
  if (typeof raw === 'string') return raw
  if (!Array.isArray(raw)) return ''
  let out = ''
  for (const block of raw) {
    if (block == null) continue
    if (typeof block.text === 'string') {
      out += block.text
      continue
    }
    if (block.type === 'text' && typeof block.text === 'string') {
      out += block.text
    }
  }
  return out
}

function kitFetchMessages(apiKey, system, userContent, maxTokens = 3000, model = KIT_MESSAGES_MODEL) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
}

function KitActionRow({
  onRegenerate,
  hideRegenerate,
  regenDisabled,
  regenLabel,
  copyText,
  onMyResumePlusClick,
  onDownloadPdf,
  downloadDisabled,
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
      {!hideRegenerate && (
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
      )}
      <CopyBtn text={copyText} style={{ marginTop: 0, minHeight: 32 }} />
      {typeof onDownloadPdf === 'function' && (
        <Btn small primary disabled={downloadDisabled} onClick={onDownloadPdf}>
          Download PDF →
        </Btn>
      )}
      <button
        type="button"
        onClick={onMyResumePlusClick}
        style={{
          ...KIT_ACTION_BTN,
          border: `1px solid ${C.borderStrong}`,
          background: C.surface,
          color: C.text,
        }}
      >
        myResume+
      </button>
    </div>
  )
}

function MyResumePlusSection({
  r,
  voiceProfile,
  apiKey,
  keySaved,
  allowApplyOutputs,
  showCoverLetter,
  showOutreach,
  embedded,
  onOpenMyResumeTab,
  experienceLevel,
}) {
  const storageKey = KIT_TAILORED_RESUME_PREFIX + String(r?.id ?? `${r?.jobTitle || ''}_${r?.company || ''}`.replace(/\s/g, '_'))
  const [mainOpen, setMainOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [tailored, setTailored] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [coverText, setCoverText] = useState('')
  const [connectText, setConnectText] = useState('')
  const autoGenAttemptedRef = useRef(null)

  useEffect(() => {
    setMainOpen(false)
    setConnectOpen(false)
    setCoverOpen(false)
    setResumeOpen(false)
    autoGenAttemptedRef.current = null
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
    ? '\n\nVOICEPRINT (tone and wording only — do not add facts from here):\n' + String(voiceProfile.analysis).slice(0, 1000)
    : ''

  const tailoredResumePayload = useMemo(() => parseTailoredResumeJson(tailored), [tailored])
  const resumeCopyPlain = useMemo(() => {
    if (tailoredResumePayload.ok) return tailoredResumeJsonToPlainText(tailoredResumePayload.data)
    return tailored
  }, [tailored, tailoredResumePayload])

  const generateTailoredResume = useCallback(async () => {
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
        ? '\n\nTRANSFERABLE / GAP-BRIDGING NOTES FROM ANALYSIS (use for wording and emphasis only; every fact must still appear in the source resume):\n' + transferNotes.slice(0, 4000) + '\n'
        : ''
      const jsonShape =
        'OUTPUT FORMAT: Return ONE JSON object only (no markdown fences, no commentary before or after). Schema:\n' +
        '{\n' +
        '  "version": 1,\n' +
        '  "name": "Full name",\n' +
        '  "headline": "Professional title | pipe-separated phrases — MUST be short enough for ONE line (~85 characters max; no line breaks)",\n' +
        '  "contact": {\n' +
        '    "location": "City, ST or region",\n' +
        '    "phone": "One phone number as plain text",\n' +
        '    "email": "address@domain.com",\n' +
        '    "websites": ["linkedin.com/in/username", "yoursite.com/portfolio"]\n' +
        '  },\n' +
        '  "sections": [\n' +
        '    { "title": "SUMMARY", "lines": ["paragraph text"] },\n' +
        '    { "title": "SKILLS", "lines": ["- Skill one", "- Skill two"] },\n' +
        '    { "title": "EXPERIENCE", "lines": ["Job Title    Start – End", "Company", "- bullet", "- bullet"] },\n' +
        '    { "title": "PROJECTS", "lines": ["ProjectTitle - Tool A • Tool B • Tool C", "One brief description paragraph per project.", "OtherProject - React • Node"] },\n' +
        '    { "title": "EDUCATION", "lines": ["Google IT Professional Certificate - Coursera", "IT Fundamentals, Project Management", "University Name — Degree", "Major, Honors"] }\n' +
        '  ]\n' +
        '}\n' +
        'Rules: contact.websites must be an array of EXACTLY two strings (use empty string "" if a slot is unused). ' +
        'Contact URLs — for every user: always display website strings without the https:// or http:// prefix (e.g. linkedin.com/in/janedoe, github.com/janedoe, portfolio.example.com). Never include the scheme in the JSON; the app adds it for links. ' +
        'Facts only from the source resume. Reorder/emphasize sections as needed for the job. ' +
        'Include every substantive section that appears in the source resume (e.g. PROJECTS, EDUCATION, CERTIFICATIONS); do not drop whole sections that contain real content from the source.\n' +
        'PROJECTS lines: for each project, first line MUST be "ProjectName - tool1 • tool2 • tool3" (space-dash-space after name; tools separated by •). Following lines are a short description only.\n' +
        'EDUCATION lines: for each credential or school, put the title on line 1 (e.g. "Google IT Professional Certificate - Coursera"); put all details on line 2+ as plain text (e.g. "IT Fundamentals, Project Management"). The UI renders line 1 bold and line 2+ regular weight only—never put bold markdown in JSON. Use commas between multiple detail items. Do not use bullet lists, dashes, or • in education detail lines.\n' +
        'SKILLS lines: no category labels. Use one "- Skill name" per line in the array (order matters). First five lines = five most job-relevant skills; remaining skills follow. Do not use a vertical list in prose—each line is one skill; the UI joins them with • and wraps as a paragraph.\n'

      const userContent =
        'Target role: ' + jobLine + '\n\n' +
        (jdBlock
          ? 'JOB DESCRIPTION — use for keyword alignment, section emphasis, and terminology: mirror phrasing the posting uses only where your resume honestly supports it. Do not invent qualifications.\n' +
            jdBlock.slice(0, 6000) +
            '\n\n'
          : '') +
        gapsSec +
        transferSec +
        'SOURCE RESUME — sole source of truth for facts (employers, dates, titles, education, tools, metrics). Do not add, remove, or alter facts:\n' +
        sourceResume.slice(0, 9000) +
        voiceSec +
        '\n\nTASK: Produce one best tailored resume in this single response. Combine (1) job-description keywords and priorities above for emphasis and honest wording, (2) facts only from the source resume, (3) VoicePrint notes above for tone and style only — not new facts. Use gap/transfer notes only to reframe existing experience. Never invent experience.\n' +
        jsonShape

      const res = await kitFetchMessages(
        apiKey,
        buildTailoredResumeSystemPrompt(experienceLevel),
        userContent,
        4096,
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error?.message || 'API error ' + res.status)
      }
      const data = await res.json()
      const text = anthropicMessageText(data).trim()
      const parsed = parseTailoredResumeJson(text)
      if (parsed.ok) {
        const pretty = JSON.stringify(parsed.data, null, 2)
        setTailored(pretty)
        try {
          sessionStorage.setItem(storageKey, pretty)
        } catch { /* ignore */ }
      } else {
        setTailored(text)
        try {
          sessionStorage.setItem(storageKey, text)
        } catch { /* ignore */ }
      }
    } catch (e) {
      setErr(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [
    keySaved,
    apiKey,
    sourceResume,
    jdBlock,
    jobLine,
    gapsLine,
    transferNotes,
    r?.jobTitle,
    voiceProfile?.analysis,
    storageKey,
    experienceLevel,
  ])

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
    generateTailoredResume()
  }, [resumeOpen, storageKey, canGenerate, keySaved, apiKey, generateTailoredResume])

  useEffect(() => {
    if (!coverOpen || !showCoverLetter) return
    const t = String(coverText || '').trim()
    if (t) return
    const fromR = String(r?.coverLetter || '').trim()
    if (fromR) setCoverText(fromR)
  }, [coverOpen, showCoverLetter, r?.coverLetter, coverText])

  useEffect(() => {
    if (!connectOpen || !showOutreach) return
    const t = String(connectText || '').trim()
    if (t) return
    const fromR = String(r?.outreachMessage || '').trim()
    if (fromR) setConnectText(fromR)
  }, [connectOpen, showOutreach, r?.outreachMessage, connectText])

  const onResumeRowClick = () => {
    setResumeOpen(v => !v)
  }

  const onCoverRowClick = () => {
    setCoverOpen(v => {
      const n = !v
      if (n) {
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
        const fromR = String(r?.outreachMessage || '').trim()
        if (fromR && !String(connectText || '').trim()) setConnectText(fromR)
      }
      return n
    })
  }

  const goMyResume = () => {
    if (typeof onOpenMyResumeTab === 'function') onOpenMyResumeTab()
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
                    <Dots /> Drafting your resume… usually under a minute.
                  </div>
                )}
                {!loading && (
                  <>
                    {err && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{err}</div>}
                    {tailoredResumePayload.ok ? (
                      <TailoredResumeJsonView data={tailoredResumePayload.data} paperBg={C.kitResumeBg} />
                    ) : (
                      <TailoredResumeView text={tailored} paperBg={C.kitResumeBg} />
                    )}
                    <KitActionRow
                      hideRegenerate
                      copyText={resumeCopyPlain}
                      onMyResumePlusClick={goMyResume}
                      onDownloadPdf={
                        tailoredResumePayload.ok
                          ? () =>
                              generateTailoredResumeJsonPDF(
                                tailoredResumePayload.data,
                                `${r?.jobTitle || 'Role'}_${r?.company || 'Company'}`,
                              )
                          : undefined
                      }
                      downloadDisabled={!tailored.trim() || !tailoredResumePayload.ok}
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
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: C.kitResumeBg, border: `1px solid ${C.border}` }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.72, fontFamily: "'DM Sans', sans-serif", color: C.text, margin: 0 }}>{coverText}</pre>
                  </div>
                  <KitActionRow
                    hideRegenerate
                    copyText={coverText}
                    onMyResumePlusClick={goMyResume}
                    onDownloadPdf={() => generateCoverLetterPDF(coverText)}
                    downloadDisabled={!String(coverText || '').trim()}
                  />
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
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: C.kitResumeBg, border: `1px solid ${C.border}` }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.72, fontFamily: "'DM Sans', sans-serif", color: C.text, margin: 0 }}>{connectText}</pre>
                  </div>
                  <KitActionRow
                    hideRegenerate
                    copyText={connectText}
                    onMyResumePlusClick={goMyResume}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function buildSystemPrompt(resumeSection, voiceSection, userName, userContact, userLinks, bannedPhrases, applyThreshold) {
  const voiceInstruction = (voiceSection && voiceSection.trim().length > 0)
    ? 'Match the candidate voice profile exactly — their tone, rhythm, word choices, and anything they flag as unnatural. The voice profile is the only style guide. Do not impose your own style.'
    : 'No voice profile provided. Write professionally and neutrally. Clear, direct, human-sounding.'

  const threshold = Number.isFinite(Number(applyThreshold)) ? Math.max(0, Math.min(100, Number(applyThreshold))) : 85
  const scoringRules =
    `SCORING: 0-100. ${threshold}+=APPLY+full output (include coverLetter and outreachMessage). <${threshold}=SKIP: verdict SKIP, set coverLetter to "" and outreachMessage to "" (no draft apply materials). Verdict SCAM: set coverLetter and outreachMessage to "".\nSCAM flags: no real company, vague duties, unusually high pay, MLM, asks personal info, poor grammar.`

  const bestVersionBar =
    'BEST VERSION (one response — combine all three):\n' +
    '- Job posting: Read the user\'s job description (or URL context) for role title, must-have skills, and recurring keywords. Use that language to inform matchedSkills, missingSkills, companySnapshot, and honest alignment in the letter — but the job text is NOT permission to invent resume facts.\n' +
    '- Resume: The candidate resume above is the only source of employers, dates, titles, tools, metrics, and education. Never claim experience that is not supported there.\n' +
    '- VoicePrint: When a voice profile is provided, it governs tone, rhythm, word choice, and banned phrasing for coverLetter, outreachMessage, and transferableNotes. If no voice profile, write clear professional prose.\n'

  return 'You are a job match analyzer and cover letter writer.\n' +
    resumeSection + '\n' +
    voiceSection + '\n\n' +
    scoringRules + '\n\n' +
    bestVersionBar + '\n' +
    'OUTPUT — valid JSON only, no markdown:\n' +
    '{"jobTitle":"","company":"","score":0,"verdict":"APPLY|SKIP|SCAM","verdictReason":"","scamFlags":[],"companySnapshot":"","matchedSkills":[],"missingSkills":[],"transferableNotes":"","coverLetter":"","projectIdea":"","projectAIPrompt":"","outreachMessage":""}\n\n' +
    'COVER LETTER (3 paragraphs, 250-350 words):\n' +
    '- Deliver one polished final draft for coverLetter and outreachMessage in this response — the app does not request alternate AI rewrites. That draft should be your best blend of job-posting keywords and fit, resume-backed facts, and VoicePrint style.\n' +
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

function SettingsTab({ profile, onProfileSaved, experienceLevel, onExperienceLevelChange }) {
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
          <div>
            <Label>Experience level</Label>
            <select
              value={experienceLevel}
              onChange={e => onExperienceLevelChange(e.target.value)}
              style={{ ...field, cursor: 'pointer' }}
            >
              {EXPERIENCE_LEVEL_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
              Tailored resume length: Entry and Mid → one page; Senior/Lead and Executive → up to two pages.
            </p>
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
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, fontFamily: "'Syne', 'DM Sans', sans-serif" }}>myResume+ <span style={{ color: C.cyan }}>▸</span></h1>
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
  const [experienceLevel, setExperienceLevel] = useState(loadExperienceLevel)
  const [currentResult, setCurrentResult] = useState(null)
  const [docView, setDocView] = useState(null)

  function onExperienceLevelChange(v) {
    const next = EXPERIENCE_LEVEL_OPTIONS.includes(v) ? v : 'Mid Level'
    setExperienceLevel(next)
    try {
      localStorage.setItem(VA_EXPERIENCE_LEVEL_KEY, next)
    } catch { /* ignore */ }
  }

  function saveKey() {
    if (!apiKey.startsWith('sk-ant-')) { alert("Anthropic keys start with sk-ant-"); return }
    localStorage.setItem('va_key',apiKey); setKeySaved(true)
  }
  function onResult(result) {
    const entry = {...result, timestamp:new Date().toLocaleString(), id:Date.now()}
    const updated = [entry,...history].slice(0,50)
    setHistory(updated); localStorage.setItem('va_history',JSON.stringify(updated)); setCurrentResult(entry)
  }
  /** Score below threshold: unlock Upskill + myResume+ without re-calling the analyzer (same stored result). */
  function markApplyAnywayForResult(entry) {
    if (!entry) return
    const next = { ...entry, applyAnyway: true }
    setCurrentResult(next)
    setHistory(h => {
      const u = h.map(x => (x.id === entry.id ? next : x))
      try {
        localStorage.setItem('va_history', JSON.stringify(u))
      } catch { /* ignore */ }
      return u
    })
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
                {NAV.map(({ id, label }) => (
                  <button key={id} onClick={() => { setTab(id); setDocView(null) }} style={{
                    padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
                    fontSize:13, fontWeight:500, fontFamily:"'DM Sans', sans-serif",
                    background:tab===id?C.dark:'transparent', color:tab===id?'#fff':C.muted, transition:'all 0.15s',
                  }}>
                    {label}
                    {id==='History'&&history.length>0&&<span style={{ marginLeft:5, fontSize:10, background:C.cyanDim, color:C.cyan, padding:'1px 5px', borderRadius:10, fontFamily:'monospace' }}>{history.length}</span>}
                    {id==='VoicePrint'&&!voiceProfile&&<span style={{ marginLeft:5, fontSize:10, background:C.amberBg, color:C.amber, padding:'1px 5px', borderRadius:10 }}>!</span>}
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
            {tab==='Analyze' && (
              <AnalyzeTab
                apiKey={apiKey}
                keySaved={keySaved}
                voiceProfile={voiceProfile}
                onResult={onResult}
                currentResult={currentResult}
                setCurrentResult={setCurrentResult}
                setTab={setTab}
                profile={profile}
                experienceLevel={experienceLevel}
                onMarkApplyAnyway={markApplyAnywayForResult}
              />
            )}
            {tab==='Documents' && (
              docView==='cover' ? <CoverLetterEditor key={lastWithCover?.id ?? 'cover'} coverLetter={lastWithCover?.coverLetter||''} jobTitle={lastWithCover?.jobTitle||''} company={lastWithCover?.company||''} onClose={() => setDocView(null)} profile={profile} />
              : docView==='resume' ? <ResumeEditor onClose={() => setDocView(null)} profile={profile} />
              : <DocumentsTab onOpenCover={() => setDocView('cover')} onOpenResume={() => setDocView('resume')} lastWithCover={lastWithCover} />
            )}
            {tab==='VoicePrint' && <VoicePrintTab apiKey={apiKey} keySaved={keySaved} voiceProfile={voiceProfile} onVoiceSaved={onVoiceSaved} />}
            {tab==='History' && <HistoryTab history={history} onView={r => { setCurrentResult(r); setTab('Analyze') }} />}
            {tab==='Settings' && (
              <SettingsTab
                profile={profile}
                onProfileSaved={onProfileSaved}
                experienceLevel={experienceLevel}
                onExperienceLevelChange={onExperienceLevelChange}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function AnalyzeTab({
  apiKey,
  keySaved,
  voiceProfile,
  onResult,
  currentResult,
  setCurrentResult,
  setTab,
  profile,
  experienceLevel,
  onMarkApplyAnyway,
}) {
  const [jd, setJd] = useState('')
  const [inputMode, setInputMode] = useState('description')
  const [jobUrl, setJobUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [error, setError] = useState('')
  const msgs = ['Reading the job posting...','Checking for scam signals...','Scoring your skills match...','Writing your cover letter...','Almost done...']

  async function analyze() {
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
        body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2500, system:buildSystemPrompt(resumeSection,voiceSection,userName,userContact,userLinks,bannedPhrases,applyThreshold), messages:[{ role:'user', content:userPrompt }] }),
      })
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||'API error '+res.status) }
      const data = await res.json()
      const parsed = JSON.parse(data.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim())
      onResult({
        ...parsed,
        applyAnyway: false,
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
      <p style={{ fontSize:11, fontStyle:'italic', color:C.muted, marginBottom:24, lineHeight:1.6, marginTop:0 }}>
        Paste a job description to get your match score, tailored resume, cover letter, connection message, and upskilling ideas!
      </p>
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
        <button
          type="button"
          onClick={() => analyze()}
          disabled={loading}
          style={{
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: 'transparent',
            padding: '4px 0',
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            lineHeight: 1,
            opacity: loading ? 0.45 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
          aria-label={loading ? 'Running job analysis' : 'Begin analysis'}
          title={loading ? 'Analyzing…' : 'Begin analysis'}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1 }}>Begin Analysis</span>
          <span style={{ fontSize: 9, color: C.cyan, display: 'inline-block', lineHeight: 1 }} aria-hidden="true">
            ▶
          </span>
        </button>
      </div>
      {error && <div style={{ marginTop:20, padding:'14px 18px', borderRadius:12, background:C.redBg, border:`1px solid rgba(155,35,53,0.15)`, fontSize:13, color:C.red }}><strong>Something went wrong:</strong> {error}</div>}
      {currentResult && (
        <ResultCard
          result={currentResult}
          onApplyAnyway={() => currentResult && onMarkApplyAnyway(currentResult)}
          apiKey={apiKey}
          keySaved={keySaved}
          voiceProfile={voiceProfile}
          matchThreshold={Number.isFinite(Number(profile?.matchThreshold)) ? Number(profile.matchThreshold) : 85}
          setTab={setTab}
          experienceLevel={experienceLevel}
        />
      )}
    </div>
  )
}

function ResultCard({ result:r, onApplyAnyway, apiKey, keySaved, voiceProfile, matchThreshold, setTab, experienceLevel }) {
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
          {r.verdict === 'SKIP' && onApplyAnyway && (
            <button type="button" onClick={onApplyAnyway} style={{ fontSize:12, padding:'5px 14px', borderRadius:20, background:C.surface2, border:`1px solid ${C.border}`, cursor:'pointer', color:C.muted, fontFamily:"'DM Sans', sans-serif" }}>
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
                onOpenMyResumeTab={() => setTab('Documents')}
                experienceLevel={experienceLevel}
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
              onOpenMyResumeTab={() => setTab('Documents')}
              experienceLevel={experienceLevel}
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