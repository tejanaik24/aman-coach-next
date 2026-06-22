import { Resend } from "resend"

const FROM = "AK Fitness <onboarding@resend.dev>"

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured")
  return new Resend(process.env.RESEND_API_KEY)
}

function layout(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:100%">
<tr><td style="padding:0 0 24px;text-align:center">
<h1 style="font-family:Georgia,serif;color:#fff;font-size:28px;letter-spacing:4px;margin:0">AK FITNESS</h1>
</td></tr>
<tr><td style="background:#111;border-radius:16px;padding:32px">
${body}
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center">
<p style="color:#52525b;font-size:11px;margin:0">AK Fitness — Transformation starts here</p>
</td></tr>
</table>
</td></tr></table></body></html>`
}

function ctaButton(url: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:20px auto"><tr><td style="background:#FFB800;border-radius:999px;padding:12px 32px;text-align:center">
<a href="${url}" style="color:#000;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${label}</a>
</td></tr></table>`
}

export async function sendWelcomeEmail(to: string, name: string, loginUrl: string) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">Welcome to AK Fitness, ${name}! 💪</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      Your transformation journey starts now. Your coach will assign a personalized plan shortly.
    </p>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 8px">Here's what to expect:</p>
    <ul style="color:#a1a1aa;font-size:13px;line-height:1.8;margin:0 0 16px;padding-left:20px">
      <li>Custom workout & diet plans</li>
      <li>Weekly check-ins to track progress</li>
      <li>Direct messaging with your coach</li>
      <li>Payment & invoice management</li>
    </ul>
    ${ctaButton(loginUrl, "Login to Your Dashboard")}
  `)
  return getResend().emails.send({ from: FROM, to, subject: "Welcome to AK Fitness 💪", html })
}

export async function sendInvoiceEmail(to: string, name: string, invoiceUrl: string, amount: number, month: string) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">Invoice — ${month}</h2>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">Hi ${name},</p>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      Your invoice for <strong style="color:#fff">${month}</strong> is ready.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 16px">
      <tr><td style="color:#52525b;font-size:13px;padding:4px 20px 4px 0">Amount</td>
          <td style="color:#fff;font-size:16px;font-weight:700">₹${amount.toLocaleString("en-IN")}</td></tr>
      <tr><td style="color:#52525b;font-size:13px;padding:4px 20px 4px 0">Month</td>
          <td style="color:#fff;font-size:13px">${month}</td></tr>
    </table>
    ${ctaButton(invoiceUrl, "Download Invoice")}
  `)
  return getResend().emails.send({ from: FROM, to, subject: `Your AK Fitness Invoice — ${month}`, html })
}

export async function sendPaymentReminderEmail(to: string, name: string, amount: number, dueDate: string, dayNumber: number) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">Payment Reminder ⏰</h2>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">Hi ${name},</p>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      Your payment of <strong style="color:#fff">₹${amount.toLocaleString("en-IN")}</strong> was due on <strong style="color:#fff">${dueDate}</strong>.
      This is day <strong style="color:#f59e0b">${dayNumber}</strong> overdue.
    </p>
    <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
      Please make the payment at your earliest convenience to avoid any disruption to your plan.
    </p>
    <p style="color:#52525b;font-size:12px;margin:0 0 8px">Payment methods:</p>
    <ul style="color:#a1a1aa;font-size:12px;line-height:1.8;margin:0 0 16px;padding-left:20px">
      <li>UPI: <strong style="color:#fff">aman@akfitness</strong></li>
      <li>Bank transfer — ask your coach for details</li>
    </ul>
    ${ctaButton("https://aman-coach-next.vercel.app/client/payments", "Make Payment")}
  `)
  return getResend().emails.send({ from: FROM, to, subject: "Payment Reminder — AK Fitness", html })
}

export async function sendPlanExpiryEmail(to: string, name: string, expiryDate: string, daysLeft: number) {
  const label = daysLeft === 0 ? "expired today" : `expires in ${daysLeft} days`
  const body = daysLeft === 0
    ? `<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
        Your plan has <strong style="color:#ef4444">expired today</strong>. Renew now to continue your transformation.
      </p>`
    : `<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
        Your plan <strong style="color:#f59e0b">expires on ${expiryDate}</strong> (${daysLeft} days left).
      </p>`
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">Plan ${label}</h2>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">Hi ${name},</p>
    ${body}
    <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
      Contact your coach to renew and keep your personalized plans active.
    </p>
    ${ctaButton("https://aman-coach-next.vercel.app/client/payments", "Renew Now")}
  `)
  return getResend().emails.send({ from: FROM, to, subject: `Your plan ${label} — AK Fitness`, html })
}
