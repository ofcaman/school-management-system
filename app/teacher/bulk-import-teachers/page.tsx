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
import type { Teacher } from "@/lib/models"
import { AlertCircle, Download, Loader2, Upload } from "lucide-react"
import * as XLSX from "xlsx"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function BulkImportTeachersPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [validRecords, setValidRecords] = useState(0)
  const [invalidRecords, setInvalidRecords] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State for classes and sections from database
  const [classes, setClasses] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  // Fetch classes and sections from database
  useEffect(() => {
    const fetchClassesAndSections = async () => {
      setLoadingData(true)
      try {
        // Check if we're in demo mode
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          // Use default classes and sections in demo mode
          setClasses(["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
          setSections(["A", "B", "C", "D"])
          setLoadingData(false)
          return
        }

        // Fetch classes
        const classesSnapshot = await getDocs(collection(db, "classes"))
        const classesData = classesSnapshot.docs.map((doc) => doc.data().name || doc.id)

        // Sort classes
        const sortedClasses = classesData.sort((a, b) => {
          // Custom sorting to handle special class names
          if (a === "Nursery") return -1
          if (b === "Nursery") return 1
          if (a === "LKG") return -1
          if (b === "LKG") return 1
          if (a === "UKG") return -1
          if (b === "UKG") return 1
          return Number.parseInt(a) - Number.parseInt(b)
        })

        // If no classes found, use default
        if (sortedClasses.length === 0) {
          setClasses(["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
        } else {
          setClasses(sortedClasses)
        }

        // Fetch sections
        const sectionsSnapshot = await getDocs(collection(db, "sections"))
        const sectionsData = sectionsSnapshot.docs.map((doc) => doc.data().name || doc.id)

        // If no sections found, use default
        if (sectionsData.length === 0) {
          setSections(["A", "B", "C", "D"])
        } else {
          setSections(sectionsData)
        }
      } catch (error) {
        console.error("Error fetching classes and sections:", error)
        // Fallback to default values
        setClasses(["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
        setSections(["A", "B", "C", "D"])
      } finally {
        setLoadingData(false)
      }
    }

    fetchClassesAndSections()
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
      if (record.name && record.email && record.phone) {
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
            // Simulate adding teachers in demo mode
            console.log("Demo mode: Adding teachers", validData)
            setTimeout(() => {
              setSuccess(true)
              setLoading(false)
              setFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ""
              }
            }, 2000)
          } else {
            // Add teachers to Firestore
            let addedCount = 0
            for (const record of validData) {
              // Check if teacher with same email already exists
              const teachersQuery = query(collection(db, "teachers"), where("email", "==", record.email))
              const querySnapshot = await getDocs(teachersQuery)

              if (querySnapshot.empty) {
                // Parse roles from string if needed
                let roles = record.roles || ["subject_teacher"]
                if (typeof roles === "string") {
                  roles = roles.split(",").map((role: string) => role.trim())
                }

                // Create teacher object
                const teacherData: Omit<Teacher, "id"> = {
                  name: record.name.toUpperCase(),
                  email: record.email,
                  phone: record.phone.toString(),
                  qualification: record.qualification || "",
                  roles: roles,
                  assignedClass: record.assignedClass || "",
                  assignedSection: record.assignedSection || "",
                  profileImageUrl: "",
                  active: true,
                }

                await addDoc(collection(db, "teachers"), teacherData)
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
          setError(`Error importing teachers: ${error.message}`)
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
        email: "john@example.com",
        phone: "9876543210",
        qualification: "M.Ed",
        roles: "principal,class_teacher",
        assignedClass: "10",
        assignedSection: "A",
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "9876543211",
        qualification: "B.Ed",
        roles: "subject_teacher",
        assignedClass: "",
        assignedSection: "",
      },
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sampleData)

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers")

    // Generate Excel file
    XLSX.writeFile(workbook, "teacher_import_template.xlsx")
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bulk Import Teachers</h1>
          <p className="text-muted-foreground">Import multiple teachers at once using Excel or CSV file</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
          <CardDescription>Follow these steps to import teachers in bulk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p>1. Download the sample template below</p>
            <p>2. Fill in the teacher details in the template</p>
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
                <li>Required fields: name, email, phone</li>
                <li>
                  For roles, use comma-separated values: principal, class_teacher, subject_teacher, computer_teacher
                </li>
                <li>If assigning a class, you can also specify a section</li>
                <li>Existing teachers with the same email will be skipped</li>
                <li>Available classes: {loadingData ? "Loading..." : classes.join(", ")}</li>
                <li>Available sections: {loadingData ? "Loading..." : sections.join(", ")}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload Excel (.xlsx) or CSV file with teacher data</CardDescription>
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
                disabled={loading || loadingData}
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
                        Import Teachers
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 mt-4">{error}</p>}
            {success && <p className="text-green-500 mt-4">Teachers imported successfully!</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
