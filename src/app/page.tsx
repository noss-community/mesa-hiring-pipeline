'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Candidate, Role } from '@/types'

const CRITERIA = [
  { key: 'c1', label: 'Unprompted builds' },
  { key: 'c2', label: 'Operational ground truth' },
  { key: 'c3', label: 'Hard call' },
  { key: 'c4', label: 'Loss institutionalised' },
] as const

function ScorePip({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300">—</span>
  const bg = ['', 'bg-red-400', 'bg-orange-400', 'bg-blue-400', 'bg-green-500'][score] ?? 'bg-gray-300'
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${bg}`}>
      {score}
    </span>
  )
}

function PassBadge({ pass }: { pass: boolean | null }) {
  if (pass === null) return null
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  )
}

function CandidateCard({ c, role, onSent }: { c: Candidate; role: Role; onSent: () => void }) {
  const [sending, setSending] = useState(false)
  const prefix = role.toLowerCase() as 'pm' | 'spm'
  const total = c[`${prefix}_total` as keyof Candidate] as number | null
  const pass  = c[`${prefix}_pass`  as keyof Candidate] as boolean | null
  const flag  = c[`${prefix}_flag`  as keyof Candidate] as string | null
  const pii   = c.candidate_pii?.[0]

  const emailBody = c.email_draft?.replace('[NAME]', pii?.name ?? 'there') ?? ''

  async function send() {
    setSending(true)
    await fetch(`/api/send-email/${c.id}`, { method: 'POST' })
    onSent()
    setSending(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-lg leading-tight">{pii?.name ?? 'Unknown'}</div>
          <div className="text-sm text-gray-500">{pii?.email ?? '—'}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl font-bold tabular-nums">
            {total?.toFixed(2) ?? '—'}
            <span className="text-sm font-normal text-gray-400">/4</span>
          </span>
          <PassBadge pass={pass} />
        </div>
      </div>

      {flag && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
          ⚠ {flag}
        </p>
      )}

      <div className="grid grid-cols-4 gap-3">
        {CRITERIA.map(({ key, label }) => {
          const score  = c[`${prefix}_${key}_score`  as keyof Candidate] as number | null
          const reason = c[`${prefix}_${key}_reason` as keyof Candidate] as string | null
          return (
            <div key={key} className="flex flex-col items-center gap-1">
              <ScorePip score={score} />
              <div className="text-xs text-gray-500 text-center leading-tight">{label}</div>
              {reason && (
                <div className="text-xs text-gray-400 text-center leading-tight">{reason}</div>
              )}
            </div>
          )
        })}
      </div>

      {c.interview_brief && (
        <div className="bg-blue-50 border border-blue-100 rounded px-3 py-2.5">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
            Interview brief
          </div>
          <p className="text-sm text-blue-900 leading-relaxed">{c.interview_brief}</p>
        </div>
      )}

      {emailBody && (
        <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2.5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Draft email
          </div>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {emailBody}
          </pre>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {c.email_sent ? (
          <span className="text-xs text-green-600 font-medium">✓ Email sent</span>
        ) : (
          <button
            onClick={send}
            disabled={sending || !pii?.email}
            className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {sending ? 'Sending…' : 'Send email'}
          </button>
        )}
        {c.status === 'error' && (
          <span className="text-xs text-red-500 truncate">Error: {c.error_message}</span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [activeRole, setActiveRole] = useState<Role>('PM')
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/candidates')
    const data: unknown = await res.json()
    setCandidates(Array.isArray(data) ? (data as Candidate[]) : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = candidates
    .filter(c => c.role === activeRole)
    .sort((a, b) => {
      const prefix = activeRole.toLowerCase() as 'pm' | 'spm'
      const aScore = (a[`${prefix}_total` as keyof Candidate] as number | null) ?? 0
      const bScore = (b[`${prefix}_total` as keyof Candidate] as number | null) ?? 0
      return bScore - aScore
    })

  return (
    <main className="max-w-3xl mx-auto py-10 px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Kargo Hiring</h1>
        <Link
          href="/upload"
          className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Upload CV
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {(['PM', 'SPM'] as Role[]).map(r => (
          <button
            key={r}
            onClick={() => setActiveRole(r)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeRole === r
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r} ({candidates.filter(c => c.role === r).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">No {activeRole} candidates yet.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <CandidateCard key={c.id} c={c} role={activeRole} onSent={load} />
          ))}
        </div>
      )}
    </main>
  )
}
