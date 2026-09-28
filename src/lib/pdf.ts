export async function extractPdfText(buf: Buffer): Promise<string> {
  const { getDocument } = await import(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — pdfjs-dist v6 legacy ESM, no bundled types for this path
    'pdfjs-dist/legacy/build/pdf.mjs'
  )
  // Note: don't set GlobalWorkerOptions.workerSrc — pdfjs-dist's own static
  // init already points it at "./pdf.worker.mjs" (relative to this module)
  // and runs it in-process when it detects Node.js. Overriding it here
  // breaks that auto-detection and causes "fake worker" setup to fail.

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
