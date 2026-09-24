"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void }
  }
}

type RazorpayResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact: string }
  theme: { color: string; backdrop_color: string }
  modal: { ondismiss: () => void }
  handler: (response: RazorpayResponse) => Promise<void>
}

interface RazorpayCheckoutButtonProps {
  /** Display-only legacy input. The server always determines the charge amount. */
  amount?: number
  invoiceId?: string
  feeId?: string
  packageName?: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  buttonText?: string
  className?: string
  onSuccess?: () => void
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function RazorpayCheckoutButton({
  invoiceId,
  feeId,
  packageName,
  clientName,
  clientEmail,
  clientPhone,
  buttonText = "Pay Online (Razorpay)",
  className = "",
  onSuccess,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handlePayment() {
    setLoading(true)
    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay Checkout SDK. Please check your internet connection.")
        setLoading(false)
        return
      }

      // Step 1: Create Razorpay Order via API
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          feeId,
          packageName,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to initialize Razorpay checkout.")
        setLoading(false)
        return
      }

      // Step 2: Configure Razorpay Checkout Modal
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Aman Khurana Fitness",
        description: packageName || "1-on-1 Fitness & Nutrition Coaching",
        order_id: data.orderId,
        prefill: {
          name: clientName || "",
          email: clientEmail || "",
          contact: clientPhone || "",
        },
        theme: {
          color: "#FFB800", // Gold accent matching AK Fitness design system
          backdrop_color: "#0A0A0A",
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
            toast("Payment window closed", { icon: "ℹ️" })
          },
        },
        handler: async function (response: RazorpayResponse) {
          try {
            // Step 3: Verify Payment Signature via API
            const verifyRes = await fetch("/api/payments/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
              toast.success("Payment successful! GST receipt generated.")
              if (onSuccess) onSuccess()
            } else {
              toast.error(verifyData.error || "Payment verification failed.")
            }
          } catch {
            toast.error("Error verifying payment signature.")
          } finally {
            setLoading(false)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch {
      toast.error("An error occurred starting payment checkout.")
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={`py-3 px-5 rounded-full bg-accent-orange text-bg-primary font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-accent-orange/20 hover:bg-accent-orange/90 disabled:opacity-50 transition-all cursor-pointer ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Processing...
        </>
      ) : (
        <>
          <CreditCard className="size-4" /> {buttonText}
        </>
      )}
    </button>
  )
}
