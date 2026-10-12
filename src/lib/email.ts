import { Resend } from "resend"
import { isPlaceholderEmail } from "@/lib/phone-login"
import { SITE_URL } from "@/lib/site"
import { COACH_UPI_ID } from "@/lib/upi"

const FROM = "Aman Khurana Fitness <noreply@amankhuranafitness.com>"

export interface EmailSendResult {
  success: boolean
  skipped?: boolean
  dryRun?: boolean
  error?: string
  data?: unknown
}

export function isEmailDryRunKey(rawKey?: string | null): boolean {
  const k = (rawKey ?? process.env.RESEND_API_KEY ?? "").trim().toLowerCase()
  if (!k) return false
  return k.startsWith("dummy") || k.startsWith("re_dummy") || k === "test"
}

function getResend() {
  const key = (process.env.RESEND_API_KEY || "").trim()
  if (!key) throw new Error("email_not_configured")
  return new Resend(key)
}

// Clients added with only a mobile number have a placeholder email; never send mail to it.
async function sendMail(msg: { from: string; to: string; subject: string; html: string }): Promise<EmailSendResult> {
  if (isPlaceholderEmail(msg.to)) return { success: false, skipped: true, error: "placeholder_email" }
  const key = (process.env.RESEND_API_KEY || "").trim()
  if (!key) {
    return { success: false, error: "email_not_configured" }
  }
  if (isEmailDryRunKey(key)) {
    return { success: false, skipped: true, dryRun: true, error: "dry_run" }
  }
  try {
    const res = await getResend().emails.send(msg)
    if (res.error) {
      return { success: false, error: res.error.message || "Email send failed" }
    }
    return { success: true, data: res.data }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Email send failed",
    }
  }
}

function layout(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:100%">
<tr><td style="padding:0 0 24px;text-align:center">
<h1 style="font-family:Georgia,serif;color:#fff;font-size:28px;letter-spacing:4px;margin:0">AMAN KHURANA FITNESS</h1>
</td></tr>
<tr><td style="background:#111;border-radius:16px;padding:32px">
${body}
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center">
<p style="color:#52525b;font-size:11px;margin:0">Aman Khurana Fitness — Transformation starts here</p>
</td></tr>
</table>
</td></tr></table></body></html>`
}

function ctaButton(url: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:20px auto"><tr><td style="background:#FF6A1A;border-radius:999px;padding:12px 32px;text-align:center">
<a href="${url}" style="color:#000;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${label}</a>
</td></tr></table>`
}

export async function sendWelcomeEmail(to: string, name: string, loginUrl: string) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">Welcome to Aman Khurana Fitness, ${name}! 💪</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      Your transformation journey starts now. Your coach will assign a personalized plan shortly.
    </p>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 8px">Here's what to expect:</p>
    <ul style="color:#a1a1aa;font-size:13px;line-height:1.8;margin:0 0 16px;padding-left:20px">
      <li>Custom workout & diet plans</li>
      <li>Timely scheduled check-ins to track progress</li>
      <li>Direct messaging with your coach</li>
      <li>Payment & invoice management</li>
    </ul>
    ${ctaButton(loginUrl, "Login to Your Dashboard")}
  `)
  return sendMail({ from: FROM, to, subject: "Welcome to Aman Khurana Fitness 💪", html })
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">Reset Your Password</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      Hi ${name || "there"}, tap the button below to set a new password for your Aman Khurana Fitness account.
    </p>
    ${ctaButton(resetUrl, "Set New Password")}
  `)
  return sendMail({ from: FROM, to, subject: "Reset Password — Aman Khurana Fitness", html })
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
  return sendMail({ from: FROM, to, subject: `Your Aman Khurana Fitness Invoice — ${month}`, html })
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
      <li>UPI: <strong style="color:#fff">${COACH_UPI_ID}</strong></li>
      <li>Bank transfer — ask your coach for details</li>
    </ul>
    ${ctaButton(`${SITE_URL}/payments`, "Make Payment")}
  `)
  return sendMail({ from: FROM, to, subject: "Payment Reminder — Aman Khurana Fitness", html })
}

export async function sendEnquiryAlertEmail(
  name: string,
  phone: string,
  email: string,
  interest: string,
  coachTarget?: string | { coachId?: string | null; clientId?: string | null; userId?: string | null; coachPhone?: string | null } | null
): Promise<EmailSendResult> {
  const { isCoachNotificationsEnabled } = await import("@/lib/automation-delivery")
  if (!(await isCoachNotificationsEnabled(coachTarget))) return { success: false, skipped: true, error: "coach_notifications_off" }
  const to = (process.env.SETUP_COACH_EMAIL || process.env.COACH_EMAIL || "").trim()
  if (!to) return { success: false, error: "email_not_configured" }
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">New Enquiry 📝</h2>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 16px">
      <tr><td style="color:#52525b;font-size:13px;padding:4px 20px 4px 0">Name</td><td style="color:#fff;font-size:14px">${name}</td></tr>
      <tr><td style="color:#52525b;font-size:13px;padding:4px 20px 4px 0">Phone</td><td style="color:#fff;font-size:14px">${phone}</td></tr>
      <tr><td style="color:#52525b;font-size:13px;padding:4px 20px 4px 0">Email</td><td style="color:#fff;font-size:14px">${email || "—"}</td></tr>
      <tr><td style="color:#52525b;font-size:13px;padding:4px 20px 4px 0">Interested In</td><td style="color:#fff;font-size:14px">${interest || "—"}</td></tr>
    </table>
    ${ctaButton(`${SITE_URL}/submissions`, "Review in Coach Portal")}
  `)
  return sendMail({ from: FROM, to, subject: `New Enquiry — ${name}`, html })
}

export async function sendFollowupReminderEmail(
  to: string,
  name: string,
  type: string,
  dueDate: string,
  note?: string | null
): Promise<{ success: boolean; skipped?: boolean; dryRun?: boolean; error?: string }> {
  const cleanTo = (to || "").trim()
  if (!cleanTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo) || isPlaceholderEmail(cleanTo)) {
    return { success: false, skipped: true, error: "no_real_email" }
  }

  const key = (process.env.RESEND_API_KEY || "").trim()
  if (!key) {
    return { success: false, error: "email_not_configured" }
  }
  if (isEmailDryRunKey(key)) {
    return {
      success: false,
      dryRun: true,
      error: key === "re_dummy_fail" || key === "dummy_fail" ? "Simulated email failure (dryRun)" : "dry_run",
    }
  }

  const labels: Record<string, { title: string; ctaUrl: string; ctaLabel: string }> = {
    payment: {
      title: "Coaching Fee Reminder",
      ctaUrl: `${SITE_URL}/payments`,
      ctaLabel: "View & Pay Fee",
    },
    renewal: {
      title: "Coaching Plan Renewal Reminder",
      ctaUrl: `${SITE_URL}/payments`,
      ctaLabel: "Renew Your Plan",
    },
    feedback: {
      title: "Progress & Feedback Follow-up",
      ctaUrl: `${SITE_URL}/home`,
      ctaLabel: "Open Dashboard",
    },
    checkin: {
      title: "Check-in Reminder",
      ctaUrl: `${SITE_URL}/checkin`,
      ctaLabel: "Complete Check-in",
    },
  }
  const meta = labels[type] ?? {
    title: "Follow-up from Coach Aman",
    ctaUrl: `${SITE_URL}/home`,
    ctaLabel: "Open Portal",
  }

  const noteBlock = note?.trim()
    ? `<p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px"><strong>Note:</strong> ${note.trim()}</p>`
    : ""

  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">${meta.title}</h2>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">Hi ${name || "there"},</p>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      This is a reminder from Coach Aman regarding your <strong style="color:#fff">${meta.title.toLowerCase()}</strong> (scheduled for <strong style="color:#fff">${dueDate}</strong>).
    </p>
    ${noteBlock}
    ${ctaButton(meta.ctaUrl, meta.ctaLabel)}
  `)

  try {
    const res = await sendMail({
      from: FROM,
      to: cleanTo,
      subject: `${meta.title} — Aman Khurana Fitness`,
      html,
    })
    if (res.dryRun) {
      return { success: false, dryRun: true, error: res.error || "dry_run" }
    }
    if (res.skipped) {
      return { success: false, skipped: true, error: res.error || "skipped_placeholder" }
    }
    if (!res.success) {
      return { success: false, error: res.error || "Email send failed" }
    }
    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Email send failed",
    }
  }
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
    ${ctaButton(`${SITE_URL}/payments`, "Renew Now")}
  `)
  return sendMail({ from: FROM, to, subject: `Your plan ${label} — Aman Khurana Fitness`, html })
}

export function maskEmailForNotice(email: string): string {
  const [local = "", domain = ""] = email.trim().split("@")
  if (!local || !domain) return "***"
  return `${local[0]}***@${domain}`
}

export async function sendAdminEmailChangedNotice(oldEmail: string, newEmail: string) {
  const masked = maskEmailForNotice(newEmail)
  const noticeLine = `Your admin login email was changed to ${masked}`
  const html = layout(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px">Admin Login Email Changed</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      ${noticeLine}.
    </p>
    <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0">
      If you did not make this change, please contact support immediately to recover your account.
    </p>
  `)
  console.info(`[AdminEmailNotice] Attempting notice to old address (${oldEmail}): "${noticeLine}"`)
  return sendMail({ from: FROM, to: oldEmail, subject: "Security Notice: Admin login email changed", html })
}

