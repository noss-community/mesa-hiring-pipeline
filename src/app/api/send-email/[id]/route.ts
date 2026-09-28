import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendEmail } from '@/lib/resend'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const rows = await sql`
    SELECT c.*,
      COALESCE(
        json_agg(json_build_object('name', p.name, 'email', p.email))
        FILTER (WHERE p.candidate_id IS NOT NULL),
        '[]'::json
      ) AS candidate_pii
    FROM candidates c
    LEFT JOIN candidate_pii p ON p.candidate_id = c.id
    WHERE c.id = ${id}::uuid
    GROUP BY c.id
  `

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const c = rows[0]
  const pii = (c.candidate_pii as { name: string | null; email: string }[])[0]
  if (!pii?.email) return NextResponse.json({ error: 'No email on file' }, { status: 422 })

  const name = pii.name ?? 'there'
  const body = ((c.email_draft as string) ?? '').replace('[NAME]', name)
  const passes = c.role === 'PM' ? c.pm_pass : c.spm_pass
  const subject = passes
    ? 'Your application to Kargo — next steps'
    : 'Your Kargo application'

  try {
    await sendEmail(pii.email, subject, body)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  await sql`UPDATE candidates SET email_sent = true, email_sent_at = NOW() WHERE id = ${id}::uuid`
  return NextResponse.json({ success: true })
}
