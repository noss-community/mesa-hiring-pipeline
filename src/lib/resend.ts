import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.RESEND_FROM || 'Kargo Hiring <hiring@kargo.in>'

export async function sendEmail(to: string, subject: string, body: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    text: body,
  })
  if (error) throw new Error('Resend error: ' + (error as { message?: string }).message)
}
