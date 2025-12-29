"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, query, where, getDocs, writeBatch, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config" // Import db from your config
import { Loader2, Plus, ArrowLeft, AlertCircle } from "lucide-react"
import type { BillStudent, Particular, StudentBill } from "@/lib/models/fee-models"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export default function GenerateBillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [particulars, setParticulars] = useState<Particular[]>([])
  const [newParticularName, setNewParticularName] = useState("")
  const [newParticularAmount, setNewParticularAmount] = useState("")
  const [students, setStudents] = useState<BillStudent[]>([])
  const [selectAllParticulars, setSelectAllParticulars] = useState(false)
  const [selectAllStudents, setSelectAllStudents] = useState(false)
  const [studentsWithDues, setStudentsWithDues] = useState<number>(0)
  const [previousUnpaidBills, setPreviousUnpaidBills] = useState<
    Record<
      string,
      {
        totalAmount: number
        includesDues: boolean
      }
    >
  >({})
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; name: string; displayName: string }>>([])
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string }>>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [useSectionFiltering, setUseSectionFiltering] = useState(false)

  // Hardcoded classes as fallback
  const hardcodedClasses = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

  // Available terms and years
  const terms = ["First Term", "Second Term", "Third Term", "Fourth Term"]
  const yearsBS = Array.from({ length: 11 }, (_, i) => (2080 + i).toString())

  // Debug: Log component renders
  console.log("GenerateBillPage rendering", {
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

    // Load default particulars
    loadDefaultParticulars()

    setLoading(false)
  }, [teacherId, router])

  useEffect(() => {
    if (selectedClassId) {
      // Load sections for the selected class
      fetchSections()
    } else if (selectedClass) {
      // If we're using hardcoded classes, load students directly
      loadStudents()
    }
  }, [selectedClassId, selectedClass])

  useEffect(() => {
    // Load students whenever class or section changes
    if ((selectedClassId || selectedClass) && (!useSectionFiltering || (useSectionFiltering && selectedSection))) {
      console.log("Triggering loadStudents from useEffect")
      loadStudents()
    }
  }, [selectedClassId, selectedClass, selectedSection, useSectionFiltering])

  useEffect(() => {
    if ((selectedClassId || selectedClass) && selectedTerm && selectedYear) {
      checkPreviousUnpaidBills()
    }
  }, [selectedClassId, selectedClass, selectedTerm, selectedYear])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo classes
        const demoClasses = hardcodedClasses.map((cls) => ({
          id: cls.toLowerCase().replace(/\./g, ""),
          name: cls,
          displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
        }))
        setAvailableClasses(demoClasses)
        setUseSectionFiltering(false)
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
          setUseSectionFiltering(true)
          console.log("Firestore classes loaded:", classesData)
        } else {
          // If no classes were found, use hardcoded classes
          const defaultClasses = hardcodedClasses.map((cls) => ({
            id: cls.toLowerCase().replace(/\./g, ""),
            name: cls,
            displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
          }))
          setAvailableClasses(defaultClasses)
          setUseSectionFiltering(false)
          console.log("No classes found in Firestore, using hardcoded classes:", defaultClasses)
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      // Fallback to hardcoded classes
      const defaultClasses = hardcodedClasses.map((cls) => ({
        id: cls.toLowerCase().replace(/\./g, ""),
        name: cls,
        displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
      }))
      setAvailableClasses(defaultClasses)
      setUseSectionFiltering(false)
      console.log("Error fallback to hardcoded classes:", defaultClasses)
    } finally {
      // Add this debug code at the end of the fetchClasses function, just before the final setLoadingClasses(false):

      console.log("Final classes setup:", {
        availableClasses: availableClasses.length > 0 ? availableClasses.slice(0, 3) : "none", // Show first 3 for brevity
        useSectionFiltering,
      })
      setLoadingClasses(false)
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
          // Default sections if none defined
          const defaultSections = [
            { id: "A", name: "A" },
            { id: "B", name: "B" },
            { id: "C", name: "C" },
            { id: "D", name: "D" },
          ]
          setAvailableSections(defaultSections)
          console.log("No sections found, using defaults:", defaultSections)
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
      // Fallback to default sections
      const defaultSections = [
        { id: "A", name: "A" },
        { id: "B", name: "B" },
        { id: "C", name: "C" },
        { id: "D", name: "D" },
      ]
      setAvailableSections(defaultSections)
      console.log("Error fallback to default sections:", defaultSections)
    } finally {
      setLoadingSections(false)
    }
  }

  const loadDefaultParticulars = () => {
    const defaultParticulars: Particular[] = [
      { name: "Exam Fee", amount: 200 },
      { name: "Computer Fee", amount: 300 },
      { name: "Library Fee", amount: 100 },
      { name: "Sports Fee", amount: 150 },
    ]
    setParticulars(defaultParticulars)
  }

  const loadStudents = async () => {
    // Check if we have either a class ID or class name
    if (!selectedClassId && !selectedClass) {
      console.log("Cannot load students: no class selected")
      return
    }

    // If we're using section filtering, make sure a section is selected
    if (useSectionFiltering && !selectedSection) {
      console.log("Cannot load students: section filtering enabled but no section selected")
      return
    }

    // IMPORTANT: Get the actual grade value to use in the query
    // This is the key change - we need to use the correct grade value with exact case
    let gradeValue = selectedClass

    // If we're using class IDs, find the corresponding class name
    if (useSectionFiltering && selectedClassId) {
      const classObj = availableClasses.find((c) => c.id === selectedClassId)
      if (classObj) {
        gradeValue = classObj.name
        console.log(`Using class name "${gradeValue}" from class ID "${selectedClassId}" for query`)
      }
    }

    console.log(`Loading students for grade: ${gradeValue}${selectedSection ? `, section: ${selectedSection}` : ""}`)

    setLoadingStudents(true)
    setStudents([])
    setStudentsWithDues(0)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Generate demo students
        const demoStudents: BillStudent[] = Array.from({ length: 15 }, (_, i) => {
          const rollNumber = `${i + 1}`.padStart(2, "0")
          const firstName = [
            "Aarav",
            "Arjun",
            "Divya",
            "Kavya",
            "Rahul",
            "Priya",
            "Neha",
            "Vikram",
            "Sanjay",
            "Ananya",
          ][i % 10]
          const lastName = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Joshi", "Yadav", "Verma", "Mishra", "Reddy"][
            i % 10
          ]

          return {
            id: `student${i + 1}`,
            name: `${firstName} ${lastName}`,
            rollNumber,
            grade: gradeValue,
            section: selectedSection || "A",
            usesBus: i % 3 === 0,
            transportationFee: i % 3 === 0 ? 500 : 0,
            dues: i % 5 === 0 ? 1500 : 0,
          }
        })

        // Count students with dues
        const withDues = demoStudents.filter((s) => s.dues && s.dues > 0).length

        setStudents(demoStudents)
        setStudentsWithDues(withDues)
        console.log(`Loaded ${demoStudents.length} demo students, ${withDues} with dues`)
      } else {
        // Load real data from Firebase
        const studentsRef = collection(db, "students")
        let studentQuery

        // Build the query based on whether we're using section filtering or not
        if (selectedSection && selectedSection !== "all") {
          // Filter by both grade and section
          console.log(`Querying with grade="${gradeValue}" AND section="${selectedSection}"`)
          studentQuery = query(studentsRef, where("grade", "==", gradeValue), where("section", "==", selectedSection))
        } else {
          // Only filter by grade
          console.log(`Querying with grade="${gradeValue}" ONLY`)
          studentQuery = query(studentsRef, where("grade", "==", gradeValue))
        }

        // Log the query parameters for debugging
        console.log("Query parameters:", {
          collection: "students",
          filters:
            selectedSection && selectedSection !== "all"
              ? [
                  { field: "grade", op: "==", value: gradeValue },
                  { field: "section", op: "==", value: selectedSection },
                ]
              : [{ field: "grade", op: "==", value: gradeValue }],
        })

        const querySnapshot = await getDocs(studentQuery)
        console.log(`Found ${querySnapshot.size} students matching the query`)

        // Debug: Log all students returned by the query
        querySnapshot.forEach((doc, index) => {
          const data = doc.data()
          console.log(
            `Student ${index + 1}: id=${doc.id}, name=${data.name}, grade=${data.grade}, section=${data.section}`,
          )
        })

        const studentsList: BillStudent[] = []
        let duesCount = 0

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const studentDues = data.dues || 0

          if (studentDues > 0) {
            duesCount++
          }

          studentsList.push({
            id: doc.id,
            name: data.name || "Unknown",
            rollNumber: data.rollNumber || "0",
            grade: data.grade || gradeValue,
            section: data.section || "", // Handle undefined section values
            usesBus: data.usesBus || false,
            transportationFee: data.transportationFee || 0,
            dues: studentDues,
          })
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(studentsList)
        setStudentsWithDues(duesCount)
        console.log(`Loaded ${studentsList.length} students from Firestore, ${duesCount} with dues`)
      }
    } catch (error) {
      console.error("Error loading students:", error)
      // Log more detailed error information
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack)
      }
    } finally {
      setLoadingStudents(false)
    }
  }

  // Check for unpaid or partially paid bills from previous terms
  const checkPreviousUnpaidBills = async () => {
    // IMPORTANT: Use the correct grade value for the query
    let gradeValue = selectedClass

    // If we're using class IDs, find the corresponding class name
    if (useSectionFiltering && selectedClassId) {
      const classObj = availableClasses.find((c) => c.id === selectedClassId)
      if (classObj) {
        gradeValue = classObj.name
      }
    }

    if (!gradeValue || !selectedTerm || !selectedYear) return

    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      if (isDemoMode) return

      // Get the current term index
      const termIndex = terms.indexOf(selectedTerm)
      if (termIndex <= 0) return // No previous terms to check

      // Get previous terms in the same year
      const previousTerms = terms.slice(0, termIndex)

      // Create a map to store unpaid amounts by student ID
      const unpaidAmounts: Record<
        string,
        {
          totalAmount: number
          includesDues: boolean
        }
      > = {}

      // Query for unpaid or partially paid bills from previous terms in the same year
      for (const term of previousTerms) {
        const billsQuery = query(
          collection(db, "student_bills"),
          where("grade", "==", gradeValue),
          where("term", "==", term),
          where("year", "==", selectedYear),
          where("status", "in", ["Unpaid", "Partially Paid"]),
        )

        const billsSnapshot = await getDocs(billsQuery)

        billsSnapshot.forEach((doc) => {
          const bill = doc.data() as StudentBill

          const studentId = bill.studentId
          const remainingBalance = bill.remainingBalance || 0

          // Check if this bill includes "Previous Dues" particular
          const includesDues =
            bill.particulars &&
            (bill.particulars["Previous Dues"] !== undefined || bill.particulars["Previous Dues"] > 0)

          // Initialize if needed
          if (!unpaidAmounts[studentId]) {
            unpaidAmounts[studentId] = {
              totalAmount: 0,
              includesDues: false,
            }
          }

          // Add to the unpaid amounts
          unpaidAmounts[studentId].totalAmount += remainingBalance

          // If any bill includes dues, mark it
          if (includesDues) {
            unpaidAmounts[studentId].includesDues = true
          }
        })
      }

      // Also check for unpaid bills from previous years
      const previousYears = yearsBS.slice(0, yearsBS.indexOf(selectedYear))

      if (previousYears.length > 0) {
        for (const year of previousYears) {
          const previousYearBillsQuery = query(
            collection(db, "student_bills"),
            where("grade", "==", gradeValue),
            where("year", "==", year),
            where("status", "in", ["Unpaid", "Partially Paid"]),
          )

          const previousYearBillsSnapshot = await getDocs(previousYearBillsQuery)

          previousYearBillsSnapshot.forEach((doc) => {
            const bill = doc.data() as StudentBill
            const studentId = bill.studentId
            const remainingBalance = bill.remainingBalance || 0

            // Check if this bill includes "Previous Dues" particular
            const includesDues =
              bill.particulars &&
              (bill.particulars["Previous Dues"] !== undefined || bill.particulars["Previous Dues"] > 0)

            // Initialize if needed
            if (!unpaidAmounts[studentId]) {
              unpaidAmounts[studentId] = {
                totalAmount: 0,
                includesDues: false,
              }
            }

            // Add to the unpaid amounts
            unpaidAmounts[studentId].totalAmount += remainingBalance

            // If any bill includes dues, mark it
            if (includesDues) {
              unpaidAmounts[studentId].includesDues = true
            }
          })
        }
      }

      setPreviousUnpaidBills(unpaidAmounts)
      console.log("Previous unpaid bills:", unpaidAmounts)
    } catch (error) {
      console.error("Error checking previous unpaid bills:", error)
    }
  }

  const handleAddParticular = () => {
    if (!newParticularName.trim() || !newParticularAmount.trim()) {
      return
    }

    const amount = Number.parseInt(newParticularAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    const newParticular: Particular = {
      name: newParticularName.trim(),
      amount: amount,
    }

    setParticulars([...particulars, newParticular])
    setNewParticularName("")
    setNewParticularAmount("")
  }

  const toggleParticularSelection = (index: number) => {
    const updatedParticulars = [...particulars]
    if (updatedParticulars[index].isSelected === undefined) {
      updatedParticulars[index].isSelected = true
    } else {
      updatedParticulars[index].isSelected = !updatedParticulars[index].isSelected
    }
    setParticulars(updatedParticulars)

    // Update selectAllParticulars state
    setSelectAllParticulars(updatedParticulars.every((p) => p.isSelected))
  }

  const toggleStudentSelection = (index: number) => {
    const updatedStudents = [...students]
    if (updatedStudents[index].isSelected === undefined) {
      updatedStudents[index].isSelected = true
    } else {
      updatedStudents[index].isSelected = !updatedStudents[index].isSelected
    }
    setStudents(updatedStudents)

    // Update selectAllStudents state
    setSelectAllStudents(updatedStudents.every((s) => s.isSelected))
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

  const handleSelectAllStudents = () => {
    const newSelectAll = !selectAllStudents
    setSelectAllStudents(newSelectAll)

    const updatedStudents = students.map((s) => ({
      ...s,
      isSelected: newSelectAll,
    }))
    setStudents(updatedStudents)
  }

  const getMonthlyFeeForGrade = (grade: string): number => {
    // Find the class name from the ID if we're using class IDs
    if (useSectionFiltering) {
      const classObj = availableClasses.find((c) => c.id === grade)
      grade = classObj?.name || grade
    }

    switch (grade) {
      case "P.G":
      case "Nursery":
        return 1200
      case "LKG":
        return 1300
      case "UKG":
        return 1400
      default:
        // Try to extract a number from the class name
        const match = grade.match(/\d+/)
        if (match) {
          const classNumber = Number.parseInt(match[0])
          if (!isNaN(classNumber) && classNumber >= 1) {
            return 1500 + (classNumber - 1) * 100
          }
        }
        return 0
    }
  }

  const generateBills = async () => {
    // IMPORTANT: Use the correct grade value for the query
    let gradeValue = selectedClass

    // If we're using class IDs, find the corresponding class name
    if (useSectionFiltering && selectedClassId) {
      const classObj = availableClasses.find((c) => c.id === selectedClassId)
      if (classObj) {
        gradeValue = classObj.name
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

    setGenerating(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, just show success message
        setTimeout(() => {
          alert("Bills generated successfully (Demo Mode)")
          router.push(`/teacher/dashboard?id=${teacherId}`)
        }, 1000)
        return
      }

      // In real mode, generate bills in Firestore
      const batch = writeBatch(db)

      for (const student of selectedStudentsList) {
        // Check if bill already exists for this student, term and year
        const existingBillsQuery = query(
          collection(db, "student_bills"),
          where("studentId", "==", student.id),
          where("term", "==", selectedTerm),
          where("year", "==", selectedYear),
        )

        const existingBillsSnapshot = await getDocs(existingBillsQuery)
        if (!existingBillsSnapshot.empty) {
          // Skip this student as bill already exists
          continue
        }

        // Calculate student particulars
        const studentParticulars: Record<string, number> = {}

        // Add monthly fee (3 months per term)
        const monthlyFee = getMonthlyFeeForGrade(student.grade)
        if (monthlyFee > 0) {
          studentParticulars["Monthly Fee"] = monthlyFee * 3
        }

        // Add selected particulars
        selectedParticularsList.forEach((p) => {
          if (p.name !== "Previous Dues") {
            // Skip "Previous Dues" as we'll handle it separately
            studentParticulars[p.name] = p.amount
          }
        })

        // Add transportation fee if applicable
        if (student.usesBus && student.transportationFee) {
          studentParticulars["Transportation Fee"] = student.transportationFee * 3
        }

        // Handle dues and previous unpaid bills
        const existingDues = student.dues || 0
        const previousUnpaid = previousUnpaidBills[student.id]

        // Check if we need to include the original dues
        if (existingDues > 0) {
          // Only add dues if they're not already included in previous unpaid bills
          if (!previousUnpaid || !previousUnpaid.includesDues) {
            studentParticulars["Previous Dues"] = existingDues
          }
        }

        // If there are unpaid bills from previous terms, add them
        if (previousUnpaid && previousUnpaid.totalAmount > 0) {
          studentParticulars["Unpaid Previous Bills"] = previousUnpaid.totalAmount
        }

        // Calculate total fee
        const totalFee = Object.values(studentParticulars).reduce((sum, amount) => sum + amount, 0)

        if (totalFee > 0) {
          // Create bill
          const bill: StudentBill = {
            studentId: student.id,
            studentName: student.name,
            rollNumber: student.rollNumber,
            grade: student.grade,
            gradeId: useSectionFiltering ? selectedClassId : student.grade,
            section: student.section || "", // Handle undefined section values
            sectionId: useSectionFiltering ? selectedSectionId : "",
            term: selectedTerm,
            year: selectedYear,
            totalFee: totalFee,
            installments: 3, // 3 installments per term
            remainingBalance: totalFee,
            status: "Unpaid",
            particulars: studentParticulars,
          }

          // Add to batch
          const newBillRef = doc(collection(db, "student_bills"))
          batch.set(newBillRef, bill)

          // DO NOT update student's dues in the students collection
          // The dues field should only be updated when payments are made
        }
      }

      // Commit the batch
      await batch.commit()

      alert("Bills generated successfully")
      router.push(`/teacher/dashboard?id=${teacherId}`)
    } catch (error) {
      console.error("Error generating bills:", error)
      alert("Error generating bills. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Count students with unpaid bills from previous terms
  const studentsWithPreviousUnpaid = Object.keys(previousUnpaidBills).length
  const totalPreviousUnpaid = Object.values(previousUnpaidBills).reduce((sum, data) => sum + data.totalAmount, 0)

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Generate Term Bills</h1>
      </div>

      {studentsWithDues > 0 && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Previous Dues Found</AlertTitle>
          <AlertDescription>
            {studentsWithDues} student{studentsWithDues > 1 ? "s" : ""} in this class{" "}
            {studentsWithDues > 1 ? "have" : "has"} outstanding dues from previous terms. These dues will be included in
            the new bills only if they haven't already been included in previous unpaid bills.
          </AlertDescription>
        </Alert>
      )}

      {studentsWithPreviousUnpaid > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unpaid Previous Term Bills Found</AlertTitle>
          <AlertDescription>
            {studentsWithPreviousUnpaid} student{studentsWithPreviousUnpaid > 1 ? "s" : ""} in this class{" "}
            {studentsWithPreviousUnpaid > 1 ? "have" : "has"} unpaid or partially paid bills from previous terms
            totaling Rs. {totalPreviousUnpaid.toLocaleString()}. These amounts will be included as "Unpaid Previous
            Bills" in the new bills. If these bills already include previous dues, the dues will not be added again to
            prevent double-counting.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Class</CardTitle>
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
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={useSectionFiltering ? cls.id : cls.name}>
                      {cls.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {useSectionFiltering && (
          <Card>
            <CardHeader>
              <CardTitle>Select Section</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSections ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedSectionId}
                  onValueChange={(value) => {
                    console.log("Section selected:", value)
                    setSelectedSectionId(value)
                    if (value === "all") {
                      setSelectedSection("all")
                    } else {
                      // Find the section object
                      const sectionObj = availableSections.find((s) => s.id === value)
                      // Use the section name directly
                      const sectionName = sectionObj?.name || ""
                      console.log(`Setting selected section to: ${sectionName}`)
                      setSelectedSection(sectionName)
                    }
                  }}
                  disabled={!selectedClassId || availableSections.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={availableSections.length === 0 ? "No sections available" : "Select Section"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Select Term</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
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

        {!useSectionFiltering && (
          <Card>
            <CardHeader>
              <CardTitle>Select Year (BS)</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
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
        )}
      </div>

      {useSectionFiltering && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Year (BS)</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Fee Particulars</span>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAllParticulars"
                  checked={selectAllParticulars}
                  onCheckedChange={handleSelectAllParticulars}
                />
                <label htmlFor="selectAllParticulars" className="text-sm font-normal">
                  Select All
                </label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input
                    placeholder="Particular Name"
                    value={newParticularName}
                    onChange={(e) => setNewParticularName(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newParticularAmount}
                    onChange={(e) => setNewParticularAmount(e.target.value)}
                  />
                  <Button size="icon" onClick={handleAddParticular}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-md">
                <div className="grid grid-cols-12 p-2 font-medium border-b">
                  <div className="col-span-1"></div>
                  <div className="col-span-7">Particular</div>
                  <div className="col-span-4 text-right">Amount</div>
                </div>
                <div className="divide-y">
                  {particulars.map((particular, index) => (
                    <div key={index} className="grid grid-cols-12 p-2 items-center">
                      <div className="col-span-1">
                        <Checkbox
                          checked={particular.isSelected}
                          onCheckedChange={() => toggleParticularSelection(index)}
                        />
                      </div>
                      <div className="col-span-7">{particular.name}</div>
                      <div className="col-span-4 text-right">Rs. {particular.amount}</div>
                    </div>
                  ))}
                  {particulars.length === 0 && (
                    <div className="p-4 text-center text-gray-500">No particulars added</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Students</span>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAllStudents"
                  checked={selectAllStudents}
                  onCheckedChange={handleSelectAllStudents}
                />
                <label htmlFor="selectAllStudents" className="text-sm font-normal">
                  Select All
                </label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedClassId || selectedClass ? (
              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-12 p-2 font-medium border-b sticky top-0 bg-white">
                  <div className="col-span-1"></div>
                  <div className="col-span-2">Roll</div>
                  <div className="col-span-5">Name</div>
                  <div className="col-span-4">Dues</div>
                </div>
                <div className="divide-y">
                  {loadingStudents ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Loading students...</p>
                    </div>
                  ) : students.length > 0 ? (
                    students.map((student, index) => {
                      // Get previous unpaid bills amount
                      const previousUnpaid = previousUnpaidBills[student.id]
                      const unpaidAmount = previousUnpaid ? previousUnpaid.totalAmount : 0
                      const includesDues = previousUnpaid ? previousUnpaid.includesDues : false

                      return (
                        <div key={student.id} className="grid grid-cols-12 p-2 items-center">
                          <div className="col-span-1">
                            <Checkbox
                              checked={student.isSelected}
                              onCheckedChange={() => toggleStudentSelection(index)}
                            />
                          </div>
                          <div className="col-span-2">{student.rollNumber}</div>
                          <div className="col-span-5">{student.name}</div>
                          <div className="col-span-4">
                            {student.dues > 0 || unpaidAmount > 0 ? (
                              <div>
                                {student.dues > 0 && (
                                  <span className="text-amber-600 font-medium">
                                    Rs. {student.dues.toLocaleString()}
                                    {includesDues && <span className="text-xs"> (included in unpaid bills)</span>}
                                  </span>
                                )}
                                {unpaidAmount > 0 && (
                                  <div className="text-xs text-red-500">
                                    {includesDues ? "Rs. " : "+Rs. "}
                                    {unpaidAmount.toLocaleString()} (unpaid bills)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {useSectionFiltering && selectedSection
                        ? `No students found in ${selectedClass} Section ${selectedSection}`
                        : "No students found in this class"}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">Please select a class to view students</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={generateBills}
          disabled={
            generating ||
            (!selectedClassId && !selectedClass) ||
            !selectedTerm ||
            !selectedYear ||
            students.length === 0
          }
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Bills"
          )}
        </Button>
      </div>
    </div>
  )
}
