"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { Loader2, ArrowLeft, Printer, Search, FileDown, Grid2X2, LayoutList, AlertCircle } from "lucide-react"
import type { StudentBill } from "@/lib/models/fee-models"
import { convertToWords } from "@/lib/utils/number-to-words"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function PrintBillsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")
  const printContainerRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [loadingBills, setLoadingBills] = useState(false)
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [bills, setBills] = useState<StudentBill[]>([])
  const [filteredBills, setFilteredBills] = useState<StudentBill[]>([])
  const [selectedBills, setSelectedBills] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printLayout, setPrintLayout] = useState<"single" | "compact">("single")
  const [billsPerPage, setBillsPerPage] = useState<"2" | "4" | "6">("4")
  const [lastReceiptNumber, setLastReceiptNumber] = useState(1)
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; name: string; displayName: string }>>([])
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string }>>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [useSectionFiltering, setUseSectionFiltering] = useState(true) // Default to true since we're using database
  const [error, setError] = useState<string | null>(null)

  // Available terms and years
  const terms = ["First Term", "Second Term", "Third Term", "Fourth Term"]
  const yearsBS = Array.from({ length: 11 }, (_, i) => (2080 + i).toString())

  // Debug: Log component renders
  console.log("PrintBillsPage rendering", {
    selectedClass,
    selectedClassId,
    selectedSection,
    useSectionFiltering,
  })

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    // Load classes from Firestore
    fetchClasses()

    // Try to get the last receipt number from localStorage
    const storedLastReceiptNumber = localStorage.getItem("lastReceiptNumber")
    if (storedLastReceiptNumber) {
      setLastReceiptNumber(Number.parseInt(storedLastReceiptNumber, 10))
    }
  }, [teacherId, router])

  useEffect(() => {
    if (selectedClassId) {
      // Load sections for the selected class
      fetchSections()
    } else if (selectedClass) {
      // If we're using class name directly, load bills if term and year are selected
      if (selectedTerm && selectedYear) {
        loadBills()
      }
    }
  }, [selectedClassId, selectedClass])

  useEffect(() => {
    // Load bills whenever class, section, term, and year are selected
    if ((selectedClassId || selectedClass) && selectedTerm && selectedYear) {
      console.log("Triggering loadBills from useEffect")
      loadBills()
    }
  }, [selectedClassId, selectedClass, selectedSection, selectedTerm, selectedYear])

  useEffect(() => {
    filterBills()
  }, [bills, searchQuery])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    setError(null)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo classes for demo mode
        const demoClasses = [
          { id: "pg", name: "P.G", displayName: "P.G" },
          { id: "nursery", name: "Nursery", displayName: "Nursery" },
          { id: "lkg", name: "LKG", displayName: "LKG" },
          { id: "ukg", name: "UKG", displayName: "UKG" },
          { id: "1", name: "1", displayName: "Class 1" },
          { id: "2", name: "2", displayName: "Class 2" },
          { id: "3", name: "3", displayName: "Class 3" },
          { id: "4", name: "4", displayName: "Class 4" },
          { id: "5", name: "5", displayName: "Class 5" },
          { id: "6", name: "6", displayName: "Class 6" },
          { id: "7", name: "7", displayName: "Class 7" },
          { id: "8", name: "8", displayName: "Class 8" },
          { id: "9", name: "9", displayName: "Class 9" },
          { id: "10", name: "10", displayName: "Class 10" },
        ]
        setAvailableClasses(demoClasses)
        console.log("Demo classes loaded:", demoClasses)
      } else {
        // Fetch classes from Firestore
        const classesRef = collection(db, "classes")
        const querySnapshot = await getDocs(classesRef)

        const classesData: { id: string; name: string; displayName: string }[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          classesData.push({
            id: doc.id,
            name: data.name || doc.id,
            displayName: data.displayName || `Class ${data.name || doc.id}`,
          })
        })

        if (classesData.length > 0) {
          // Sort classes in logical order
          classesData.sort((a, b) => {
            const order = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
            const aIndex = order.indexOf(a.name.toLowerCase().replace(/\./g, ""))
            const bIndex = order.indexOf(b.name.toLowerCase().replace(/\./g, ""))
            return aIndex - bIndex
          })

          setAvailableClasses(classesData)
          console.log("Firestore classes loaded:", classesData)
        } else {
          // If no classes were found, show an error
          setError("No classes found in the database. Please add classes first.")
          console.error("No classes found in Firestore")
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      setError("Failed to load classes. Please try again later.")
    } finally {
      setLoadingClasses(false)
      setLoading(false) // Set main loading to false after classes are loaded
    }
  }

  const fetchSections = async () => {
    if (!selectedClassId) return

    setLoadingSections(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo sections
        const demoSections = [
          { id: "A", name: "A" },
          { id: "B", name: "B" },
          { id: "C", name: "C" },
          { id: "D", name: "D" },
        ]
        setAvailableSections(demoSections)
        console.log("Demo sections loaded:", demoSections)
      } else {
        // Get the class document to access its sections array
        const classDoc = await getDoc(doc(db, "classes", selectedClassId))

        if (!classDoc.exists()) {
          console.error("Class document not found")
          setAvailableSections([])
          return
        }

        const classData = classDoc.data()
        const sectionIds = classData.sections || []

        if (!sectionIds.length) {
          // No sections defined for this class
          setAvailableSections([])
          console.log("No sections found for this class")
          return
        }

        // Fetch each section document
        const sectionsData: Array<{ id: string; name: string }> = []

        for (const sectionId of sectionIds) {
          try {
            if (typeof sectionId === "string") {
              // If it's already a simple string but looks like an ID
              if (sectionId.length > 10) {
                // Try to fetch the section document
                const sectionDoc = await getDoc(doc(db, "sections", sectionId))
                if (sectionDoc.exists()) {
                  const sectionData = sectionDoc.data()
                  sectionsData.push({
                    id: sectionId,
                    name: sectionData.name || "Unknown Section",
                  })
                } else {
                  // If section document doesn't exist, use a default name
                  sectionsData.push({
                    id: sectionId,
                    name: String.fromCharCode(65 + sectionsData.length), // A, B, C, etc.
                  })
                }
              } else {
                // It's a simple string like "A", "B", etc.
                sectionsData.push({
                  id: sectionId,
                  name: sectionId,
                })
              }
            } else if (sectionId && typeof sectionId === "object" && sectionId.name) {
              // If it's an object with a name property
              sectionsData.push({
                id: sectionId.id || `section-${sectionsData.length}`,
                name: sectionId.name,
              })
            } else {
              // Fallback to index-based section name
              sectionsData.push({
                id: `section-${sectionsData.length}`,
                name: String.fromCharCode(65 + sectionsData.length), // A, B, C, etc.
              })
            }
          } catch (error) {
            console.error(`Error processing section ${sectionId}:`, error)
          }
        }

        // Sort sections alphabetically
        sectionsData.sort((a, b) => a.name.localeCompare(b.name))

        setAvailableSections(sectionsData)
        console.log("Processed sections:", sectionsData)
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      setError("Failed to load sections. Please try again later.")
    } finally {
      setLoadingSections(false)
    }
  }

  const loadBills = async () => {
    setLoadingBills(true)
    setError(null)
    try {
      // IMPORTANT: Get the actual grade value to use in the query
      let gradeValue = selectedClass

      // If we're using class IDs, find the corresponding class name
      if (useSectionFiltering && selectedClassId) {
        const classObj = availableClasses.find((c) => c.id === selectedClassId)
        if (classObj) {
          gradeValue = classObj.name
          console.log(`Using class name "${gradeValue}" from class ID "${selectedClassId}" for query`)
        }
      }

      // Get the section name if we have a section ID
      let sectionValue = selectedSection
      if (selectedSection && selectedSection !== "all") {
        const sectionObj = availableSections.find((s) => s.id === selectedSection)
        if (sectionObj) {
          sectionValue = sectionObj.name
          console.log(`Using section name "${sectionValue}" from section ID "${selectedSection}" for query`)
        }
      }

      console.log(`Loading bills for grade: ${gradeValue}${sectionValue ? `, section: ${sectionValue}` : ""}`)

      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo bills
        const demoBills: StudentBill[] = Array.from({ length: 15 }, (_, i) => {
          const rollNumber = `${i + 1}`.padStart(2, "0")
          const monthlyFee =
            gradeValue === "P.G" || gradeValue === "Nursery"
              ? 1200
              : gradeValue === "LKG"
                ? 1300
                : gradeValue === "UKG"
                  ? 1400
                  : 1500 + (Number.parseInt(gradeValue) - 1) * 100

          const particulars: Record<string, number> = {
            "Monthly Fee": monthlyFee * 3,
            "Exam Fee": 200,
            "Computer Fee": 300,
          }

          if (i % 3 === 0) {
            particulars["Transportation Fee"] = 500 * 3
          }

          if (i % 5 === 0) {
            particulars["Previous Dues"] = 1500
          }

          const totalFee = Object.values(particulars).reduce((sum, amount) => sum + amount, 0)

          // Generate random payment status and amounts
          const status = i % 4 === 0 ? "Paid" : i % 4 === 1 ? "Partially Paid" : "Unpaid"
          const paidAmount = status === "Paid" ? totalFee : status === "Partially Paid" ? Math.round(totalFee * 0.5) : 0
          const remainingBalance = totalFee - paidAmount

          // Generate receipt number with SBS prefix
          const receiptNumber = `SBS${(lastReceiptNumber + i).toString().padStart(4, "0")}`

          return {
            id: receiptNumber,
            studentId: `student${i + 1}`,
            studentName: `Student ${i + 1}`,
            rollNumber,
            grade: gradeValue,
            section: sectionValue !== "all" ? sectionValue : `Section ${String.fromCharCode(65 + (i % 3))}`, // A, B, C
            term: selectedTerm,
            year: selectedYear,
            totalFee,
            installments: 3,
            remainingBalance,
            paidAmount,
            status,
            particulars,
            createdAt: new Date().toISOString(),
          }
        })
        setBills(demoBills)
        setFilteredBills(demoBills)

        // Update the last receipt number
        const newLastReceiptNumber = lastReceiptNumber + demoBills.length
        setLastReceiptNumber(newLastReceiptNumber)
        localStorage.setItem("lastReceiptNumber", newLastReceiptNumber.toString())
      } else {
        // Load real data from Firebase
        const billsRef = collection(db, "student_bills")
        let q

        if (sectionValue && sectionValue !== "all") {
          // Filter by grade, section, term, and year
          q = query(
            billsRef,
            where("grade", "==", gradeValue),
            where("section", "==", sectionValue),
            where("term", "==", selectedTerm),
            where("year", "==", selectedYear),
          )
        } else {
          // Filter by grade, term, and year only
          q = query(
            billsRef,
            where("grade", "==", gradeValue),
            where("term", "==", selectedTerm),
            where("year", "==", selectedYear),
          )
        }

        const querySnapshot = await getDocs(q)
        console.log(`Found ${querySnapshot.size} bills matching the query`)

        const billsList: StudentBill[] = []
        let maxReceiptNumber = lastReceiptNumber

        querySnapshot.forEach((doc) => {
          const data = doc.data() as StudentBill

          // Check if the ID is already in SBS format
          let id = doc.id
          if (!id.startsWith("SBS")) {
            // Generate a new receipt number
            id = `SBS${maxReceiptNumber.toString().padStart(4, "0")}`
            maxReceiptNumber++
          } else {
            // Extract the number part and update maxReceiptNumber if needed
            const numPart = Number.parseInt(id.substring(3), 10)
            if (numPart > maxReceiptNumber) {
              maxReceiptNumber = numPart
            }
          }

          billsList.push({
            ...data,
            id,
          })
        })

        // Sort by roll number
        billsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setBills(billsList)
        setFilteredBills(billsList)

        // Update the last receipt number
        setLastReceiptNumber(maxReceiptNumber + 1)
        localStorage.setItem("lastReceiptNumber", (maxReceiptNumber + 1).toString())
      }
    } catch (error) {
      console.error("Error loading bills:", error)
      setError("Failed to load bills. Please try again later.")
      setBills([])
      setFilteredBills([])
    } finally {
      setLoadingBills(false)
    }
  }

  const filterBills = () => {
    if (!searchQuery.trim()) {
      setFilteredBills(bills)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = bills.filter(
      (bill) => bill.studentName.toLowerCase().includes(query) || bill.rollNumber.includes(query),
    )

    setFilteredBills(filtered)
  }

  const toggleBillSelection = (billId: string) => {
    setSelectedBills((prev) => {
      if (prev.includes(billId)) {
        return prev.filter((id) => id !== billId)
      } else {
        return [...prev, billId]
      }
    })
  }

  const handleSelectAll = () => {
    const newSelectAll = !selectAll
    setSelectAll(newSelectAll)

    if (newSelectAll) {
      setSelectedBills(filteredBills.map((bill) => bill.id))
    } else {
      setSelectedBills([])
    }
  }

  const printBills = (specificBillIds?: string[]) => {
    // Use the provided bill IDs or the selected bills
    const billsToPrint = specificBillIds || selectedBills

    if (billsToPrint.length === 0) {
      alert("Please select at least one bill to print")
      return
    }

    setIsPrinting(true)

    // Use setTimeout to allow the UI to update before printing
    setTimeout(() => {
      // Create a new window for printing just the bills
      const printWindow = window.open("", "_blank")

      if (!printWindow) {
        alert("Please allow pop-ups to print bills")
        setIsPrinting(false)
        return
      }

      // Filter bills to only include the ones we want to print
      const filteredBillsHtml = document.createElement("div")

      if (printLayout === "single") {
        // Single bill per page layout
        bills
          .filter((bill) => billsToPrint.includes(bill.id))
          .forEach((bill) => {
            const billElement = document.createElement("div")
            billElement.className = "bill-container mb-8 page-break-after"
            billElement.innerHTML = `
              <div class="text-center mb-6">
                <h1 class="text-2xl font-bold">SAJHA BOARDING SCHOOL</h1>
                <p class="text-lg">Chandrapur-7, Rautahat, Barbahuary</p>
                <p>Phone: +977 9815982023, Email: sajhaboardingschool.com</p>
                <div class="mt-4 text-xl font-bold border-2 border-black inline-block px-6 py-1 mx-auto">
                  FEE RECEIPT
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p>
                    <span class="font-semibold">Receipt No:</span> ${bill.id}
                  </p>
                  <p>
                    <span class="font-semibold">Student Name:</span> ${bill.studentName}
                  </p>
                  <p>
                    <span class="font-semibold">Class:</span> ${bill.grade}${bill.section ? `, Section ${bill.section}` : ""}
                  </p>
                </div>
                <div class="text-right">
                  <p>
                    <span class="font-semibold">Date:</span> ${formatDate()}
                  </p>
                  <p>
                    <span class="font-semibold">Roll No:</span> ${bill.rollNumber}
                  </p>
                  <p>
                    <span class="font-semibold">Term:</span> ${bill.term}, ${bill.year}
                  </p>
                </div>
              </div>

              <table class="w-full border-collapse mb-6">
                <thead>
                  <tr class="border-t-2 border-b-2 border-black">
                    <th class="py-2 text-left">S.N.</th>
                    <th class="py-2 text-left">Particulars</th>
                    <th class="py-2 text-right">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(bill.particulars)
                    .map(
                      ([name, amount], idx) => `
                    <tr class="border-b">
                      <td class="py-2">${idx + 1}</td>
                      <td class="py-2">${name}</td>
                      <td class="py-2 text-right">${amount.toLocaleString()}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-black font-bold">
                    <td colSpan="2" class="py-2 text-right">
                      Total:
                    </td>
                    <td class="py-2 text-right">Rs. ${bill.totalFee.toLocaleString()}</td>
                  </tr>
                  ${
                    bill.paidAmount
                      ? `
                  <tr>
                    <td colSpan="2" class="py-2 text-right">
                      Paid Amount:
                    </td>
                    <td class="py-2 text-right">Rs. ${bill.paidAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan="2" class="py-2 text-right">
                      Balance:
                    </td>
                    <td class="py-2 text-right">Rs. ${bill.remainingBalance.toLocaleString()}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr>
                    <td colSpan="3" class="py-2">
                      <span class="font-semibold">In words:</span> 
                      ${convertToWords(bill.totalFee)} rupees only
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" class="py-2">
                      <span class="font-semibold">Payment Status:</span> 
                      <span class="${getStatusColor(bill.status)}">${bill.status}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div class="mt-12">
                <div class="text-center">
                  <div class="border-t border-black pt-1 w-48 mx-auto">Accountant</div>
                </div>
              </div>

              <div class="mt-8 text-xs">
                <p class="font-semibold">Note:</p>
                <ul class="list-disc list-inside">
                  <li>This is a computer-generated receipt and does not require a signature.</li>
                  <li>Please keep this receipt for future reference.</li>
                  <li>For any queries, please contact the school office.</li>
                </ul>
              </div>
            `
            filteredBillsHtml.appendChild(billElement)
          })
      } else {
        // Compact layout with multiple bills per page
        const compactBillsDiv = document.createElement("div")
        compactBillsDiv.className = `compact-bills bills-per-page-${billsPerPage}`

        bills
          .filter((bill) => billsToPrint.includes(bill.id))
          .forEach((bill, index) => {
            const billElement = document.createElement("div")
            billElement.className = `compact-bill ${(index + 1) % Number.parseInt(billsPerPage) === 0 ? "page-break-after" : ""}`
            billElement.innerHTML = `
              <div class="text-center mb-2">
                <h2 class="text-base font-bold">SAJHA BOARDING SCHOOL</h2>
                <p class="text-xs">Chandrapur-7, Rautahat, Barbahuary</p>
                <div class="mt-1 text-sm font-bold border border-black inline-block px-2 py-0.5 mx-auto">
                  FEE RECEIPT
                </div>
              </div>

              <div class="grid grid-cols-2 gap-1 mb-1 text-xs">
                <div>
                  <p><span class="font-semibold">Receipt:</span> ${bill.id}</p>
                  <p><span class="font-semibold">Name:</span> ${bill.studentName}</p>
                  <p><span class="font-semibold">Class:</span> ${bill.grade}${bill.section ? `, ${bill.section}` : ""}</p>
                </div>
                <div class="text-right">
                  <p><span class="font-semibold">Date:</span> ${formatDate()}</p>
                  <p><span class="font-semibold">Roll:</span> ${bill.rollNumber}</p>
                  <p><span class="font-semibold">Term:</span> ${bill.term}, ${bill.year}</p>
                </div>
              </div>

              <table class="w-full border-collapse mb-2 text-xs">
                <thead>
                  <tr class="border-t border-b border-black">
                    <th class="py-0.5 text-left">S.N.</th>
                    <th class="py-0.5 text-left">Particulars</th>
                    <th class="py-0.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(bill.particulars)
                    .map(
                      ([name, amount], idx) => `
                    <tr class="border-b">
                      <td class="py-0.5">${idx + 1}</td>
                      <td class="py-0.5">${name}</td>
                      <td class="py-0.5 text-right">${amount.toLocaleString()}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr class="border-t border-black font-bold">
                    <td colSpan="2" class="py-0.5 text-right">Total:</td>
                    <td class="py-0.5 text-right">Rs. ${bill.totalFee.toLocaleString()}</td>
                  </tr>
                  ${
                    bill.paidAmount
                      ? `
                  <tr>
                    <td colSpan="2" class="py-0.5 text-right">Paid:</td>
                    <td class="py-0.5 text-right">Rs. ${bill.paidAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan="2" class="py-0.5 text-right">Balance:</td>
                    <td class="py-0.5 text-right">Rs. ${bill.remainingBalance.toLocaleString()}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr>
                    <td colSpan="3" class="py-0.5 text-xs">
                      <span class="font-semibold">In words:</span> 
                      ${convertToWords(bill.totalFee)} rupees only
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" class="py-0.5">
                      <span class="font-semibold">Status:</span> 
                      <span class="${getStatusColor(bill.status)}">${bill.status}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div class="mt-2 text-xs">
                <div class="text-center">
                  <div class="border-t border-black pt-0.5 w-24 mx-auto">Accountant</div>
                </div>
              </div>
            `
            compactBillsDiv.appendChild(billElement)
          })

        filteredBillsHtml.appendChild(compactBillsDiv)
      }

      // Create a complete HTML document with necessary styles
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Bills</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                margin: 0;
                padding: 0;
              }
              
              @page {
                size: A4;
                margin: 1cm;
              }
              
              .page-break-after {
                page-break-after: always;
              }
              
              .bill-container {
                padding: 1rem;
                max-width: 100%;
              }
              
              /* Compact bills layout styles */
              .compact-bills {
                display: grid;
                gap: 0.5rem;
                page-break-inside: avoid;
              }
              
              .bills-per-page-2 {
                grid-template-columns: repeat(1, 1fr);
                grid-template-rows: repeat(2, 1fr);
              }
              
              .bills-per-page-4 {
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(2, 1fr);
              }
              
              .bills-per-page-6 {
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(3, 1fr);
              }
              
              .compact-bill {
                border: 1px solid #000;
                padding: 0.5rem;
                font-size: 0.7rem;
                page-break-inside: avoid;
              }
              
              .compact-bill table {
                font-size: 0.65rem;
              }
              
              .compact-bill h2 {
                font-size: 0.8rem;
                margin-bottom: 0.1rem;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
              }
              
              .text-green-600 {
                color: #059669;
              }
              
              .text-amber-600 {
                color: #d97706;
              }
              
              .text-red-600 {
                color: #dc2626;
              }
              
              .text-center {
                text-align: center;
              }
              
              .text-right {
                text-align: right;
              }
              
              .font-bold {
                font-weight: bold;
              }
              
              .font-semibold {
                font-weight: 600;
              }
              
              .text-xs {
                font-size: 0.75rem;
              }
              
              .text-sm {
                font-size: 0.875rem;
              }
              
              .text-base {
                font-size: 1rem;
              }
              
              .text-lg {
                font-size: 1.125rem;
              }
              
              .text-xl {
                font-size: 1.25rem;
              }
              
              .text-2xl {
                font-size: 1.5rem;
              }
              
              .border {
                border-width: 1px;
                border-style: solid;
              }
              
              .border-t {
                border-top-width: 1px;
                border-top-style: solid;
              }
              
              .border-b {
                border-bottom-width: 1px;
                border-bottom-style: solid;
              }
              
              .border-black {
                border-color: #000;
              }
              
              .grid {
                display: grid;
              }
              
              .grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
              
              .gap-1 {
                gap: 0.25rem;
              }
              
              .gap-4 {
                gap: 1rem;
              }
              
              .mb-1 {
                margin-bottom: 0.25rem;
              }
              
              .mb-2 {
                margin-bottom: 0.5rem;
              }
              
              .mb-4 {
                margin-bottom: 1rem;
              }
              
              .mb-6 {
                margin-bottom: 1.5rem;
              }
              
              .mb-8 {
                margin-bottom: 2rem;
              }
              
              .mt-1 {
                margin-top: 0.25rem;
              }
              
              .mt-2 {
                margin-top: 0.5rem;
              }
              
              .mt-4 {
                margin-top: 1rem;
              }
              
              .mt-8 {
                margin-top: 2rem;
              }
              
              .mt-12 {
                margin-top: 3rem;
              }
              
              .mx-auto {
                margin-left: auto;
                margin-right: auto;
              }
              
              .py-0\\.5 {
                padding-top: 0.125rem;
                padding-bottom: 0.125rem;
              }
              
              .py-1 {
                padding-top: 0.25rem;
                padding-bottom: 0.25rem;
              }
              
              .py-2 {
                padding-top: 0.5rem;
                padding-bottom: 0.5rem;
              }
              
              .px-2 {
                padding-left: 0.5rem;
                padding-right: 0.5rem;
              }
              
              .px-6 {
                padding-left: 1.5rem;
                padding-right: 1.5rem;
              }
              
              .pt-0\\.5 {
                padding-top: 0.125rem;
              }
              
              .pt-1 {
                padding-top: 0.25rem;
              }
              
              .inline-block {
                display: inline-block;
              }
              
              .w-24 {
                width: 6rem;
              }
              
              .w-48 {
                width: 12rem;
              }
              
              .w-full {
                width: 100%;
              }
              
              .list-disc {
                list-style-type: disc;
              }
              
              .list-inside {
                list-style-position: inside;
              }
            </style>
          </head>
          <body>
            ${filteredBillsHtml.innerHTML}
            <script>
              // Auto print and close after loading
              window.onload = function() {
                window.print();
                // Uncomment the line below if you want the print window to close automatically after printing
                // setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `

      // Write to the new window and trigger print
      printWindow.document.open()
      printWindow.document.write(printContent)
      printWindow.document.close()

      setIsPrinting(false)
    }, 100)
  }

  const exportToPDF = () => {
    if (selectedBills.length === 0) {
      alert("Please select at least one bill to export")
      return
    }

    alert("PDF export functionality would be implemented here")
    // In a real implementation, you would use a library like jsPDF or html2pdf
  }

  const formatDate = () => {
    const date = new Date()
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "text-green-600"
      case "Partially Paid":
        return "text-amber-600"
      default:
        return "text-red-600"
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-6xl">
      {/* Non-printable controls */}
      <div className="print:hidden">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Print Student Bills</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Class</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingClasses ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={useSectionFiltering ? selectedClassId : selectedClass}
                  onValueChange={(value) => {
                    if (useSectionFiltering) {
                      console.log("Class ID selected:", value)
                      setSelectedClassId(value)
                      const classObj = availableClasses.find((c) => c.id === value)
                      setSelectedClass(classObj?.name || "")

                      // Reset section when class changes
                      setSelectedSection("")
                      setSelectedSectionId("")
                    } else {
                      console.log("Class name selected:", value)
                      setSelectedClass(value)
                      setSelectedClassId("")
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.length > 0 ? (
                      availableClasses.map((cls) => (
                        <SelectItem key={cls.id} value={useSectionFiltering ? cls.id : cls.name}>
                          {cls.displayName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-classes" disabled>
                        No classes available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {useSectionFiltering && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Section</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSections ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedSection}
                    onValueChange={(value) => {
                      console.log("Section selected:", value)
                      setSelectedSection(value)
                      setSelectedSectionId(value)
                    }}
                    disabled={!selectedClassId || availableSections.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedClassId
                            ? "Select a class first"
                            : availableSections.length === 0
                              ? "No sections available"
                              : "Select Section"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {availableSections.length > 0 ? (
                        availableSections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            Section {section.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-sections" disabled>
                          No sections available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Term</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedTerm}
                onValueChange={(value) => {
                  console.log("Term selected:", value)
                  setSelectedTerm(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Year (BS)</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedYear}
                onValueChange={(value) => {
                  console.log("Year selected:", value)
                  setSelectedYear(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearsBS.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or Roll Number"
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="mb-6">
          <TabsList>
            <TabsTrigger value="list">Bill List</TabsTrigger>
            <TabsTrigger value="preview">Print Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Student Bills</span>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="selectAll" checked={selectAll} onCheckedChange={handleSelectAll} />
                    <label htmlFor="selectAll" className="text-sm font-normal">
                      Select All
                    </label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <div className="grid grid-cols-12 p-2 font-medium border-b bg-muted">
                    <div className="col-span-1"></div>
                    <div className="col-span-1">Roll</div>
                    <div className="col-span-3">Name</div>
                    <div className="col-span-1">Section</div>
                    <div className="col-span-1">Term</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1 text-right">Paid</div>
                    <div className="col-span-1 text-right">Balance</div>
                    <div className="col-span-1 text-right">Status</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {loadingBills ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p>Loading bills...</p>
                      </div>
                    ) : filteredBills.length > 0 ? (
                      filteredBills.map((bill) => (
                        <div key={bill.id} className="grid grid-cols-12 p-2 items-center">
                          <div className="col-span-1">
                            <Checkbox
                              checked={selectedBills.includes(bill.id)}
                              onCheckedChange={() => toggleBillSelection(bill.id)}
                            />
                          </div>
                          <div className="col-span-1">{bill.rollNumber}</div>
                          <div className="col-span-3">{bill.studentName}</div>
                          <div className="col-span-1">{bill.section || "-"}</div>
                          <div className="col-span-1">{bill.term.split(" ")[0]}</div>
                          <div className="col-span-1 text-right">Rs. {bill.totalFee.toLocaleString()}</div>
                          <div className="col-span-1 text-right">Rs. {(bill.paidAmount || 0).toLocaleString()}</div>
                          <div className="col-span-1 text-right">Rs. {bill.remainingBalance.toLocaleString()}</div>
                          <div className={`col-span-1 text-right ${getStatusColor(bill.status)}`}>{bill.status}</div>
                          <div className="col-span-1 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault()
                                // Don't change the selection, just print the currently selected bills
                                // If no bills are selected, print just this one
                                const billsToPrint = selectedBills.length > 0 ? selectedBills : [bill.id]
                                printBills(billsToPrint)
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        {bills.length === 0
                          ? "No bills found. Please select a class, term and year."
                          : "No bills match your search criteria."}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="preview">
            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-2">
                {selectedBills.length} bill(s) selected for printing
              </div>

              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">Print Layout Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Layout Type</h3>
                      <RadioGroup
                        value={printLayout}
                        onValueChange={(value) => setPrintLayout(value as "single" | "compact")}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="single" id="single" />
                          <Label htmlFor="single" className="flex items-center">
                            <LayoutList className="h-4 w-4 mr-2" />
                            Single Bill Per Page
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="compact" id="compact" />
                          <Label htmlFor="compact" className="flex items-center">
                            <Grid2X2 className="h-4 w-4 mr-2" />
                            Multiple Bills Per Page
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {printLayout === "compact" && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Bills Per Page</h3>
                        <RadioGroup
                          value={billsPerPage}
                          onValueChange={(value) => setBillsPerPage(value as "2" | "4" | "6")}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="2" id="two" />
                            <Label htmlFor="two">2 Bills</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="4" id="four" />
                            <Label htmlFor="four">4 Bills</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="6" id="six" />
                            <Label htmlFor="six">6 Bills</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-4">
                <Button onClick={() => printBills()} disabled={selectedBills.length === 0 || isPrinting}>
                  {isPrinting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Selected Bills
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={exportToPDF} disabled={selectedBills.length === 0}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to PDF
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Printable content - hidden but used as a template for the print window */}
      <div ref={printContainerRef} className={`hidden print:block ${isPrinting ? "block" : "hidden"}`}>
        {printLayout === "single" ? (
          // Single bill per page layout
          bills
            .filter((bill) => selectedBills.includes(bill.id))
            .map((bill) => (
              <div key={bill.id} className="bill-container mb-8 page-break-after">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">SAJHA BOARDING SCHOOL</h1>
                  <p className="text-lg">Chandrapur-7, Rautahat, Barbahuary</p>
                  <p>Phone: +977 9815982023, Email: sajhaboardingschool.com</p>
                  <div className="mt-4 text-xl font-bold border-2 border-black inline-block px-6 py-1 mx-auto">
                    FEE RECEIPT
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p>
                      <span className="font-semibold">Receipt No:</span> {bill.id}
                    </p>
                    <p>
                      <span className="font-semibold">Student Name:</span> {bill.studentName}
                    </p>
                    <p>
                      <span className="font-semibold">Class:</span> {bill.grade}
                      {bill.section ? `, Section ${bill.section}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      <span className="font-semibold">Date:</span> {formatDate()}
                    </p>
                    <p>
                      <span className="font-semibold">Roll No:</span> {bill.rollNumber}
                    </p>
                    <p>
                      <span className="font-semibold">Term:</span> {bill.term}, {bill.year}
                    </p>
                  </div>
                </div>

                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr className="border-t-2 border-b-2 border-black">
                      <th className="py-2 text-left">S.N.</th>
                      <th className="py-2 text-left">Particulars</th>
                      <th className="py-2 text-right">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bill.particulars).map(([name, amount], idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{idx + 1}</td>
                        <td className="py-2">{name}</td>
                        <td className="py-2 text-right">{amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-bold">
                      <td colSpan={2} className="py-2 text-right">
                        Total:
                      </td>
                      <td className="py-2 text-right">Rs. {bill.totalFee.toLocaleString()}</td>
                    </tr>
                    {bill.paidAmount ? (
                      <>
                        <tr>
                          <td colSpan={2} className="py-2 text-right">
                            Paid Amount:
                          </td>
                          <td className="py-2 text-right">Rs. {bill.paidAmount.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="py-2 text-right">
                            Balance:
                          </td>
                          <td className="py-2 text-right">Rs. {bill.remainingBalance.toLocaleString()}</td>
                        </tr>
                      </>
                    ) : null}
                    <tr>
                      <td colSpan={3} className="py-2">
                        <span className="font-semibold">In words:</span> {convertToWords(bill.totalFee)} rupees only
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-2">
                        <span className="font-semibold">Payment Status:</span>{" "}
                        <span className={getStatusColor(bill.status)}>{bill.status}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-12">
                  <div className="text-center">
                    <div className="border-t border-black pt-1 w-48 mx-auto">Accountant</div>
                  </div>
                </div>

                <div className="mt-8 text-xs">
                  <p className="font-semibold">Note:</p>
                  <ul className="list-disc list-inside">
                    <li>This is a computer-generated receipt and does not require a signature.</li>
                    <li>Please keep this receipt for future reference.</li>
                    <li>For any queries, please contact the school office.</li>
                  </ul>
                </div>
              </div>
            ))
        ) : (
          // Compact layout with multiple bills per page
          <div className={`compact-bills bills-per-page-${billsPerPage}`}>
            {bills
              .filter((bill) => selectedBills.includes(bill.id))
              .map((bill, index) => (
                <div
                  key={bill.id}
                  className={`compact-bill ${(index + 1) % Number.parseInt(billsPerPage) === 0 ? "page-break-after" : ""}`}
                >
                  <div className="text-center mb-2">
                    <h2 className="text-base font-bold">SAJHA BOARDING SCHOOL</h2>
                    <p className="text-xs">Chandrapur-7, Rautahat, Barbahuary</p>
                    <div className="mt-1 text-sm font-bold border border-black inline-block px-2 py-0.5 mx-auto">
                      FEE RECEIPT
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 mb-1 text-xs">
                    <div>
                      <p>
                        <span className="font-semibold">Receipt:</span> {bill.id}
                      </p>
                      <p>
                        <span className="font-semibold">Name:</span> {bill.studentName}
                      </p>
                      <p>
                        <span className="font-semibold">Class:</span> {bill.grade}
                        {bill.section ? `, ${bill.section}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>
                        <span className="font-semibold">Date:</span> {formatDate()}
                      </p>
                      <p>
                        <span className="font-semibold">Roll:</span> {bill.rollNumber}
                      </p>
                      <p>
                        <span className="font-semibold">Term:</span> {bill.term}, {bill.year}
                      </p>
                    </div>
                  </div>

                  <table className="w-full border-collapse mb-2 text-xs">
                    <thead>
                      <tr className="border-t border-b border-black">
                        <th className="py-0.5 text-left">S.N.</th>
                        <th className="py-0.5 text-left">Particulars</th>
                        <th className="py-0.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(bill.particulars).map(([name, amount], idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-0.5">{idx + 1}</td>
                          <td className="py-0.5">{name}</td>
                          <td className="py-0.5 text-right">{amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-black font-bold">
                        <td colSpan="2" className="py-0.5 text-right">
                          Total:
                        </td>
                        <td className="py-0.5 text-right">Rs. {bill.totalFee.toLocaleString()}</td>
                      </tr>
                      {bill.paidAmount ? (
                        <>
                          <tr>
                            <td colSpan="2" className="py-0.5 text-right">
                              Paid:
                            </td>
                            <td className="py-0.5 text-right">Rs. {bill.paidAmount.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td colSpan="2" className="py-0.5 text-right">
                              Balance:
                            </td>
                            <td className="py-0.5 text-right">Rs. {bill.remainingBalance.toLocaleString()}</td>
                          </tr>
                        </>
                      ) : null}
                      <tr>
                        <td colSpan="3" className="py-0.5 text-xs">
                          <span className="font-semibold">In words:</span>
                          {convertToWords(bill.totalFee)} rupees only
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="py-0.5">
                          <span className="font-semibold">Status:</span>
                          <span className={getStatusColor(bill.status)}>{bill.status}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="mt-2 text-xs">
                    <div className="text-center">
                      <div className="border-t border-black pt-0.5 w-24 mx-auto">Accountant</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
