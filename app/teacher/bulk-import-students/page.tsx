"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student } from "@/lib/models"
import { AlertCircle, Download, Loader2, Upload } from "lucide-react"
import * as XLSX from "xlsx"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function BulkImportStudentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [validRecords, setValidRecords] = useState(0)
  const [invalidRecords, setInvalidRecords] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State for sections from database
  const [sections, setSections] = useState<string[]>([])
  const [loadingSections, setLoadingSections] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  // Fetch sections from database
  useEffect(() => {
    const fetchSections = async () => {
      setLoadingSections(true)
      try {
        // Check if we're in demo mode
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          // Use default sections in demo mode
          setSections(["A", "B", "C", "D"])
          setLoadingSections(false)
          return
        }

        // Fetch sections from Firestore
        const sectionsSnapshot = await getDocs(collection(db, "sections"))
        const sectionsData = sectionsSnapshot.docs.map((doc) => doc.data().name || doc.id)

        // If no sections found, use default
        if (sectionsData.length === 0) {
          setSections(["A", "B", "C", "D"])
        } else {
          setSections(sectionsData)
        }
      } catch (error) {
        console.error("Error fetching sections:", error)
        // Fallback to default values
        setSections(["A", "B", "C", "D"])
      } finally {
        setLoadingSections(false)
      }
    }

    fetchSections()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseFile(selectedFile)
    }
  }

  const parseFile = async (file: File) => {
    setLoading(true)
    setError("")
    setSuccess(false)
    setPreview([])

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          // Validate data
          const { valid, invalid, validData } = validateData(jsonData)
          setTotalRecords(jsonData.length)
          setValidRecords(valid)
          setInvalidRecords(invalid)
          setPreview(validData.slice(0, 5)) // Show first 5 records as preview
          setLoading(false)
        } catch (error) {
          setError("Failed to parse file. Please make sure it's a valid Excel or CSV file.")
          setLoading(false)
        }
      }
      reader.onerror = () => {
        setError("Failed to read file.")
        setLoading(false)
      }
      reader.readAsBinaryString(file)
    } catch (error) {
      setError("An error occurred while processing the file.")
      setLoading(false)
    }
  }

  const validateData = (data: any[]) => {
    let valid = 0
    let invalid = 0
    const validData: any[] = []

    data.forEach((record) => {
      // Check required fields
      if (
        record.name &&
        record.grade &&
        record.rollNumber &&
        record.fatherName &&
        record.contactNumber &&
        record.section
      ) {
        valid++
        validData.push(record)
      } else {
        invalid++
      }
    })

    return { valid, invalid, validData }
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          // Validate data
          const { validData } = validateData(jsonData)

          // Check if we're in demo mode
          const isDemoMode = localStorage.getItem("isDemoMode") === "true"

          if (isDemoMode) {
            // Simulate adding students in demo mode
            console.log("Demo mode: Adding students", validData)
            setTimeout(() => {
              setSuccess(true)
              setLoading(false)
              setFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ""
              }
            }, 2000)
          } else {
            // Add students to Firestore
            let addedCount = 0
            for (const record of validData) {
              // Check if student with same roll number, grade, and section already exists
              const studentsQuery = query(
                collection(db, "students"),
                where("rollNumber", "==", record.rollNumber.toString()),
                where("grade", "==", record.grade.toString()),
                where("section", "==", record.section.toString()),
              )
              const querySnapshot = await getDocs(studentsQuery)

              if (querySnapshot.empty) {
                // Create student object
                const studentData: Omit<Student, "id"> = {
                  name: record.name,
                  firstName: record.firstName || "",
                  middleName: record.middleName || "",
                  lastName: record.lastName || "",
                  fatherName: record.fatherName,
                  motherName: record.motherName || "",
                  contactNumber: record.contactNumber.toString(),
                  dob: record.dob || "",
                  rollNumber: record.rollNumber.toString(),
                  grade: record.grade.toString(),
                  section: record.section.toString(),
                  symbolNumber: record.symbolNumber || null,
                  address: record.address || "",
                  usesBus: record.usesBus === "Yes" || record.usesBus === true,
                  busRoute: record.busRoute || "",
                  resultPdfUrl: "",
                  subjects: [],
                  totalMarks: 0,
                  percentage: 0,
                  rank: 0,
                  attendance: 0,
                  totalClasses: 0,
                  monthlyFee: record.monthlyFee || 0,
                  dues: 0,
                  currentSubject: null,
                  attendanceStatus: "",
                  attendanceId: "",
                  isSelected: false,
                  qrCode: null,
                  profilePictureUrl: null,
                  transportationFee: record.transportationFee || 0,
                }

                await addDoc(collection(db, "students"), studentData)
                addedCount++
              }
            }

            setSuccess(true)
            setLoading(false)
            setFile(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ""
            }
          }
        } catch (error: any) {
          setError(`Error importing students: ${error.message}`)
          setLoading(false)
        }
      }
      reader.onerror = () => {
        setError("Failed to read file.")
        setLoading(false)
      }
      reader.readAsBinaryString(file)
    } catch (error: any) {
      setError(`An error occurred: ${error.message}`)
      setLoading(false)
    }
  }

  const downloadSampleTemplate = () => {
    // Create sample data
    const sampleData = [
      {
        name: "John Doe",
        firstName: "John",
        middleName: "",
        lastName: "Doe",
        fatherName: "James Doe",
        motherName: "Jane Doe",
        contactNumber: "9876543210",
        dob: "2065-01-15",
        rollNumber: "1",
        grade: "10",
        section: "A",
        symbolNumber: "",
        address: "Kathmandu",
        usesBus: "Yes",
        busRoute: "Route A",
        monthlyFee: 1500,
        transportationFee: 500,
      },
      {
        name: "Jane Smith",
        firstName: "Jane",
        middleName: "",
        lastName: "Smith",
        fatherName: "John Smith",
        motherName: "Mary Smith",
        contactNumber: "9876543211",
        dob: "2065-02-20",
        rollNumber: "2",
        grade: "10",
        section: "B",
        symbolNumber: "",
        address: "Lalitpur",
        usesBus: "No",
        busRoute: "",
        monthlyFee: 1500,
        transportationFee: 0,
      },
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sampleData)

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students")

    // Generate Excel file
    XLSX.writeFile(workbook, "student_import_template.xlsx")
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bulk Import Students</h1>
          <p className="text-muted-foreground">Import multiple students at once using Excel or CSV file</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
          <CardDescription>Follow these steps to import students in bulk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p>1. Download the sample template below</p>
            <p>2. Fill in the student details in the template</p>
            <p>3. Upload the filled template</p>
            <p>4. Review the data and click Import</p>
          </div>

          <div>
            <Button onClick={downloadSampleTemplate} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Sample Template
            </Button>
          </div>

          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1">
                <li>Required fields: name, grade, section, rollNumber, fatherName, contactNumber</li>
                <li>Make sure roll numbers are unique within each grade and section</li>
                <li>Existing students with the same roll number, grade, and section will be skipped</li>
                <li>Available sections: {loadingSections ? "Loading..." : sections.join(", ")}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload Excel (.xlsx) or CSV file with student data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={loading || loadingSections}
              />
            </div>

            {file && preview.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="bg-gray-100 rounded-md px-3 py-1">
                    Total Records: <span className="font-medium">{totalRecords}</span>
                  </div>
                  <div className="bg-green-100 rounded-md px-3 py-1">
                    Valid Records: <span className="font-medium">{validRecords}</span>
                  </div>
                  {invalidRecords > 0 && (
                    <div className="bg-red-100 rounded-md px-3 py-1">
                      Invalid Records: <span className="font-medium">{invalidRecords}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-medium mb-2">Preview (First 5 records):</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {Object.keys(preview[0]).map((key) => (
                            <th key={key} className="border px-3 py-2 text-left text-sm">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((record, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(record).map((value: any, i) => (
                              <td key={i} className="border px-3 py-2 text-sm">
                                {value?.toString() || ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleImport} disabled={loading || invalidRecords === totalRecords}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Students
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 mt-4">{error}</p>}
            {success && <p className="text-green-500 mt-4">Students imported successfully!</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
