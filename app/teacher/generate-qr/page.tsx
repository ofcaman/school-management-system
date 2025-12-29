"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import { ArrowLeft, Download, Share2, ChevronLeft, ChevronRight, Loader2, Printer, Eye, Check } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import qrcode from "qrcode-generator"
import JSZip from "jszip"
import FileSaver from "file-saver"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function GenerateQRPage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [mode, setMode] = useState("allStudents") // allStudents or singleStudent
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; name: string; displayName: string }>>([])
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string }>>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [useSectionFiltering, setUseSectionFiltering] = useState(false)
  const [rollNumber, setRollNumber] = useState("")
  const [studentName, setStudentName] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [qrCodes, setQrCodes] = useState<string[]>([])
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [printingQR, setPrintingQR] = useState(false)
  const [viewingQR, setViewingQR] = useState(false)
  const [sharingQR, setSharingQR] = useState(false)
  const [downloadingQR, setDownloadingQR] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [printSettingsOpen, setPrintSettingsOpen] = useState(false)
  const [bulkPrintMode, setBulkPrintMode] = useState(false)
  const [qrPerPage, setQrPerPage] = useState(4) // Default 4 QR codes per page
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  // Hardcoded classes as fallback
  const hardcodedClasses = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    checkPermission()
    // Load classes from Firestore
    fetchClasses()
  }, [teacherId, router])

  useEffect(() => {
    if (selectedClassId) {
      // Load sections for the selected class
      fetchSections()
    } else if (selectedGrade) {
      // If we're using hardcoded classes, load students directly
      loadStudents()
    }
  }, [selectedClassId, selectedGrade])

  useEffect(() => {
    // Load students whenever class or section changes
    if ((selectedClassId || selectedGrade) && (!useSectionFiltering || (useSectionFiltering && selectedSection))) {
      loadStudents()
    }
  }, [selectedClassId, selectedGrade, selectedSection, useSectionFiltering])

  // Initialize selected students when students list changes
  useEffect(() => {
    if (students.length > 0) {
      // By default, select all students
      setSelectedStudents(students.map((_, index) => index))
    } else {
      setSelectedStudents([])
    }
  }, [students])

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
        // In demo mode, set up demo data
        setCurrentTeacher({
          id: "demo123",
          name: "DEMO TEACHER",
          email: "demo@sajhaschool.edu",
          phone: "9876543210",
          qualification: "M.Ed",
          profileImageUrl: "",
          roles: ["principal", "computer_teacher"],
          assignedClass: "10",
          active: true,
        })

        setHasPermission(true)
        setPermissionChecking(false)
        return
      }

      // Get the current user (teacher) document
      const currentTeacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (!currentTeacherDoc.exists()) {
        setHasPermission(false)
        setPermissionMessage("Current teacher not found")
        setPermissionChecking(false)
        return
      }

      const currentTeacherData = currentTeacherDoc.data() as Teacher
      currentTeacherData.id = currentTeacherDoc.id
      setCurrentTeacher(currentTeacherData)

      // Check if current teacher is principal or computer_teacher
      const isAdmin =
        currentTeacherData.roles?.includes("principal") || currentTeacherData.roles?.includes("computer_teacher")

      if (!isAdmin) {
        setHasPermission(false)
        setPermissionMessage("You don't have permission to generate QR codes")
        setPermissionChecking(false)
        return
      }

      setHasPermission(true)
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
      setLoading(false)
    }
  }

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
        } else {
          // If no classes were found, use hardcoded classes
          const defaultClasses = hardcodedClasses.map((cls) => ({
            id: cls.toLowerCase().replace(/\./g, ""),
            name: cls,
            displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
          }))
          setAvailableClasses(defaultClasses)
          setUseSectionFiltering(false)
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
    } finally {
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
    } finally {
      setLoadingSections(false)
    }
  }

  const loadStudents = async () => {
    // Check if we have either a class ID or class name
    if (!selectedClassId && !selectedGrade) {
      console.log("Cannot load students: no class selected")
      return
    }

    // If we're using section filtering, make sure a section is selected
    if (useSectionFiltering && !selectedSection) {
      console.log("Cannot load students: section filtering enabled but no section selected")
      return
    }

    // Get the actual grade value to use in the query
    let gradeValue = selectedGrade

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

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Generate demo students
        const demoStudents: Student[] = Array.from({ length: 20 }, (_, i) => ({
          id: `student${i + 1}`,
          firstName: `Student`,
          middleName: "",
          lastName: `${i + 1}`,
          name: `Student ${i + 1}`,
          fatherName: `Father ${i + 1}`,
          motherName: `Mother ${i + 1}`,
          contactNumber: `98765${i.toString().padStart(5, "0")}`,
          dob: "2065-01-15",
          rollNumber: `${i + 1}`,
          grade: gradeValue,
          section: selectedSection || "A",
          symbolNumber: null,
          address: "Kathmandu",
          usesBus: i % 3 === 0,
          busRoute: i % 3 === 0 ? "Route A" : "",
          resultPdfUrl: "",
          subjects: [],
          totalMarks: 0,
          percentage: 0,
          rank: 0,
          attendance: 0,
          totalClasses: 0,
          monthlyFee: 1500,
          dues: i % 5 === 0 ? 1500 : 0,
          currentSubject: null,
          attendanceStatus: "",
          attendanceId: "",
          isSelected: false,
          qrCode: null,
          profilePictureUrl: null,
          transportationFee: i % 3 === 0 ? 500 : 0,
        }))
        setStudents(demoStudents)
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

        const querySnapshot = await getDocs(studentQuery)
        console.log(`Found ${querySnapshot.size} students matching the query`)

        const studentsList: Student[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Student
          data.id = doc.id
          studentsList.push(data)
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber || "0")
          const rollB = Number.parseInt(b.rollNumber || "0")
          return rollA - rollB
        })

        setStudents(studentsList)
      }
    } catch (error: any) {
      console.error("Error loading students:", error)
      toast({
        title: "Error",
        description: `Failed to load students: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  const generateQRForAllStudents = async () => {
    // Get the actual grade value to use in the query
    let gradeValue = selectedGrade

    // If we're using class IDs, find the corresponding class name
    if (useSectionFiltering && selectedClassId) {
      const classObj = availableClasses.find((c) => c.id === selectedClassId)
      if (classObj) {
        gradeValue = classObj.name
      }
    }

    if (!gradeValue) {
      toast({
        title: "Error",
        description: "Please select a grade",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      // We'll use the students that are already loaded
      if (students.length === 0) {
        // If no students are loaded yet, load them first
        await loadStudents()
      }

      if (students.length === 0) {
        toast({
          title: "No students found",
          description: `No students found in ${gradeValue}${selectedSection ? ` Section ${selectedSection}` : ""}`,
          variant: "destructive",
        })
        setGenerating(false)
        return
      }

      // Generate QR codes for the loaded students
      generateQRCodesForStudents(students)
    } catch (error: any) {
      console.error("Error generating QR codes:", error)
      toast({
        title: "Error",
        description: `Failed to generate QR codes: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const generateQRForSingleStudent = async () => {
    // Get the actual grade value to use in the query
    let gradeValue = selectedGrade

    // If we're using class IDs, find the corresponding class name
    if (useSectionFiltering && selectedClassId) {
      const classObj = availableClasses.find((c) => c.id === selectedClassId)
      if (classObj) {
        gradeValue = classObj.name
      }
    }

    if (!gradeValue) {
      toast({
        title: "Error",
        description: "Please select a grade",
        variant: "destructive",
      })
      return
    }

    if (!rollNumber && !studentName) {
      toast({
        title: "Error",
        description: "Please enter roll number or name",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      if (isDemoMode) {
        // Generate a demo student
        const demoStudent: Student = {
          id: "student1",
          firstName: "Student",
          middleName: "",
          lastName: "1",
          name: studentName || `Student ${rollNumber}`,
          fatherName: "Father 1",
          motherName: "Mother 1",
          contactNumber: "9876500000",
          dob: "2065-01-15",
          rollNumber: rollNumber || "1",
          grade: gradeValue,
          section: selectedSection || "A",
          symbolNumber: null,
          address: "Kathmandu",
          usesBus: false,
          busRoute: "",
          resultPdfUrl: "",
          subjects: [],
          totalMarks: 0,
          percentage: 0,
          rank: 0,
          attendance: 0,
          totalClasses: 0,
          monthlyFee: 1500,
          dues: 0,
          currentSubject: null,
          attendanceStatus: "",
          attendanceId: "",
          isSelected: false,
          qrCode: null,
          profilePictureUrl: null,
          transportationFee: 0,
        }
        setStudents([demoStudent])
        generateQRCodesForStudents([demoStudent])
      } else {
        const studentsRef = collection(db, "students")
        let studentQuery = query(studentsRef, where("grade", "==", gradeValue))

        if (rollNumber) {
          studentQuery = query(studentQuery, where("rollNumber", "==", rollNumber))
        } else if (studentName) {
          studentQuery = query(studentQuery, where("name", "==", studentName))
        }

        // Add section filter if applicable
        if (selectedSection && selectedSection !== "all") {
          studentQuery = query(studentQuery, where("section", "==", selectedSection))
        }

        const querySnapshot = await getDocs(studentQuery)

        if (querySnapshot.empty) {
          toast({
            title: "No student found",
            description: `No student found with the given criteria`,
            variant: "destructive",
          })
          setGenerating(false)
          return
        }

        const studentsList: Student[] = []
        querySnapshot.forEach((doc) => {
          const student = doc.data() as Student
          student.id = doc.id
          studentsList.push(student)
        })

        setStudents(studentsList)
        generateQRCodesForStudents(studentsList)
      }
    } catch (error: any) {
      console.error("Error generating QR code:", error)
      toast({
        title: "Error",
        description: `Failed to generate QR code: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const generateQRCodesForStudents = (studentsList: Student[]) => {
    const codes: string[] = []

    studentsList.forEach((student) => {
      // Create QR code data - add section to the QR data
      const qrData = JSON.stringify({
        studentId: student.rollNumber,
        studentName: student.name,
        grade: student.grade,
        section: student.section || "",
      })

      codes.push(qrData)

      // Save QR code to Firestore if not in demo mode
      if (!isDemoMode && student.id) {
        // In a real implementation, we would convert the QR code to base64
        // Here we're just saving the data for simplicity
        updateDoc(doc(db, "students", student.id), {
          qrCode: qrData,
        }).catch((error) => {
          console.error(`Error saving QR code for ${student.name}:`, error)
        })
      }
    })

    setQrCodes(codes)
    setCurrentStudentIndex(0)
  }

  const handleGenerateQR = () => {
    if (mode === "allStudents") {
      generateQRForAllStudents()
    } else {
      generateQRForSingleStudent()
    }
  }

  // Function to convert QR SVG to PNG data URL
  const getQRCodeDataURL = (qrData: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Create a temporary div to render the QR code
      const tempDiv = document.createElement("div")
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      tempDiv.innerHTML = `<div id="temp-qr"></div>`
      document.body.appendChild(tempDiv)

      // Render the QR code
      const qrContainer = document.getElementById("temp-qr")
      if (qrContainer) {
        // Create QR code
        const qr = qrcode(0, "L")
        qr.addData(qrData)
        qr.make()
        qrContainer.innerHTML = qr.createSvgTag(4)

        // Get the SVG element
        const svgElement = qrContainer.querySelector("svg")
        if (!svgElement) {
          document.body.removeChild(tempDiv)
          reject(new Error("QR code SVG element not found"))
          return
        }

        const svgData = new XMLSerializer().serializeToString(svgElement)
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        canvas.width = 300
        canvas.height = 300

        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))

        img.onload = () => {
          if (ctx) {
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, 300, 300)
            const dataUrl = canvas.toDataURL("image/png")
            document.body.removeChild(tempDiv)
            resolve(dataUrl)
          } else {
            document.body.removeChild(tempDiv)
            reject(new Error("Could not get canvas context"))
          }
        }

        img.onerror = () => {
          document.body.removeChild(tempDiv)
          reject(new Error("Failed to load QR code image"))
        }
      } else {
        document.body.removeChild(tempDiv)
        reject(new Error("Temporary QR container not found"))
      }
    })
  }

  // View QR Code in a dialog
  const handleViewQR = async () => {
    if (qrCodes.length === 0 || currentStudentIndex >= qrCodes.length) {
      toast({
        title: "Error",
        description: "No QR code to view",
        variant: "destructive",
      })
      return
    }

    setViewingQR(true)
    setViewDialogOpen(true)
    setViewingQR(false)
  }

  // Toggle student selection for bulk operations
  const toggleStudentSelection = (index: number) => {
    setSelectedStudents((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else {
        return [...prev, index]
      }
    })
  }

  // Toggle all students selection
  const toggleAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map((_, index) => index))
    }
  }

  // Print QR Code
  const handlePrintQR = async () => {
    if (qrCodes.length === 0) {
      toast({
        title: "Error",
        description: "No QR codes to print",
        variant: "destructive",
      })
      return
    }

    // Open print settings dialog
    setPrintSettingsOpen(true)
  }

  // Print single QR code
  const printSingleQR = async (studentIndex: number) => {
    if (qrCodes.length === 0 || studentIndex >= qrCodes.length) {
      toast({
        title: "Error",
        description: "No QR code to print",
        variant: "destructive",
      })
      return
    }

    setPrintingQR(true)

    try {
      const student = students[studentIndex]
      const qrData = qrCodes[studentIndex]

      // Create QR code directly
      const qr = qrcode(0, "L")
      qr.addData(qrData)
      qr.make()
      const qrSvg = qr.createSvgTag(4)

      // Create print content with the Sajha Boarding School template in landscape orientation
      const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${student.name}</title>
        <style>
          @media print {
            @page {
              size: A4 landscape;
              margin: 0.5cm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            margin: 0;
          }
          .container {
            max-width: 100%;
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            height: 18cm;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .school-info {
            text-align: center;
            flex-grow: 1;
          }
          .school-name {
            font-size: 32px;
            font-weight: bold;
            margin: 0;
          }
          .school-address {
            font-size: 24px;
            margin: 5px 0;
          }
          .qr-code {
            text-align: right;
          }
          .qr-image {
            width: 200px;
            height: 200px;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            border: 2px solid black;
            padding: 5px;
          }
          .content-area {
            display: flex;
            flex: 1;
          }
          .instructions {
            flex: 1;
            margin-right: 20px;
            font-size: 18px;
          }
          .instruction-item {
            margin: 10px 0;
          }
          .student-info-container {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .student-info {
            margin: 20px 0;
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .info-item {
            border: 1px solid #ddd;
            padding: 8px;
          }
          .info-label {
            font-weight: bold;
          }
          .download-text {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin-top: auto;
          }
          .print-controls {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f0f0f0;
            padding: 10px;
            text-align: center;
            z-index: 9999;
            border-bottom: 1px solid #ddd;
          }
          .print-controls button {
            padding: 8px 16px;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
          .print-controls button:hover {
            background: #4338ca;
          }
          .content {
            margin-top: 50px;
          }
          @media print {
            .print-controls {
              display: none;
            }
            .content {
              margin-top: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-controls">
          <button onclick="window.print()">Print QR Code</button>
        </div>
        <div class="content">
          <div class="container">
            <div class="header">
              <div class="school-info">
                <h1 class="school-name">Sajha Boarding School</h1>
                <p class="school-address">Chandrapur-7,Rautahat</p>
              </div>
              <div class="qr-code">
                ${qrSvg.replace(/width="[^"]*"/, 'width="200"').replace(/height="[^"]*"/, 'height="200"')}
              </div>
            </div>
            
            <div class="title">विद्यार्थी लगइन जानकारी</div>
            
            <div class="content-area">
              <div class="instructions">
                <h3 style="font-weight: bold; margin-bottom: 10px;">निर्देशिका:</h3>
                <ul style="list-style-type: disc; padding-left: 20px;">
                  <li class="instruction-item">माथिको QR कोड स्क्यान गरी साझा बोर्डिङ स्कुल एपमा छिटो र सजिलै लगाइन गर्नुहोस्।</li>
                  <li class="instruction-item">यदि QR कोड स्क्यान गर्न सकिँदैन भने, आफ्नो कक्षा (Grade) र रोल नम्बर (Roll No.) प्रयोग गरी म्यानुअल रूपमा लगाइन गर्नुहोस्।</li>
                </ul>
              </div>
              
              <div class="student-info-container">
                <div class="student-info">
                  <div class="info-item">
                    <span class="info-label">Student Name:</span> ${student.name}
                  </div>
                  <div class="info-item">
                    <span class="info-label">Roll Number:</span> ${student.rollNumber}
                  </div>
                  <div class="info-item">
                    <span class="info-label">Grade:</span> ${student.grade}
                  </div>
                  <div class="info-item">
                    <span class="info-label">Section:</span> ${student.section || "N/A"}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="download-text">
              Download App( Sajha Boarding School)
            </div>
          </div>
        </div>
      </body>
      </html>
    `

      // Create a new window for printing
      const printWindow = window.open("", "_blank")

      if (!printWindow) {
        toast({
          title: "Error",
          description: "Pop-up blocked. Please allow pop-ups and try again.",
          variant: "destructive",
        })
        setPrintingQR(false)
        return
      }

      printWindow.document.open()
      printWindow.document.write(printContent)
      printWindow.document.close()

      toast({
        title: "Print",
        description: "Print dialog opened. Please check your browser's print dialog.",
      })
    } catch (error: any) {
      console.error("Error printing QR code:", error)
      toast({
        title: "Error",
        description: `Failed to print QR code: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setPrintingQR(false)
    }
  }

  // Replace the printBulkQR function with this completely rewritten version
  // that uses a simpler, more reliable approach to printing multiple QR codes on a single page

  // Find the printBulkQR function and replace it with this:
  const printBulkQR = async () => {
    if (qrCodes.length === 0 || selectedStudents.length === 0) {
      toast({
        title: "Error",
        description: "No QR codes selected to print",
        variant: "destructive",
      })
      return
    }

    setPrintingQR(true)

    try {
      // Get selected students and their QR codes
      const selectedQRs = selectedStudents.map((index) => ({
        student: students[index],
        qrData: qrCodes[index],
      }))

      console.log(`Printing ${selectedQRs.length} QR codes in bulk format`)

      // Create a new window for printing just the QR codes
      const printWindow = window.open("", "_blank")

      if (!printWindow) {
        toast({
          title: "Error",
          description: "Pop-up blocked. Please allow pop-ups and try again.",
          variant: "destructive",
        })
        setPrintingQR(false)
        return
      }

      // Calculate columns and rows based on qrPerPage
      let columns = 2
      let rows = 2

      if (qrPerPage === 1) {
        columns = 1
        rows = 1
      } else if (qrPerPage === 2) {
        columns = 2
        rows = 1
      } else if (qrPerPage === 4) {
        columns = 2
        rows = 2
      } else if (qrPerPage === 6) {
        columns = 3
        rows = 2
      } else if (qrPerPage === 9) {
        columns = 3
        rows = 3
      }

      // Create print content with proper HTML structure and CSS for grid layout
      const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bulk QR Codes</title>
      <style>
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        
        .print-controls {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #f0f0f0;
          padding: 10px;
          text-align: center;
          z-index: 9999;
          border-bottom: 1px solid #ddd;
        }
        
        .print-controls button {
          padding: 8px 16px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .content {
          margin-top: 50px;
        }
        
        @media print {
          .print-controls {
            display: none;
          }
          .content {
            margin-top: 0;
          }
        }
        
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          grid-template-rows: repeat(${rows}, 1fr);
          gap: 0.5cm;
          height: 100%;
        }
        
        .qr-card {
          border: 1px solid #000;
          padding: 10px;
          page-break-inside: avoid;
        }
        
        .page {
          page-break-after: always;
          padding: 0;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
        
        .school-info {
          text-align: center;
        }
        
        .school-name {
          font-size: 16px;
          font-weight: bold;
          margin: 0 0 5px 0;
        }
        
        .school-address {
          font-size: 12px;
          margin: 0 0 5px 0;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .qr-container {
          text-align: center;
          margin: 10px 0;
        }
        
        .title {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin: 10px 0;
          border: 1px solid black;
          padding: 5px;
        }
        
        .student-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          margin: 10px 0;
        }
        
        .info-item {
          border: 1px solid #ddd;
          padding: 5px;
          font-size: 12px;
        }
        
        .info-label {
          font-weight: bold;
        }
        
        .download-text {
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="print-controls">
        <button onclick="window.print()">Print QR Codes</button>
      </div>
      <div class="content">
        ${Array.from({ length: Math.ceil(selectedQRs.length / qrPerPage) }, (_, pageIndex) => {
          const pageItems = selectedQRs.slice(pageIndex * qrPerPage, (pageIndex + 1) * qrPerPage)

          return `
            <div class="page">
              <div class="qr-grid">
                ${pageItems
                  .map((item) => {
                    // Generate QR code SVG directly
                    const qr = qrcode(0, "L")
                    qr.addData(item.qrData)
                    qr.make()
                    const qrSvg = qr
                      .createSvgTag(4)
                      .replace(/width="[^"]*"/, 'width="120"')
                      .replace(/height="[^"]*"/, 'height="120"')

                    return `
                    <div class="qr-card">
                      <div class="school-info">
                        <h1 class="school-name">Sajha Boarding School</h1>
                        <p class="school-address">Chandrapur-7,Rautahat</p>
                      </div>
                      
                      <div class="title">विद्यार्थी लगइन जानकारी</div>
                      
                      <div class="qr-container">
                        ${qrSvg}
                      </div>
                      
                      <div class="student-info">
                        <div class="info-item">
                          <span class="info-label">Student Name:</span> ${item.student.name}
                        </div>
                        <div class="info-item">
                          <span class="info-label">Roll Number:</span> ${item.student.rollNumber}
                        </div>
                        <div class="info-item">
                          <span class="info-label">Grade:</span> ${item.student.grade}
                        </div>
                        <div class="info-item">
                          <span class="info-label">Section:</span> ${item.student.section || "N/A"}
                        </div>
                      </div>
                      
                      <div class="download-text">
                        Download App( Sajha Boarding School)
                      </div>
                    </div>
                  `
                  })
                  .join("")}
              </div>
            </div>
          `
        }).join("")}
      </div>
      <script>
        // Auto print after loading
        window.onload = function() {
          // Uncomment the line below if you want to automatically print
          // window.print();
        };
      </script>
    </body>
    </html>
  `

      // Write to the new window and trigger print
      printWindow.document.open()
      printWindow.document.write(printContent)
      printWindow.document.close()

      toast({
        title: "Print",
        description: `Printing ${selectedQRs.length} QR codes in bulk format.`,
      })
    } catch (error) {
      console.error("Error printing QR codes in bulk:", error)
      toast({
        title: "Error",
        description: `Failed to print QR codes: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setPrintingQR(false)
      setPrintSettingsOpen(false)
    }
  }

  // Add this helper function to generate QR SVG directly
  const generateQRSvg = (data: string): string => {
    try {
      const qr = qrcode(0, "L")
      qr.addData(data)
      qr.make()
      return qr.createSvgTag(4)
    } catch (error) {
      console.error("Error generating QR SVG:", error)
      return '<svg width="120" height="120"><rect width="120" height="120" fill="#f0f0f0"/><text x="60" y="60" textAnchor="middle" fill="#666">QR Error</text></svg>'
    }
  }

  // Execute print based on selected mode
  const executePrint = () => {
    if (bulkPrintMode) {
      printBulkQR()
    } else {
      // Print individual QR for current student
      printSingleQR(currentStudentIndex)
    }
  }

  // Share QR Code
  const handleShareQR = async () => {
    if (qrCodes.length === 0 || currentStudentIndex >= qrCodes.length) {
      toast({
        title: "Error",
        description: "No QR code to share",
        variant: "destructive",
      })
      return
    }

    setSharingQR(true)

    try {
      const dataUrl = await getQRCodeDataURL(qrCodes[currentStudentIndex])

      // Try to use the Web Share API if available
      if (navigator.share) {
        try {
          // Convert data URL to blob
          const response = await fetch(dataUrl)
          const blob = await response.blob()
          const file = new File([blob], `qr_code_${students[currentStudentIndex].name}.png`, { type: "image/png" })

          await navigator.share({
            title: `QR Code for ${students[currentStudentIndex].name}`,
            text: `QR Code for ${students[currentStudentIndex].name} (Roll: ${students[currentStudentIndex].rollNumber}, Grade: ${students[currentStudentIndex].grade})`,
            files: [file],
          })

          toast({
            title: "Success",
            description: "QR code shared successfully",
          })
        } catch (error: any) {
          // If Web Share API fails, fallback to clipboard copy
          await copyToClipboard(dataUrl)
        }
      } else {
        // Fallback to clipboard copy
        await copyToClipboard(dataUrl)
      }
    } catch (error: any) {
      console.error("Error sharing QR code:", error)
      toast({
        title: "Error",
        description: `Failed to share QR code: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSharingQR(false)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = async (dataUrl: string) => {
    try {
      // Try to copy the image to clipboard
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      // Try to use the clipboard API
      if (navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({
          [blob.type]: blob,
        })
        await navigator.clipboard.write([item])
      } else {
        // Fallback to copying a text link
        const tempInput = document.createElement("input")
        tempInput.value = `QR Code for ${students[currentStudentIndex].name} (Roll: ${students[currentStudentIndex].rollNumber}, Grade: ${students[currentStudentIndex].grade})`
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand("copy")
        document.body.removeChild(tempInput)
      }

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      toast({
        title: "Copied to clipboard",
        description: "QR code image copied to clipboard",
      })
    } catch (error) {
      console.error("Error copying to clipboard:", error)
      toast({
        title: "Error",
        description: "Failed to copy to clipboard. Opening in new tab instead.",
        variant: "destructive",
      })

      // Fallback to opening in a new tab
      const newTab = window.open()
      if (newTab) {
        newTab.document.write(`<img src="${dataUrl}" alt="QR Code"/>`)
        newTab.document.title = `QR Code - ${students[currentStudentIndex]?.name || "Student"}`
      }
    }
  }

  // Download single QR code
  const handleDownloadSingle = async () => {
    if (qrCodes.length === 0 || currentStudentIndex >= qrCodes.length) {
      toast({
        title: "Error",
        description: "No QR code to download",
        variant: "destructive",
      })
      return
    }

    try {
      const student = students[currentStudentIndex]
      const qrData = qrCodes[currentStudentIndex]

      // Create QR code directly
      const qr = qrcode(0, "L")
      qr.addData(qrData)
      qr.make()

      // Create a temporary SVG element to render the QR code
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = qr.createSvgTag(4)
      document.body.appendChild(tempDiv)

      // Get the SVG element
      const svgElement = tempDiv.querySelector("svg")

      if (svgElement) {
        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(svgElement)
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const svgUrl = URL.createObjectURL(svgBlob)

        // Create a canvas
        const canvas = document.createElement("canvas")
        canvas.width = 800
        canvas.height = 1100
        const ctx = canvas.getContext("2d")

        if (ctx) {
          // Draw white background
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Create an image from the SVG
          const qrImg = new Image()
          qrImg.crossOrigin = "anonymous"
          qrImg.src = svgUrl

          qrImg.onload = () => {
            // Draw QR code
            ctx.drawImage(qrImg, 600, 50, 150, 150)

            // Draw school name and other text
            ctx.font = "bold 32px Arial"
            ctx.fillStyle = "black"
            ctx.textAlign = "center"
            ctx.fillText("Sajha Boarding School", 400, 80)

            ctx.font = "24px Arial"
            ctx.fillText("Chandrapur-7,Rautahat", 400, 120)

            // Title box
            ctx.strokeStyle = "black"
            ctx.lineWidth = 2
            ctx.strokeRect(50, 180, 700, 60)

            // Title
            ctx.font = "bold 28px Arial"
            ctx.textAlign = "center"
            ctx.fillText("विद्यार्थी लगइन जानकारी", 400, 220)

            // Instructions
            ctx.font = "bold 20px Arial"
            ctx.textAlign = "left"
            ctx.fillText("निर्देशिका:", 50, 280)

            ctx.font = "18px Arial"
            ctx.fillText("• माथिको QR कोड स्क्यान गरी साझा बोर्डिङ स्कुल एपमा छिटो र सजिलै लगाइन गर्नुहोस्।", 70, 320)
            ctx.fillText("• यदि QR कोड स्क्यान गर्न सकिँदैन भने, आफ्नो कक्षा (Grade) र रोल नम्बर (Roll No.)", 70, 350)
            ctx.fillText("  प्रयोग गरी म्यानुअल रूपमा लगाइन गर्नुहोस्।", 70, 380)

            // Student info
            ctx.strokeStyle = "#ddd"
            ctx.lineWidth = 1

            // Name
            ctx.strokeRect(50, 420, 340, 50)
            ctx.font = "bold 18px Arial"
            ctx.fillText("Student Name:", 60, 450)
            ctx.font = "18px Arial"
            ctx.fillText(student.name, 180, 450)

            // Roll Number
            ctx.strokeRect(410, 420, 340, 50)
            ctx.font = "bold 18px Arial"
            ctx.fillText("Roll Number:", 420, 450)
            ctx.font = "18px Arial"
            ctx.fillText(student.rollNumber, 540, 450)

            // Grade
            ctx.strokeRect(50, 480, 340, 50)
            ctx.font = "bold 18px Arial"
            ctx.fillText("Grade:", 60, 510)
            ctx.font = "18px Arial"
            ctx.fillText(student.grade, 180, 510)

            // Section
            ctx.strokeRect(410, 480, 340, 50)
            ctx.font = "bold 18px Arial"
            ctx.fillText("Section:", 420, 510)
            ctx.font = "18px Arial"
            ctx.fillText(student.section || "N/A", 540, 510)

            // Father's Name
            ctx.strokeRect(50, 540, 340, 50)
            ctx.font = "bold 18px Arial"
            ctx.fillText("Father's Name:", 60, 570)
            ctx.font = "18px Arial"
            ctx.fillText(student.fatherName || "", 180, 570)

            // Download text
            ctx.font = "bold 24px Arial"
            ctx.textAlign = "center"
            ctx.fillText("Download App( Sajha Boarding School)", 400, 600)

            // Create a temporary link element
            const link = document.createElement("a")
            link.href = canvas.toDataURL("image/png")
            link.download = `${student.name?.replace(/\s+/g, "_")}_${student.rollNumber}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Clean up
            URL.revokeObjectURL(svgUrl)
            document.body.removeChild(tempDiv)

            toast({
              title: "Success",
              description: "QR code downloaded successfully",
            })
          }

          qrImg.onerror = () => {
            console.error("Error loading QR code image")
            document.body.removeChild(tempDiv)
            URL.revokeObjectURL(svgUrl)

            toast({
              title: "Error",
              description: "Failed to generate QR code image",
              variant: "destructive",
            })
          }
        } else {
          document.body.removeChild(tempDiv)
          URL.revokeObjectURL(svgUrl)
          toast({
            title: "Error",
            description: "Failed to create canvas context",
            variant: "destructive",
          })
        }
      } else {
        document.body.removeChild(tempDiv)
        toast({
          title: "Error",
          description: "Failed to generate QR code SVG",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error downloading QR code:", error)
      toast({
        title: "Error",
        description: `Failed to download QR code: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDownloadAll = async () => {
    if (qrCodes.length === 0) {
      toast({
        title: "Error",
        description: "No QR codes to download",
        variant: "destructive",
      })
      return
    }

    setDownloadingQR(true)

    try {
      const zip = new JSZip()
      const qrFolder = zip.folder("qr-codes")

      if (qrFolder) {
        // Create a promise for each QR code conversion
        const promises = students.map((student, i) => {
          return new Promise<void>((resolve) => {
            try {
              // Create QR code directly
              const qr = qrcode(0, "L")
              qr.addData(qrCodes[i])
              qr.make()

              // Create a temporary SVG element to render the QR code
              const tempDiv = document.createElement("div")
              tempDiv.innerHTML = qr.createSvgTag(4)
              document.body.appendChild(tempDiv)

              // Get the SVG element
              const svgElement = tempDiv.querySelector("svg")

              if (svgElement) {
                // Convert SVG to data URL
                const svgData = new XMLSerializer().serializeToString(svgElement)
                const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
                const svgUrl = URL.createObjectURL(svgBlob)

                // Create a canvas
                const canvas = document.createElement("canvas")
                canvas.width = 800
                canvas.height = 1100
                const ctx = canvas.getContext("2d")

                if (ctx) {
                  // Draw white background
                  ctx.fillStyle = "white"
                  ctx.fillRect(0, 0, canvas.width, canvas.height)

                  // Create an image from the SVG
                  const qrImg = new Image()
                  qrImg.crossOrigin = "anonymous"
                  qrImg.src = svgUrl

                  qrImg.onload = () => {
                    // Draw QR code
                    ctx.drawImage(qrImg, 600, 50, 150, 150)

                    // Draw school name and other text
                    ctx.font = "bold 32px Arial"
                    ctx.fillStyle = "black"
                    ctx.textAlign = "center"
                    ctx.fillText("Sajha Boarding School", 400, 80)

                    ctx.font = "24px Arial"
                    ctx.fillText("Chandrapur-7,Rautahat", 400, 120)

                    // Title box
                    ctx.strokeStyle = "black"
                    ctx.lineWidth = 2
                    ctx.strokeRect(50, 180, 700, 60)

                    // Title
                    ctx.font = "bold 28px Arial"
                    ctx.textAlign = "center"
                    ctx.fillText("विद्यार्थी लगइन जानकारी", 400, 220)

                    // Instructions
                    ctx.font = "bold 20px Arial"
                    ctx.textAlign = "left"
                    ctx.fillText("निर्देशिका:", 50, 280)

                    ctx.font = "18px Arial"
                    ctx.fillText("• माथिको QR कोड स्क्यान गरी साझा बोर्डिङ स्कुल एपमा छिटो र सजिलै लगाइन गर्नुहोस्।", 70, 320)
                    ctx.fillText("• यदि QR कोड स्क्यान गर्न सकिँदैन भने, आफ्नो कक्षा (Grade) र रोल नम्बर (Roll No.)", 70, 350)
                    ctx.fillText("  प्रयोग गरी म्यानुअल रूपमा लगाइन गर्नुहोस्।", 70, 380)

                    // Student info
                    ctx.strokeStyle = "#ddd"
                    ctx.lineWidth = 1

                    // Name
                    ctx.strokeRect(50, 420, 340, 50)
                    ctx.font = "bold 18px Arial"
                    ctx.fillText("Student Name:", 60, 450)
                    ctx.font = "18px Arial"
                    ctx.fillText(student.name, 180, 450)

                    // Roll Number
                    ctx.strokeRect(410, 420, 340, 50)
                    ctx.font = "bold 18px Arial"
                    ctx.fillText("Roll Number:", 420, 450)
                    ctx.font = "18px Arial"
                    ctx.fillText(student.rollNumber, 540, 450)

                    // Grade
                    ctx.strokeRect(50, 480, 340, 50)
                    ctx.font = "bold 18px Arial"
                    ctx.fillText("Grade:", 60, 510)
                    ctx.font = "18px Arial"
                    ctx.fillText(student.grade, 180, 510)

                    // Section
                    ctx.strokeRect(410, 480, 340, 50)
                    ctx.font = "bold 18px Arial"
                    ctx.fillText("Section:", 420, 510)
                    ctx.font = "18px Arial"
                    ctx.fillText(student.section || "N/A", 540, 510)

                    // Father's Name
                    ctx.strokeRect(50, 540, 340, 50)
                    ctx.font = "bold 18px Arial"
                    ctx.fillText("Father's Name:", 60, 570)
                    ctx.font = "18px Arial"
                    ctx.fillText(student.fatherName || "", 180, 570)

                    // Download text
                    ctx.font = "bold 24px Arial"
                    ctx.textAlign = "center"
                    ctx.fillText("Download App( Sajha Boarding School)", 400, 600)

                    // Get the data URL and add to zip
                    const dataUrl = canvas.toDataURL("image/png")
                    const base64Data = dataUrl.split(",")[1]
                    qrFolder.file(`${student.name?.replace(/\s+/g, "_")}_${student.rollNumber}.png`, base64Data, {
                      base64: true,
                    })

                    // Clean up
                    URL.revokeObjectURL(svgUrl)
                    document.body.removeChild(tempDiv)
                    resolve()
                  }

                  qrImg.onerror = () => {
                    console.error("Error loading QR code image")
                    document.body.removeChild(tempDiv)
                    URL.revokeObjectURL(svgUrl)
                    resolve()
                  }
                } else {
                  document.body.removeChild(tempDiv)
                  URL.revokeObjectURL(svgUrl)
                  resolve()
                }
              } else {
                document.body.removeChild(tempDiv)
                resolve()
              }
            } catch (error) {
              console.error(`Error processing QR code for ${student.name}:`, error)
              resolve()
            }
          })
        })

        // Wait for all conversions to complete
        await Promise.all(promises)

        const content = await zip.generateAsync({ type: "blob" })
        FileSaver.saveAs(content, `qr_codes_${selectedGrade}.zip`)

        toast({
          title: "Success",
          description: "QR codes downloaded successfully",
        })
      }
    } catch (error: any) {
      console.error("Error downloading QR codes:", error)
      toast({
        title: "Error",
        description: `Failed to download QR codes: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setDownloadingQR(false)
    }
  }

  const handlePrevious = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1)
    }
  }

  if (permissionChecking) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Permission Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{permissionMessage}</p>
            <Button className="mt-4 w-full" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Generate QR Codes</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>QR Code Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label>Mode</Label>
              <RadioGroup value={mode} onValueChange={setMode} className="flex flex-col space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="allStudents" id="allStudents" />
                  <Label htmlFor="allStudents">All Students in Grade</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="singleStudent" id="singleStudent" />
                  <Label htmlFor="singleStudent">Single Student</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="grade">Select Class</Label>
              {loadingClasses ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
              ) : (
                <Select
                  value={useSectionFiltering ? selectedClassId : selectedGrade}
                  onValueChange={(value) => {
                    if (useSectionFiltering) {
                      setSelectedClassId(value)
                      const classObj = availableClasses.find((c) => c.id === value)
                      setSelectedGrade(classObj?.name || "")

                      // Reset section when class changes
                      setSelectedSection("")
                      setSelectedSectionId("")
                    } else {
                      setSelectedGrade(value)
                      setSelectedClassId("")
                    }
                  }}
                >
                  <SelectTrigger id="grade">
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
            </div>

            {useSectionFiltering && (
              <div className="mt-4">
                <Label htmlFor="section">Select Section</Label>
                {loadingSections ? (
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md"></div>
                ) : (
                  <Select
                    value={selectedSectionId}
                    onValueChange={(value) => {
                      setSelectedSectionId(value)
                      if (value === "all") {
                        setSelectedSection("all")
                      } else {
                        // Find the section object
                        const sectionObj = availableSections.find((s) => s.id === value)
                        // Use the section name directly
                        setSelectedSection(sectionObj?.name || "")
                      }
                    }}
                    disabled={!selectedClassId || availableSections.length === 0}
                  >
                    <SelectTrigger id="section">
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
              </div>
            )}

            {mode === "singleStudent" && (
              <>
                <div>
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter roll number"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Student Name</Label>
                  <Input
                    id="name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter student name"
                  />
                </div>
              </>
            )}

            <Button onClick={handleGenerateQR} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate QR Code"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loadingStudents && (
        <div className="flex justify-center items-center mt-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading students...</span>
        </div>
      )}

      {qrCodes.length > 0 && students.length > 0 && currentStudentIndex < students.length && (
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold">{students[currentStudentIndex].name}</h3>
              <p className="text-sm text-muted-foreground">
                Roll Number: {students[currentStudentIndex].rollNumber}, Grade: {students[currentStudentIndex].grade}
                {students[currentStudentIndex].section && `, Section: ${students[currentStudentIndex].section}`}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG id="qr-code" value={qrCodes[currentStudentIndex]} size={200} level="H" includeMargin={true} />
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Student {currentStudentIndex + 1} of {students.length}
            </p>

            {students.length > 1 && (
              <div className="flex justify-center mt-4 space-x-4">
                <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentStudentIndex === 0}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentStudentIndex === students.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={handleViewQR} disabled={viewingQR}>
              {viewingQR ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              View
            </Button>
            <Button variant="outline" onClick={handlePrintQR} disabled={printingQR}>
              {printingQR ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
              Print All QR Codes
            </Button>
            <Button variant="outline" onClick={handleShareQR} disabled={sharingQR}>
              {sharingQR ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied" : "Share"}
            </Button>
            <Button variant="outline" onClick={handleDownloadSingle}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleDownloadAll} disabled={downloadingQR}>
              {downloadingQR ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download All
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Print Settings Dialog */}
      <Dialog open={printSettingsOpen} onOpenChange={setPrintSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Print Settings</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" onClick={() => setBulkPrintMode(false)}>
                Single QR
              </TabsTrigger>
              <TabsTrigger value="bulk" onClick={() => setBulkPrintMode(true)}>
                Bulk Print
              </TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Print a single QR code with full details on one page.
              </p>
            </TabsContent>
            <TabsContent value="bulk" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Print multiple QR codes on each page. Select how many QR codes per page:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={qrPerPage === 1 ? "default" : "outline"}
                    onClick={() => setQrPerPage(1)}
                    className="w-full"
                  >
                    1 per page
                  </Button>
                  <Button
                    variant={qrPerPage === 2 ? "default" : "outline"}
                    onClick={() => setQrPerPage(2)}
                    className="w-full"
                  >
                    2 per page
                  </Button>
                  <Button
                    variant={qrPerPage === 4 ? "default" : "outline"}
                    onClick={() => setQrPerPage(4)}
                    className="w-full"
                  >
                    4 per page
                  </Button>
                  <Button
                    variant={qrPerPage === 6 ? "default" : "outline"}
                    onClick={() => setQrPerPage(6)}
                    className="w-full"
                  >
                    6 per page
                  </Button>
                  <Button
                    variant={qrPerPage === 9 ? "default" : "outline"}
                    onClick={() => setQrPerPage(9)}
                    className="w-full"
                  >
                    9 per page
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Select Students to Print</Label>
                    <Button variant="ghost" size="sm" onClick={toggleAllStudents}>
                      {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {students.map((student, index) => (
                      <div key={index} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`student-${index}`}
                          checked={selectedStudents.includes(index)}
                          onCheckedChange={() => toggleStudentSelection(index)}
                        />
                        <Label htmlFor={`student-${index}`} className="cursor-pointer">
                          {student.rollNumber}. {student.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executePrint} disabled={printingQR}>
              {printingQR ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Printing...
                </>
              ) : (
                "Print"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View QR Code Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code for {students[currentStudentIndex]?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <QRCodeSVG value={qrCodes[currentStudentIndex] || ""} size={250} level="H" includeMargin={true} />
            </div>
            <div className="mt-4 text-center">
              <p className="font-semibold">{students[currentStudentIndex]?.name}</p>
              <p className="text-sm text-muted-foreground">
                Roll Number: {students[currentStudentIndex]?.rollNumber}, Grade: {students[currentStudentIndex]?.grade}
                {students[currentStudentIndex]?.section && `, Section: ${students[currentStudentIndex]?.section}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => printSingleQR(currentStudentIndex)} disabled={printingQR}>
              {printingQR ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </>
              )}
            </Button>
            <Button onClick={handleDownloadSingle} disabled={downloadingQR}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden iframe for printing */}
      <iframe ref={printFrameRef} style={{ display: "none" }} />
    </div>
  )
}
