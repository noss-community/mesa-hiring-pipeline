'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UploadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const data = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: data })
      const json: unknown = await res.json()
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Upload failed')
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  return (
    <main className="max-w-xl mx-auto py-16 px-6">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
        <h1 className="text-2xl font-semibold">Upload CV</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">CV file (PDF or .txt)</label>
          <input
            type="file"
            name="cv"
            accept=".pdf,.txt"
            required
            className="block w-full text-sm border border-gray-300 rounded px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Role applied for</label>
          <select
            name="role"
            className="block w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="PM">Product Manager (PM)</option>
            <option value="SPM">Senior Product Manager (SPM)</option>
          </select>
        </div>
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2.5 rounded font-medium text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Scoring… this takes ~30 seconds' : 'Upload & Score'}
        </button>
      </form>
    </main>
  )
}
