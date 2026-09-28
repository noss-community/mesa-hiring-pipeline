import { GoogleGenerativeAI } from '@google/generative-ai'
import { RUBRIC_TEXT } from './rubric'
import type { RawScores } from '@/types'

// Update this to match your Gemini plan — e.g. "gemini-2.5-flash", "gemini-2.0-flash"
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function generate(prompt: string, jsonMode = false): Promise<string> {
  const model = genai.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: jsonMode
      ? { responseMimeType: 'application/json' }
      : undefined,
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

function parseJSON(text: string): Record<string, unknown> {
  try { return JSON.parse(text) as Record<string, unknown> } catch { /* fall through */ }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}') + 1
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end)) as Record<string, unknown> } catch { /* fall through */ }
  }
  return {}
}

export async function extractPII(rawText: string) {
  const prompt = `Extract PII from this CV. Return ONLY valid JSON with exactly this shape:
{
  "name": "<full name or null>",
  "email": "<email address or null>",
  "phone": "<phone number or null>",
  "clean_text": "<the full CV text with: name replaced by [Candidate], email by [email redacted], phone by [phone redacted], LinkedIn/GitHub URLs by [profile URL]>"
}

CV:
${rawText}`

  const text = await generate(prompt, true)
  const p = parseJSON(text)
  return {
    name: (p.name as string) ?? null,
    email: (p.email as string) ?? null,
    phone: (p.phone as string) ?? null,
    cleanText: (p.clean_text as string) || rawText,
  }
}

export async function scoreCV(cvText: string): Promise<RawScores> {
  const prompt = `Score this CV against the Kargo hiring rubric for BOTH PM and SPM roles.
Return ONLY valid JSON — no markdown, no explanation.

${RUBRIC_TEXT}

CV:
${cvText}

Return this exact structure (integer scores 1–4, reasons ≤ 20 words each):
{
  "pm":  { "c1":{"score":0,"reason":""}, "c2":{"score":0,"reason":""}, "c3":{"score":0,"reason":""}, "c4":{"score":0,"reason":""} },
  "spm": { "c1":{"score":0,"reason":""}, "c2":{"score":0,"reason":""}, "c3":{"score":0,"reason":""}, "c4":{"score":0,"reason":""} }
}`

  const text = await generate(prompt, true)
  return parseJSON(text) as unknown as RawScores
}

export async function generateBrief(cvText: string, role: string, total: number): Promise<string> {
  const prompt = `Write exactly 3 sentences for an interview brief. ${role} candidate, Kargo score ${total}/4.0.
Sentence 1: Their strongest concrete signal for this role — name the specific thing from the CV.
Sentence 2: The single most important question to probe in the interview.
Sentence 3: The one risk to validate before making an offer.
CV:
${cvText}
Return only the 3 sentences. No labels, no preamble, no numbering.`

  return generate(prompt)
}

export async function draftEmail(cvText: string, role: string, passes: boolean, total: number): Promise<string> {
  const type = passes ? 'interview invitation' : 'warm rejection'
  const prompt = `Draft a ${type} email for a ${role} applicant.
Rules:
- First line must be exactly: Dear [NAME],
- ${passes
    ? `Invite them to a 30-minute call. Mention one specific genuine thing from their background. (Score: ${total}/4.0)`
    : 'Decline warmly. Name one genuine strength from their background. Do not mention scoring or criteria.'}
- Last two lines exactly: Warm regards, / Kargo Hiring Team
- Maximum 100 words total.
- No hollow phrases like "impressed by your profile" or "we regret to inform you".
CV:
${cvText}
Return only the email text.`

  return generate(prompt)
}
