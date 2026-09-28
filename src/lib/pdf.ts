export async function extractPdfText(buf: Buffer): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — pdfjs-dist v6 legacy ESM, no bundled types for this path
    'pdfjs-dist/legacy/build/pdf.mjs'
  )

  // Disable web worker — we're running server-side in Node.js
  GlobalWorkerOptions.workerSrc = ''

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
