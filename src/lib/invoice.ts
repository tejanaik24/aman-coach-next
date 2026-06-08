import jsPDF from "jspdf"

interface InvoiceData {
  invoiceId: string
  clientName: string
  clientEmail: string
  amount: number
  month: string
  plan: string
  date: Date
}

export function generateInvoice(data: InvoiceData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4")
  const gold = "#FFB800"
  const orange = "#E8501A"
  const black = "#1a1a1a"

  doc.setFillColor(black)
  doc.rect(0, 0, 210, 40, "F")
  doc.setTextColor(gold)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("AMAN KHURANA FITNESS", 20, 28)
  doc.setFontSize(8)
  doc.setTextColor("#ffffff")
  doc.text("Transforming Lives Through Fitness", 20, 35)

  doc.setDrawColor(gold)
  doc.setLineWidth(0.5)
  doc.line(20, 45, 190, 45)

  doc.setTextColor(black)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("INVOICE", 20, 58)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  doc.text(`Invoice #: ${data.invoiceId}`, 20, 68)
  doc.text(`Date: ${data.date.toLocaleDateString("en-IN")}`, 20, 75)
  doc.text(`Period: ${data.month}`, 20, 82)

  doc.setDrawColor(orange)
  doc.setLineWidth(0.3)
  doc.line(20, 88, 190, 88)

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Bill To:", 20, 98)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(data.clientName, 20, 106)
  doc.text(data.clientEmail, 20, 113)

  doc.setDrawColor(gold)
  doc.setLineWidth(0.5)
  doc.line(20, 122, 190, 122)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Description", 20, 134)
  doc.text("Amount", 170, 134, { align: "right" })

  doc.setDrawColor("#cccccc")
  doc.setLineWidth(0.3)
  doc.line(20, 138, 190, 138)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`${data.plan} Coaching - ${data.month}`, 20, 150)
  doc.text(`₹${data.amount.toLocaleString("en-IN")}`, 170, 150, { align: "right" })

  doc.setDrawColor(gold)
  doc.setLineWidth(0.5)
  doc.line(20, 158, 190, 158)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(`Total: ₹${data.amount.toLocaleString("en-IN")}`, 170, 172, {
    align: "right",
  })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor("#666666")
  doc.text(
    "Payment via UPI: amankhurana@upi",
    20,
    240
  )
  doc.text(
    "Thank you for your business!",
    20,
    248
  )

  doc.setFillColor(black)
  doc.rect(0, 275, 210, 22, "F")
  doc.setTextColor(gold)
  doc.setFontSize(7)
  doc.text("AMAN KHURANA FITNESS | amankhuranafitness.com | amankhurana@upi", 105, 288, {
    align: "center",
  })

  return doc
}
