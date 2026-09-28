export const RUBRIC_TEXT = `
KARGO HIRING RUBRIC — 4 CRITERIA, EACH SCORED 1–4

C1: UNPROMPTED BUILDS, ADOPTED BY OTHERS
The candidate built something without being asked, and other people actually used it.
Not prototypes, demos, or side projects no one touched.
4 — Shipped something that became standard practice for a team or function
3 — Built something colleagues used, even informally
2 — Evidence of initiative but adoption unclear or limited
1 — No evidence of unprompted building

C2: OPERATIONAL GROUND TRUTH
The candidate has been in the field: on the dock, riding the route, or talking directly to frontline operators. Not managing from a spreadsheet.
4 — Spent meaningful time at the operational coal face; can cite specific numbers or direct observations
3 — Has direct operational experience, even if not deep or sustained
2 — Some exposure, but primarily through reports or second-hand accounts
1 — No evidence of direct operational contact

C3: HARD CALL WITH PERSONAL STAKES
The candidate made a decision that could have gone badly for THEM personally — not for the company in the abstract.
4 — Made a decision risking their job, relationship, or reputation, and can explain why they did it anyway
3 — Made a difficult call with real personal consequences
2 — Made a "hard call" but consequences were diffuse or purely professional
1 — No evidence of personal-stakes decision-making

C4: LOSS INSTITUTIONALISED
The candidate turned a failure into something the organisation learned from durably. Not just "I learned from it."
4 — Failure produced a process, document, or change that still exists in the organisation
3 — Loss produced visible change in how they or their team works
2 — Loss is acknowledged but learning is personal, not institutional
1 — Failure mentioned without clear institutional learning
`

export const PM_WEIGHTS = [0.30, 0.25, 0.25, 0.20]
export const SPM_WEIGHTS = [0.25, 0.20, 0.35, 0.20]

export function computeTotal(
  s: { c1: number; c2: number; c3: number; c4: number },
  role: 'PM' | 'SPM'
): number {
  const w = role === 'PM' ? PM_WEIGHTS : SPM_WEIGHTS
  return parseFloat((s.c1 * w[0] + s.c2 * w[1] + s.c3 * w[2] + s.c4 * w[3]).toFixed(2))
}

export function checkPass(
  s: { c1: number; c2: number; c3: number; c4: number },
  total: number,
  role: 'PM' | 'SPM'
): { pass: boolean; flag: string | null } {
  if (role === 'PM') {
    const anyBelow2 = s.c1 < 2 || s.c2 < 2 || s.c3 < 2 || s.c4 < 2
    if (total < 3.0 || anyBelow2) return { pass: false, flag: null }
    const flag = s.c2 <= 2 ? 'C2 low — probe operational depth in interview' : null
    return { pass: true, flag }
  } else {
    // SPM: C3 ≤ 2 is a hard disqualifier
    if (s.c3 <= 2) return { pass: false, flag: 'C3 disqualifier: no hard call with personal stakes' }
    if (total < 3.2) return { pass: false, flag: null }
    return { pass: true, flag: null }
  }
}
