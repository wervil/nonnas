import { jsPDF } from 'jspdf'

export async function generateReportPDF() {
  const doc = new jsPDF()

  doc.save(`book-${new Date().toISOString().split('T')[0].slice(0, 10)}.pdf`)
}
