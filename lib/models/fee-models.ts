export interface Particular {
  id?: string
  name: string
  amount: number
  isSelected?: boolean
}

export interface StudentBill {
  id?: string
  studentId: string
  studentName: string
  rollNumber: string
  grade: string
  term: string
  year: string
  totalFee: number
  installments: number
  remainingBalance: number
  status: "Paid" | "Unpaid" | "Partially Paid"
  particulars: Record<string, number>
  paidAmount?: number
  paidDate?: string
}

export interface BillStudent {
  id: string
  name: string
  rollNumber: string
  grade: string
  usesBus?: boolean
  transportationFee?: number
  dues?: number
  isSelected?: boolean
}
