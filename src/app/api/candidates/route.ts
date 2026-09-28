import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

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
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
