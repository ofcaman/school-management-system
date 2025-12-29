"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { initializeApp } from "firebase/app"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { Loader2, ArrowLeft, Printer, Download } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import type { StudentBill } from "@/lib/models/fee-models"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function StudentBillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const billId = searchParams.get("billId")
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [bill, setBill] = useState<StudentBill | null>(null)
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Sunshine Academy",
    address: "123 Education Street, Kathmandu",
    phone: "+977-1-1234567",
    email: "info@sunshineacademy.edu.np",
    logo: "/abstract-school-crest.png",
  })

  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!billId || !teacherId) {
      router.push("/teacher/login")
      return
    }

    loadBill()
  }, [billId, teacherId, router])

  const loadBill = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Create demo bill
        const demoBill: StudentBill = {
          studentId: "student1",
          studentName: "Ram Sharma",
          rollNumber: "5",
          grade: "5",
          term: "First Term",
          year: "2081",
          totalFee: 7500,
          installments: 3,
          remainingBalance: 7500,
          status: "Unpaid",
          particulars: {
            "Monthly Fee": 5100,
            "Exam Fee": 200,
            "Computer Fee": 300,
            "Library Fee": 100,
            "Transportation Fee": 1500,
            "Previous Dues": 300,
          },
        }
        setBill(demoBill)
      } else {
        // Load real data from Firebase
        const billRef = doc(db, "student_bills", billId)
        const billDoc = await getDoc(billRef)

        if (billDoc.exists()) {
          setBill(billDoc.data() as StudentBill)
        } else {
          alert("Bill not found")
          router.back()
        }
      }
    } catch (error) {
      console.error("Error loading bill:", error)
      alert("Error loading bill details")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Bill_${bill?.studentName}_${bill?.term}_${bill?.year}`,
  })

  const today = new Date().toLocaleDateString("en-NP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Bill Not Found</h1>
          <p className="mb-4">The requested bill could not be found.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Student Bill</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <div ref={printRef} className="p-8">
            <div className="bill-container">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b pb-6">
                <div className="flex items-center">
                  <img src={schoolInfo.logo || "/placeholder.svg"} alt="School Logo" className="h-16 w-16 mr-4" />
                  <div>
                    <h1 className="text-2xl font-bold text-primary">{schoolInfo.name}</h1>
                    <p className="text-sm text-muted-foreground">{schoolInfo.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {schoolInfo.phone} | {schoolInfo.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">STUDENT BILL</h2>
                  <p className="text-sm text-muted-foreground">Date: {today}</p>
                  <p className="text-sm text-muted-foreground">Bill ID: {billId || "DEMO-123456"}</p>
                </div>
              </div>

              {/* Student Information */}
              <div className="grid grid-cols-2 gap-6 mb-6 border-b pb-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">STUDENT DETAILS</h3>
                  <p className="font-medium">{bill.studentName}</p>
                  <p>Roll Number: {bill.rollNumber}</p>
                  <p>Class: {bill.grade}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">BILL DETAILS</h3>
                  <p>Term: {bill.term}</p>
                  <p>Year: {bill.year} BS</p>
                  <p>
                    Status: <span className="font-medium text-red-500">{bill.status}</span>
                  </p>
                </div>
              </div>

              {/* Fee Particulars */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">FEE PARTICULARS</h3>
                <div className="border rounded-md">
                  <div className="grid grid-cols-12 p-3 font-medium border-b bg-muted">
                    <div className="col-span-1">#</div>
                    <div className="col-span-7">Particular</div>
                    <div className="col-span-4 text-right">Amount (Rs.)</div>
                  </div>
                  <div className="divide-y">
                    {Object.entries(bill.particulars).map(([name, amount], index) => (
                      <div key={index} className="grid grid-cols-12 p-3">
                        <div className="col-span-1">{index + 1}</div>
                        <div className="col-span-7">{name}</div>
                        <div className="col-span-4 text-right">{amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 p-3 font-bold bg-muted border-t">
                    <div className="col-span-8 text-right">Total Amount:</div>
                    <div className="col-span-4 text-right">Rs. {bill.totalFee.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="grid grid-cols-2 gap-6 mb-6 border-b border-t py-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">PAYMENT DETAILS</h3>
                  <p>Total Fee: Rs. {bill.totalFee.toFixed(2)}</p>
                  <p>Installments: {bill.installments}</p>
                  <p>Installment Amount: Rs. {(bill.totalFee / bill.installments).toFixed(2)}</p>
                  <p className="font-medium mt-2">Remaining Balance: Rs. {bill.remainingBalance.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">PAYMENT INSTRUCTIONS</h3>
                  <p>1. Please pay your fees before the due date to avoid late payment charges.</p>
                  <p>2. Fees can be paid at the school accounts office during working hours.</p>
                  <p>3. Online payment options are available on the school website.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="grid grid-cols-2 gap-6 pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">
                    If you have any questions concerning this bill, please contact the accounts office.
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">Thank you for your prompt payment.</p>
                </div>
                <div className="text-right">
                  <div className="h-20 flex flex-col justify-end items-end">
                    <div className="border-t border-dashed border-gray-300 w-48 mb-1"></div>
                    <p className="text-sm">Authorized Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
