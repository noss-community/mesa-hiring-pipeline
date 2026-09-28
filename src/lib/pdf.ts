// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalScope = globalThis as any

export async function extractPdfText(buf: Buffer): Promise<string> {
  // pdfjs-dist loads its worker via a dynamic import built from a runtime
  // variable (this.workerSrc), which Vercel's build-time file tracer can't
  // follow — the worker file then goes missing from the deployed bundle
  // ("Cannot find module .../pdf.worker.mjs"). Importing it ourselves with a
  // literal path (traceable) and registering it on globalThis.pdfjsWorker
  // makes pdfjs-dist use it directly instead of dynamically importing it.
  if (!globalScope.pdfjsWorker) {
    globalScope.pdfjsWorker = await import(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — pdfjs-dist v6 legacy ESM, no bundled types for this path
      'pdfjs-dist/legacy/build/pdf.worker.mjs'
    )
  }

  const { getDocument } = await import(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — pdfjs-dist v6 legacy ESM, no bundled types for this path
    'pdfjs-dist/legacy/build/pdf.mjs'
  )

  const data = new Uint8Array(buf)
  const doc = await getDocument({
    data,
    // Be lenient with malformed PDFs (bad XRef tables, etc.)
    stopAtErrors: false,
  }).promise

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n').trim()
}
