import Razorpay from "razorpay"
import crypto from "crypto"

export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!keyId) throw new Error("RAZORPAY_KEY_ID is not configured")
  return keyId
}

export function getRazorpayKeySecret(): string {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET is not configured")
  return keySecret
}

export function getRazorpayInstance(): Razorpay {
  const key_id = getRazorpayKeyId()
  const key_secret = getRazorpayKeySecret()
  return new Razorpay({ key_id, key_secret })
}

/**
 * Verify Razorpay payment signature from client Checkout modal
 * signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = getRazorpayKeySecret()
  const payload = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    )
  } catch {
    return false
  }
}

/**
 * Verify Razorpay webhook signature from X-Razorpay-Signature header
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secretOverride?: string
): boolean {
  const secret = secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET || getRazorpayKeySecret()
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    )
  } catch {
    return false
  }
}
