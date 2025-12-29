"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { collection, query, where, getDocs, doc, writeBatch, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config" // Import db from your config file
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Loader2, CreditCard, FileText, Users, CheckCircle2, AlertCircle, Clock } from "lucide-react"

interface BillStudent {
  id: string
  name: string
  rollNumber: string
  dues: number
  isSelected: boolean
  grade?: string
  section?: string
  sectionId?: string
}

interface StudentBill {
  id: string
  studentId: string
  studentName: string
  rollNumber: string
  grade: string
  gradeId?: string
  section?: string
  sectionId?: string
  term: string
  year: string
  totalFee: number
  installments: number
  remainingBalance: number
  status: string
  particulars: Record<string, number>
  createdAt: string
  paidAmount?: number
  paidDate?: string
}

interface Particular {
  name: string
  amount: number
  isSelected: boolean
}

export default function UpdateBillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  // States
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("") // Added to track class ID
  const [selectedClassName, setSelectedClassName] = useState("") // Added to track class name
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSectionName, setSelectedSectionName] = useState("") // Added to track section name
  const [selectedTerm, setSelectedTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [students, setStudents] = useState<BillStudent[]>([])
  const [bills, setBills] = useState<StudentBill[]>([])
  const [particulars, setParticulars] = useState<Particular[]>([
    { name: "Admission Fee", amount: 5000, isSelected: false },
    { name: "Tuition Fee", amount: 10000, isSelected: false },
    { name: "Exam Fee", amount: 2000, isSelected: false },
    { name: "Sports Fee", amount: 1000, isSelected: false },
    { name: "Library Fee", amount: 500, isSelected: false },
    { name: "Computer Fee", amount: 1500, isSelected: false },
    { name: "Development Fee", amount: 2500, isSelected: false },
    { name: "Miscellaneous", amount: 1000, isSelected: false },
    { name: "Previous Dues", amount: 0, isSelected: false },
  ])
  const [selectAllStudents, setSelectAllStudents] = useState(false)
  const [selectAllParticulars, setSelectAllParticulars] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("Unpaid")
  const [amountPaid, setAmountPaid] = useState("")
  const [activeTab, setActiveTab] = useState("students")
  const [searchQuery, setSearchQuery] = useState("")

  // Load data on component mount
  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    loadClassesTermsYears()
    setLoading(false)
  }, [teacherId, router])

  // Load students and bills when class, term, and year are selected
  useEffect(() => {
    if ((selectedClassId || selectedClass) && selectedTerm && selectedYear) {
      loadStudentsAndBills()
    }
  }, [selectedClassId, selectedClass, selectedSection, selectedTerm, selectedYear])

  // Update "Previous Dues" amount when students are selected
  useEffect(() => {
    if (students.length > 0) {
      const selectedStudents = students.filter((s) => s.isSelected)
      if (selectedStudents.length > 0) {
        updatePreviousDuesAmount(selectedStudents)
      }
    }
  }, [students])

  // Load sections when class changes
  useEffect(() => {
    if (selectedClassId || selectedClass) {
      loadSections()
      setSelectedSection("") // Reset section when class changes
      setSelectedSectionName("") // Reset section name when class changes
    }
  }, [selectedClassId, selectedClass])

  // Load classes, terms, and years
  const loadClassesTermsYears = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, use dummy data
        setClasses(["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
        setTerms(["First Term", "Second Term", "Third Term", "Fourth Term"])
        setYears(["2080", "2081", "2082", "2083", "2084", "2085"])
      } else {
        // In real mode, fetch data from Firestore
        try {
          // Load classes with their IDs
          const classesRef = collection(db, "classes")
          const classesSnapshot = await getDocs(classesRef)

          if (classesSnapshot.empty) {
            console.log("No classes found in database, using default values")
            setClasses(["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
          } else {
            const classesList = classesSnapshot.docs.map((doc) => ({
              id: doc.id,
              name: doc.data().name || doc.id,
            }))
            // Store the full class objects in state
            setClasses(classesList)
          }

          // Fallback to hardcoded values if no terms are found
          const termsRef = collection(db, "terms")
          const termsSnapshot = await getDocs(termsRef)

          if (termsSnapshot.empty) {
            console.log("No terms found in database, using default values")
            setTerms(["First Term", "Second Term", "Third Term", "Fourth Term"])
          } else {
            const termsList = termsSnapshot.docs.map((doc) => doc.data().name || doc.id)
            setTerms(termsList)
          }

          // Fallback to hardcoded values if no years are found
          const yearsRef = collection(db, "years")
          const yearsSnapshot = await getDocs(yearsRef)

          if (yearsSnapshot.empty) {
            console.log("No years found in database, using default values")
            setYears(["2080", "2081", "2082", "2083", "2084", "2085"])
          } else {
            const yearsList = yearsSnapshot.docs.map((doc) => doc.data().name || doc.id)
            setYears(yearsList)
          }
        } catch (error) {
          console.error("Error fetching data from Firestore:", error)
          // Fallback to default values if there's an error
          setClasses(["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
          setTerms(["First Term", "Second Term", "Third Term", "Fourth Term"])
          setYears(["2080", "2081", "2082", "2083", "2084", "2085"])
        }
      }
    } catch (error) {
      console.error("Error loading classes, terms, and years:", error)
      // Fallback to default values if there's an error
      setClasses(["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
      setTerms(["First Term", "Second Term", "Third Term", "Fourth Term"])
      setYears(["2080", "2081", "2082", "2083", "2084", "2085"])
    }
  }

  // Load sections for the selected class
  const loadSections = async () => {
    if (!selectedClassId && !selectedClass) return

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, use dummy data
        setSections([
          { id: "section1", name: "A" },
          { id: "section2", name: "B" },
          { id: "section3", name: "C" },
        ])
      } else {
        // Find the selected class object
        const classId = selectedClassId || selectedClass
        const classObj = classes.find((c) => c.id === classId || c.name === classId)
        if (!classObj) return

        // Get the class document to access its sections
        const classDoc = await getDoc(doc(db, "classes", classObj.id))
        if (!classDoc.exists()) return

        const classData = classDoc.data()
        const sectionIds = classData.sections || []

        // If no sections, set empty array
        if (!sectionIds.length) {
          setSections([])
          return
        }

        // Load each section document to get the name
        const sectionsData = []
        for (const sectionId of sectionIds) {
          try {
            if (typeof sectionId === "string") {
              // If it's a simple string like "A", "B", etc.
              if (sectionId.length <= 2) {
                sectionsData.push({
                  id: sectionId,
                  name: sectionId,
                })
              } else {
                // Try to fetch the section document
                const sectionDoc = await getDoc(doc(db, "sections", sectionId))
                if (sectionDoc.exists()) {
                  sectionsData.push({
                    id: sectionId,
                    name: sectionDoc.data().name || sectionId,
                  })
                }
              }
            }
          } catch (error) {
            console.error(`Error processing section ${sectionId}:`, error)
          }
        }

        setSections(sectionsData)
      }
    } catch (error) {
      console.error("Error loading sections:", error)
      setSections([])
    }
  }

  // Load students and bills
  const loadStudentsAndBills = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, use dummy data
        const demoStudents: BillStudent[] = Array.from({ length: 15 }, (_, i) => ({
          id: `student${i + 1}`,
          name: `Student ${i + 1}`,
          rollNumber: `${i + 1}`,
          grade: selectedClassName || selectedClass,
          section: selectedSectionName || selectedSection,
          sectionId: selectedSection,
          dues: i % 3 === 0 ? Math.floor(Math.random() * 5000) + 500 : 0,
          isSelected: false,
        }))
        setStudents(demoStudents)

        const demoBills: StudentBill[] = []
        setBills(demoBills)

        // Update particulars based on bills and student dues
        updateParticularsFromBills(demoBills, demoStudents)
      } else {
        // IMPORTANT: Get the actual grade value to use in the query
        // This is the key change - we need to use the correct grade value with exact case
        let gradeValue = selectedClassName || selectedClass

        // If we're using class IDs, find the corresponding class name
        if (selectedClassId && !selectedClassName) {
          const classObj = classes.find((c) => c.id === selectedClassId)
          if (classObj && typeof classObj !== "string") {
            gradeValue = classObj.name
            console.log(`Using class name "${gradeValue}" from class ID "${selectedClassId}" for query`)
          }
        }

        // Get the section name if we have a section ID
        let sectionValue = selectedSectionName || selectedSection
        if (selectedSection && !selectedSectionName && selectedSection !== "all") {
          const sectionObj = sections.find((s) => s.id === selectedSection)
          if (sectionObj) {
            sectionValue = sectionObj.name
            console.log(`Using section name "${sectionValue}" from section ID "${selectedSection}" for query`)
          }
        }

        console.log(`Loading students for grade: ${gradeValue}${sectionValue ? `, section: ${sectionValue}` : ""}`)

        // In real mode, fetch data from Firestore
        let studentsQuery

        if (sectionValue && sectionValue !== "all") {
          // Filter by both grade and section
          console.log(`Querying with grade="${gradeValue}" AND section="${sectionValue}"`)
          studentsQuery = query(
            collection(db, "students"),
            where("grade", "==", gradeValue),
            where("section", "==", sectionValue),
          )
        } else {
          // Only filter by grade
          console.log(`Querying with grade="${gradeValue}" ONLY`)
          studentsQuery = query(collection(db, "students"), where("grade", "==", gradeValue))
        }

        const studentsSnapshot = await getDocs(studentsQuery)
        console.log(`Found ${studentsSnapshot.size} students matching the query`)

        const studentsList: BillStudent[] = []

        studentsSnapshot.forEach((doc) => {
          const data = doc.data()
          studentsList.push({
            id: doc.id,
            name: data.name || "Unknown",
            rollNumber: data.rollNumber || "0",
            grade: data.grade || gradeValue,
            section: data.section,
            sectionId: data.sectionId,
            dues: data.dues || 0,
            isSelected: false,
          })
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(studentsList)

        // Build the bills query
        let billsQuery

        if (sectionValue && sectionValue !== "all") {
          // Filter by grade, section, term, and year
          billsQuery = query(
            collection(db, "student_bills"),
            where("grade", "==", gradeValue),
            where("section", "==", sectionValue),
            where("term", "==", selectedTerm),
            where("year", "==", selectedYear),
          )
        } else {
          // Filter by grade, term, and year
          billsQuery = query(
            collection(db, "student_bills"),
            where("grade", "==", gradeValue),
            where("term", "==", selectedTerm),
            where("year", "==", selectedYear),
          )
        }

        const billsSnapshot = await getDocs(billsQuery)
        console.log(`Found ${billsSnapshot.size} bills matching the query`)

        const billsList: StudentBill[] = []

        billsSnapshot.forEach((doc) => {
          const data = doc.data() as StudentBill
          billsList.push({
            ...data,
            id: doc.id,
          })
        })

        setBills(billsList)

        // Update particulars based on bills and student dues
        updateParticularsFromBills(billsList, studentsList)
      }
    } catch (error) {
      console.error("Error loading students and bills:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateParticularsFromBills = (bills: StudentBill[], studentsList: BillStudent[]) => {
    if (bills.length === 0) {
      setParticulars(particulars.map((p) => ({ ...p, isSelected: false })))
      setSelectAllParticulars(false)
      return
    }

    // Get all unique particular names from bills
    const particularNames = new Set<string>()
    bills.forEach((bill) => {
      Object.keys(bill.particulars).forEach((name) => {
        particularNames.add(name)
      })
    })

    // Update particulars list with amounts from bills
    const updatedParticulars: Particular[] = []

    particularNames.forEach((name) => {
      // Find the average amount for this particular across all bills
      let totalAmount = 0
      let count = 0

      bills.forEach((bill) => {
        if (bill.particulars[name]) {
          totalAmount += bill.particulars[name]
          count++
        }
      })

      const averageAmount = count > 0 ? Math.round(totalAmount / count) : 0

      // Check if this particular already exists in our list
      const existingIndex = particulars.findIndex((p) => p.name === name)

      if (existingIndex !== -1) {
        updatedParticulars.push({
          ...particulars[existingIndex],
          amount: averageAmount,
          isSelected: true,
        })
      } else {
        updatedParticulars.push({
          name,
          amount: averageAmount,
          isSelected: true,
        })
      }
    })

    // Add any remaining particulars that weren't in the bills
    particulars.forEach((p) => {
      if (!particularNames.has(p.name)) {
        updatedParticulars.push({ ...p, isSelected: false })
      }
    })

    // Special handling for "Previous Dues" - update it with actual student dues
    const previousDuesIndex = updatedParticulars.findIndex((p) => p.name === "Previous Dues")
    if (previousDuesIndex !== -1) {
      // Remove it first
      updatedParticulars.splice(previousDuesIndex, 1)
    }

    // Add it back with the correct value
    updatedParticulars.push({
      name: "Previous Dues",
      amount: 0, // Default value, will be updated per student
      isSelected: false,
    })

    setParticulars(updatedParticulars)
    setSelectAllParticulars(true)

    // Update student selection
    setSelectAllStudents(students.every((s) => s.isSelected))
  }

  const updatePreviousDuesAmount = (selectedStudents: BillStudent[]) => {
    if (selectedStudents.length === 0) return

    // Find the "Previous Dues" particular
    const previousDuesIndex = particulars.findIndex((p) => p.name === "Previous Dues")
    if (previousDuesIndex === -1) return

    // Calculate the total dues from all selected students
    const totalDues = selectedStudents.reduce((sum, student) => sum + (student.dues || 0), 0)

    // Calculate average dues per student (for the bill display)
    const averageDues = totalDues > 0 ? Math.round(totalDues / selectedStudents.length) : 0

    // Update the "Previous Dues" particular
    const updatedParticulars = [...particulars]
    updatedParticulars[previousDuesIndex] = {
      ...updatedParticulars[previousDuesIndex],
      amount: averageDues,
      isSelected: averageDues > 0, // Auto-select if there are dues
    }

    setParticulars(updatedParticulars)
  }

  const toggleStudentSelection = (index: number) => {
    const updatedStudents = [...students]
    updatedStudents[index].isSelected = !updatedStudents[index].isSelected
    setStudents(updatedStudents)

    // Update "Previous Dues" particular amount when a student is selected
    updatePreviousDuesAmount(updatedStudents.filter((s) => s.isSelected))

    // Update selectAllStudents state
    setSelectAllStudents(updatedStudents.every((s) => s.isSelected))
  }

  const handleSelectAllStudents = () => {
    const newSelectAll = !selectAllStudents
    setSelectAllStudents(newSelectAll)

    const updatedStudents = students.map((s) => ({
      ...s,
      isSelected: newSelectAll,
    }))
    setStudents(updatedStudents)

    // Update "Previous Dues" particular amount based on selected students
    if (newSelectAll) {
      updatePreviousDuesAmount(updatedStudents)
    } else {
      // If deselecting all, reset the "Previous Dues" amount
      const updatedParticulars = [...particulars]
      const previousDuesIndex = updatedParticulars.findIndex((p) => p.name === "Previous Dues")
      if (previousDuesIndex !== -1) {
        updatedParticulars[previousDuesIndex] = {
          ...updatedParticulars[previousDuesIndex],
          amount: 0,
          isSelected: false,
        }
        setParticulars(updatedParticulars)
      }
    }
  }

  const toggleParticularSelection = (index: number) => {
    const updatedParticulars = [...particulars]
    updatedParticulars[index].isSelected = !updatedParticulars[index].isSelected
    setParticulars(updatedParticulars)

    // Update selectAllParticulars state
    setSelectAllParticulars(updatedParticulars.every((p) => p.isSelected))
  }

  const handleSelectAllParticulars = () => {
    const newSelectAll = !selectAllParticulars
    setSelectAllParticulars(newSelectAll)

    const updatedParticulars = particulars.map((p) => ({
      ...p,
      isSelected: newSelectAll,
    }))
    setParticulars(updatedParticulars)
  }

  const updateBills = async () => {
    // IMPORTANT: Get the actual grade value to use in the query
    let gradeValue = selectedClassName || selectedClass

    // If we're using class IDs, find the corresponding class name
    if (selectedClassId && !selectedClassName) {
      const classObj = classes.find((c) => c.id === selectedClassId)
      if (classObj && typeof classObj !== "string") {
        gradeValue = classObj.name
      }
    }

    // Get the section name if we have a section ID
    let sectionValue = selectedSectionName || selectedSection
    if (selectedSection && !selectedSectionName && selectedSection !== "all") {
      const sectionObj = sections.find((s) => s.id === selectedSection)
      if (sectionObj) {
        sectionValue = sectionObj.name
      }
    }

    if (!gradeValue || !selectedTerm || !selectedYear) {
      alert("Please select class, term and year")
      return
    }

    const selectedStudentsList = students.filter((s) => s.isSelected)
    if (selectedStudentsList.length === 0) {
      alert("Please select at least one student")
      return
    }

    const selectedParticularsList = particulars.filter((p) => p.isSelected)
    if (selectedParticularsList.length === 0) {
      alert("Please select at least one particular")
      return
    }

    // Validate amount paid if status is "Paid" or "Partially Paid"
    let paidAmount = 0
    if (selectedStatus !== "Unpaid") {
      if (!amountPaid.trim()) {
        alert("Please enter the amount paid")
        return
      }

      paidAmount = Number.parseInt(amountPaid)
      if (isNaN(paidAmount) || paidAmount <= 0) {
        alert("Please enter a valid amount paid")
        return
      }
    }

    setUpdating(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, just show success message
        setTimeout(() => {
          alert("Bills updated successfully (Demo Mode)")
          router.push(`/teacher/dashboard?id=${teacherId}`)
        }, 1000)
        return
      }

      // In real mode, update bills in Firestore
      const batch = writeBatch(db)

      // For each selected student, we need to handle their bill and dues separately
      for (const student of selectedStudentsList) {
        // Find existing bill for this student
        const existingBill = bills.find((b) => b.studentId === student.id)

        // Create particulars specific to this student
        const studentParticulars: Record<string, number> = {}

        // Add all selected particulars except "Previous Dues" (we'll handle that specially)
        selectedParticularsList.forEach((p) => {
          if (p.name !== "Previous Dues") {
            studentParticulars[p.name] = p.amount
          }
        })

        // Add "Previous Dues" if the student has any
        const studentDues = student.dues || 0
        if (studentDues > 0 && selectedParticularsList.some((p) => p.name === "Previous Dues")) {
          studentParticulars["Previous Dues"] = studentDues
        }

        // Calculate total fee for this student's particulars
        const totalFee = Object.values(studentParticulars).reduce((sum, amount) => sum + amount, 0)

        // Calculate remaining balance and updated dues based on payment status
        let remainingBalance = totalFee
        let updatedDues = studentDues

        if (selectedStatus === "Paid") {
          // If fully paid, remaining balance is 0 and dues are cleared
          remainingBalance = 0
          updatedDues = 0
        } else if (selectedStatus === "Partially Paid") {
          // For partial payment, we need to handle dues specially
          if (paidAmount >= totalFee) {
            // If paid amount covers everything, clear all dues
            remainingBalance = 0
            updatedDues = 0
          } else {
            // Calculate how much is left unpaid
            remainingBalance = totalFee - paidAmount

            // If there were previous dues included in the bill
            if (studentParticulars["Previous Dues"]) {
              // Calculate current fees excluding previous dues
              const currentFees = totalFee - studentParticulars["Previous Dues"]

              if (paidAmount >= currentFees) {
                // If payment covers current fees, apply remainder to dues
                const remainingPayment = paidAmount - currentFees
                updatedDues = Math.max(0, studentDues - remainingPayment)
              } else {
                // If payment doesn't cover current fees, dues remain unchanged
                // and the unpaid current fees get added to dues
                updatedDues = studentDues + (currentFees - paidAmount)
              }
            } else {
              // No previous dues in bill, any unpaid amount becomes new dues
              updatedDues = remainingBalance
            }
          }
        } else {
          // If unpaid, the full amount becomes dues
          updatedDues = studentDues + totalFee
          remainingBalance = totalFee
        }

        if (existingBill && existingBill.id) {
          // Update bill
          const updatedBill: Partial<StudentBill> = {
            status: selectedStatus,
            particulars: studentParticulars,
            totalFee: totalFee,
            remainingBalance: remainingBalance,
          }

          if (selectedStatus !== "Unpaid") {
            updatedBill.paidAmount = paidAmount
            updatedBill.paidDate = new Date().toISOString()
          }

          console.log("Updating bill:", existingBill.id, "with data:", updatedBill)
          console.log("Updating student:", student.id, "with dues:", updatedDues)

          // Add bill update to batch
          const billRef = doc(db, "student_bills", existingBill.id)
          batch.update(billRef, updatedBill)
        } else {
          // Create a new bill if one doesn't exist
          const newBill: Partial<StudentBill> = {
            studentId: student.id,
            studentName: student.name,
            rollNumber: student.rollNumber,
            grade: gradeValue,
            section: student.section || sectionValue || "",
            sectionId: student.sectionId || selectedSection || "",
            term: selectedTerm,
            year: selectedYear,
            totalFee: totalFee,
            installments: 1,
            remainingBalance: remainingBalance,
            status: selectedStatus,
            particulars: studentParticulars,
            createdAt: new Date().toISOString(),
          }

          if (selectedStatus !== "Unpaid") {
            newBill.paidAmount = paidAmount
            newBill.paidDate = new Date().toISOString()
          }

          console.log("Creating new bill for student:", student.id, "with data:", newBill)

          // Add new bill to batch
          const newBillRef = doc(collection(db, "student_bills"))
          batch.set(newBillRef, newBill)
        }

        // Always update the student record with the new dues amount
        const studentRef = doc(db, "students", student.id)
        batch.update(studentRef, { dues: updatedDues })
      }

      try {
        // Commit the batch
        await batch.commit()
        console.log("Batch update successful")

        alert("Bills updated successfully")
        router.push(`/teacher/dashboard?id=${teacherId}`)
      } catch (error) {
        console.error("Error updating bills:", error)
        alert("Error updating bills. Please try again.")
      }
    } catch (error) {
      console.error("Error updating bills:", error)
      alert("Error updating bills. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.rollNumber.includes(searchQuery),
  )

  // Calculate total selected students and total dues
  const selectedStudentsCount = students.filter((s) => s.isSelected).length
  const totalSelectedDues = students.filter((s) => s.isSelected).reduce((sum, student) => sum + (student.dues || 0), 0)

  // Calculate total selected particulars and total amount
  const selectedParticularsCount = particulars.filter((p) => p.isSelected).length
  const totalSelectedAmount = particulars
    .filter((p) => p.isSelected)
    .reduce((sum, particular) => sum + particular.amount, 0)

  // Debug information
  console.log("Classes:", classes)
  console.log("Terms:", terms)
  console.log("Years:", years)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Update Bill Status</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Class</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedClass || selectedClassId}
              onValueChange={(value) => {
                console.log("Class selected:", value)

                // Check if this is a class object or a string
                if (typeof classes[0] !== "string") {
                  // We're using class objects with IDs
                  const classObj = classes.find((c) => c.id === value)
                  if (classObj && typeof classObj !== "string") {
                    setSelectedClassId(value)
                    setSelectedClassName(classObj.name)
                    setSelectedClass("")
                    console.log(`Set class ID: ${value}, class name: ${classObj.name}`)
                  }
                } else {
                  // We're using simple strings
                  setSelectedClass(value)
                  setSelectedClassId("")
                  setSelectedClassName("")
                  console.log(`Set class name: ${value}`)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <SelectItem
                      key={typeof cls === "string" ? cls : cls.id}
                      value={typeof cls === "string" ? cls : cls.id}
                    >
                      {typeof cls === "string"
                        ? cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG")
                          ? cls
                          : `Class ${cls}`
                        : cls.name.includes("P.G") || cls.name.includes("LKG") || cls.name.includes("UKG")
                          ? cls.name
                          : `Class ${cls.name}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    No classes available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Section</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedSection}
              onValueChange={(value) => {
                console.log("Section selected:", value)
                setSelectedSection(value)

                if (value === "all") {
                  setSelectedSectionName("all")
                } else {
                  // Find the section object to get the name
                  const sectionObj = sections.find((s) => s.id === value)
                  if (sectionObj) {
                    setSelectedSectionName(sectionObj.name)
                    console.log(`Set section name: ${sectionObj.name}`)
                  } else {
                    setSelectedSectionName("")
                  }
                }
              }}
              disabled={!selectedClassId && !selectedClass}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
                {sections.length === 0 && (
                  <SelectItem value="no-sections" disabled>
                    No sections available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Term</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.length > 0 ? (
                  terms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    No terms available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Year</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.length > 0 ? (
                  years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    No years available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {(selectedClassId || selectedClass) && selectedTerm && selectedYear ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList>
                          <TabsTrigger value="students" className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Students
                            {selectedStudentsCount > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {selectedStudentsCount}
                              </Badge>
                            )}
                          </TabsTrigger>
                          <TabsTrigger value="particulars" className="flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Fee Particulars
                            {selectedParticularsCount > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {selectedParticularsCount}
                              </Badge>
                            )}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardTitle>
                  {activeTab === "students" && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="selectAllStudents"
                          checked={selectAllStudents}
                          onCheckedChange={handleSelectAllStudents}
                        />
                        <Label htmlFor="selectAllStudents">Select All</Label>
                      </div>
                      <Input
                        placeholder="Search by name or roll number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                  )}
                  {activeTab === "particulars" && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="selectAllParticulars"
                        checked={selectAllParticulars}
                        onCheckedChange={handleSelectAllParticulars}
                      />
                      <Label htmlFor="selectAllParticulars">Select All</Label>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {activeTab === "students" && (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-1">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student, index) => (
                            <div
                              key={student.id}
                              className={`flex items-center justify-between p-2 rounded-md ${
                                student.isSelected ? "bg-muted" : "hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={student.isSelected}
                                  onCheckedChange={() => toggleStudentSelection(students.indexOf(student))}
                                />
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-sm text-muted-foreground">Roll No: {student.rollNumber}</p>
                                </div>
                              </div>
                              {student.dues > 0 ? (
                                <Badge variant="destructive" className="ml-auto">
                                  Dues: Rs. {student.dues.toLocaleString()}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="ml-auto">
                                  No Dues
                                </Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">
                              {searchQuery ? "No students match your search" : "No students found in this class"}
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === "particulars" && (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-1">
                        {particulars.map((particular, index) => (
                          <div
                            key={particular.name}
                            className={`flex items-center justify-between p-2 rounded-md ${
                              particular.isSelected ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={particular.isSelected}
                                onCheckedChange={() => toggleParticularSelection(index)}
                              />
                              <div>
                                <p className="font-medium">{particular.name}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-auto">
                              Rs. {particular.amount.toLocaleString()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="status" className="mt-1">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">
                          <div className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                            Paid
                          </div>
                        </SelectItem>
                        <SelectItem value="Partially Paid">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-amber-500" />
                            Partially Paid
                          </div>
                        </SelectItem>
                        <SelectItem value="Unpaid">
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                            Unpaid
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStatus !== "Unpaid" && (
                    <div>
                      <Label htmlFor="amountPaid">Amount Paid (Rs.)</Label>
                      <Input
                        id="amountPaid"
                        type="number"
                        placeholder="Enter amount"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected Students:</span>
                      <span className="font-medium">{selectedStudentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Dues:</span>
                      <span className="font-medium">Rs. {totalSelectedDues.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected Particulars:</span>
                      <span className="font-medium">{selectedParticularsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-medium">Rs. {totalSelectedAmount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">{selectedStatus}</span>
                    </div>
                    {selectedStatus !== "Unpaid" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <span className="font-medium">
                          Rs. {amountPaid ? Number.parseInt(amountPaid).toLocaleString() : "0"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={updateBills}
                    disabled={updating || selectedStudentsCount === 0 || selectedParticularsCount === 0}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Update Bills
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Data Selected</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Please select a class, term, and year to view students and update bills.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
