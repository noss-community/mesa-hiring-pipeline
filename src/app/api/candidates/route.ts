import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// NUMERIC columns come back as strings from Neon — coerce to float so the
// dashboard can call .toFixed() and sort numerically without crashing.
function normalize(row: Record<string, unknown>) {
  for (const k of ['pm_total', 'spm_total'] as const) {
    if (row[k] !== null && row[k] !== undefined) row[k] = parseFloat(row[k] as string)
  }
  return row
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT c.*,
        COALESCE(
          json_agg(json_build_object('name', p.name, 'email', p.email, 'phone', p.phone))
          FILTER (WHERE p.candidate_id IS NOT NULL),
          '[]'::json
        ) AS candidate_pii
      FROM candidates c
      LEFT JOIN candidate_pii p ON p.candidate_id = c.id
      WHERE c.status IS DISTINCT FROM 'error'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `
    return NextResponse.json(rows.map(r => normalize(r as Record<string, unknown>)))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
