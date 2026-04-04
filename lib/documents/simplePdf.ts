/**
 * Minimal pure-JS PDF generator for text documents.
 * No dependencies. Suitable for simple formatted letters.
 * Uses Helvetica (built-in Type1 font, no embedding required).
 */

function esc(s: string): string {
  // Keep only latin1 printable range; escape PDF string delimiters
  return s
    .replace(/[^\x20-\x7e\xa0-\xff]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapLine(text: string, maxChars = 76): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!w) continue
    const candidate = cur ? `${cur} ${w}` : w
    if (candidate.length > maxChars && cur) {
      lines.push(cur)
      cur = w.length > maxChars ? w.slice(0, maxChars) : w
    } else {
      cur = candidate
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

export function createTextPdf(title: string, body: string): Buffer {
  const X = 70
  const Y_TITLE = 720
  const LINE_H = 16
  const PARA_GAP = 8
  const BOTTOM = 70

  const ops: string[] = ['BT', '/F1 13 Tf']
  let y = Y_TITLE

  // Title
  ops.push(`1 0 0 1 ${X} ${y} Tm`)
  ops.push(`(${esc(title)}) Tj`)
  y -= LINE_H * 2.2

  // Body — switch to 11pt
  ops.push('/F1 11 Tf')

  for (const [pi, para] of body.split('\n\n').entries()) {
    if (pi > 0) y -= PARA_GAP
    for (const sub of para.trim().split('\n')) {
      for (const line of (sub.trim() ? wrapLine(sub) : [''])) {
        if (y < BOTTOM) break
        ops.push(`1 0 0 1 ${X} ${y} Tm`)
        ops.push(`(${esc(line)}) Tj`)
        y -= LINE_H
      }
    }
  }

  ops.push('ET')

  const stream = ops.join('\n')
  // For latin1 strings, string.length === byte length
  const streamLen = stream.length

  const objs = [
    '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj',
    '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj',
    '3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>\nendobj',
    '4 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>\nendobj',
    `5 0 obj\n<</Length ${streamLen}>>\nstream\n${stream}\nendstream\nendobj`,
  ]

  let pdf = '%PDF-1.4\n'
  const xrefs: number[] = []
  for (const obj of objs) {
    xrefs.push(pdf.length)
    pdf += obj + '\n'
  }

  const xrefPos = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (const off of xrefs) {
    pdf += off.toString().padStart(10, '0') + ' 00000 n \n'
  }
  pdf += `trailer\n<</Size ${objs.length + 1} /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`

  return Buffer.from(pdf, 'latin1')
}
