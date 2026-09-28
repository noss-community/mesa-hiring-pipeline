import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { extractPII, scoreCV, generateBrief, draftEmail } from '@/lib/claude'
import { computeTotal, checkPass } from '@/lib/rubric'
import type { Role } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let cvText = ''
  let role: Role = 'PM'

  try {
    const form = await req.formData()
    const file = form.get('cv') as File
    role = ((form.get('role') as string) || 'PM') as Role
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse')
      const parsed = await pdfParse(buf)
      cvText = parsed.text as string
    } else {
      cvText = buf.toString('utf-8')
    }
    if (!cvText.trim()) return NextResponse.json({ error: 'Empty file' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Parse error: ' + String(e) }, { status: 400 })
  }

  // Insert placeholder row to get an ID before running AI calls
  const rows = await sql`
    INSERT INTO candidates (role, cv_text, status)
    VALUES (${role}, '…', 'scoring')
    RETURNING id
  `
  const id = rows[0].id as string

  try {
    // Only call that sees raw CV text — extracts and isolates PII
    const { name, email, phone, cleanText } = await extractPII(cvText)
    if (!email) {
      await sql`UPDATE candidates SET status = 'error', error_message = 'No email found in CV' WHERE id = ${id}::uuid`
      return NextResponse.json({ error: 'No email found in CV' }, { status: 422 })
    }

    // Store anonymised text; real PII goes to separate table, never back to AI
    await sql`UPDATE candidates SET cv_text = ${cleanText} WHERE id = ${id}::uuid`
    await sql`
      INSERT INTO candidate_pii (candidate_id, name, email, phone)
      VALUES (${id}::uuid, ${name}, ${email}, ${phone})
    `

    // Score anonymised CV against both roles
    const raw = await scoreCV(cleanText)
    const pm  = { c1: raw.pm.c1.score,  c2: raw.pm.c2.score,  c3: raw.pm.c3.score,  c4: raw.pm.c4.score  }
    const spm = { c1: raw.spm.c1.score, c2: raw.spm.c2.score, c3: raw.spm.c3.score, c4: raw.spm.c4.score }

    const pmTotal  = computeTotal(pm,  'PM')
    const spmTotal = computeTotal(spm, 'SPM')
    const { pass: pmPass,  flag: pmFlag  } = checkPass(pm,  pmTotal,  'PM')
    const { pass: spmPass, flag: spmFlag } = checkPass(spm, spmTotal, 'SPM')

    const appliedPass  = role === 'PM' ? pmPass  : spmPass
    const appliedTotal = role === 'PM' ? pmTotal : spmTotal

    const [brief, emailDraft] = await Promise.all([
      appliedPass ? generateBrief(cleanText, role, appliedTotal) : Promise.resolve(null),
      draftEmail(cleanText, role, appliedPass, appliedTotal),
    ])

    await sql`
      UPDATE candidates SET
        pm_c1_score  = ${pm.c1},  pm_c1_reason  = ${raw.pm.c1.reason},
        pm_c2_score  = ${pm.c2},  pm_c2_reason  = ${raw.pm.c2.reason},
        pm_c3_score  = ${pm.c3},  pm_c3_reason  = ${raw.pm.c3.reason},
        pm_c4_score  = ${pm.c4},  pm_c4_reason  = ${raw.pm.c4.reason},
        pm_total  = ${pmTotal},  pm_pass  = ${pmPass},  pm_flag  = ${pmFlag},
        spm_c1_score = ${spm.c1}, spm_c1_reason = ${raw.spm.c1.reason},
        spm_c2_score = ${spm.c2}, spm_c2_reason = ${raw.spm.c2.reason},
        spm_c3_score = ${spm.c3}, spm_c3_reason = ${raw.spm.c3.reason},
        spm_c4_score = ${spm.c4}, spm_c4_reason = ${raw.spm.c4.reason},
        spm_total = ${spmTotal}, spm_pass = ${spmPass}, spm_flag = ${spmFlag},
        interview_brief = ${brief},
        email_draft     = ${emailDraft},
        status = 'scored'
      WHERE id = ${id}::uuid
    `

    return NextResponse.json({ id, success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await sql`UPDATE candidates SET status = 'error', error_message = ${msg} WHERE id = ${id}::uuid`
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
