"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Printer,
  Search,
  UserPlus,
  Loader2,
  Eye,
  Settings,
  CreditCard,
  CreditCardIcon as CreditCardVertical,
  Edit,
} from "lucide-react"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student } from "@/lib/models"
import StudentIdCard from "./components/student-id-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import IdCardOrientationSelector from "./components/id-card-orientation-selector"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const classes = ["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())]

export default function IdCardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [isPrinting, setIsPrinting] = useState(false)
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null)
  const [cardOrientation, setCardOrientation] = useState<"landscape" | "portrait">("landscape")
  const [showSettings, setShowSettings] = useState(false)
  const printContainerRef = useRef<HTMLDivElement>(null)

  const handleSearch = async () => {
    if (!searchTerm && !selectedGrade) {
      alert("Please enter a search term or select a grade")
      return
    }

    setLoading(true)
    try {
      const studentsRef = collection(db, "students")
      let q = query(studentsRef)

      if (selectedGrade && selectedGrade !== "all") {
        q = query(q, where("grade", "==", selectedGrade))
      }

      if (searchTerm) {
        // Firebase doesn't support OR queries across fields directly
        // We'll fetch based on grade and filter in memory
        const querySnapshot = await getDocs(q)
        const results: Student[] = []

        querySnapshot.forEach((doc) => {
          const student = { id: doc.id, ...doc.data() } as Student
          const searchLower = searchTerm.toLowerCase()

          // Check if any of these fields match the search term
          if (
            student.name?.toLowerCase().includes(searchLower) ||
            student.rollNumber?.toLowerCase().includes(searchLower) ||
            student.contactNumber?.includes(searchTerm)
          ) {
            results.push(student)
          }
        })

        setStudents(results)
      } else {
        // Just fetch by grade
        q = query(q, orderBy("rollNumber"))
        const querySnapshot = await getDocs(q)
        const results: Student[] = []

        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as Student)
        })

        setStudents(results)
      }
    } catch (error) {
      console.error("Error searching students:", error)
      alert("Error searching students. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const toggleStudentSelection = (student: Student) => {
    if (selectedStudents.some((s) => s.id === student.id)) {
      setSelectedStudents(selectedStudents.filter((s) => s.id !== student.id))
    } else {
      setSelectedStudents([...selectedStudents, student])
    }
  }

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents([...students])
    }
  }

  const handlePrint = () => {
    if (selectedStudents.length === 0) {
      alert("Please select at least one student to print an ID card")
      return
    }

    setIsPrinting(true)

    // Use browser's print functionality
    setTimeout(() => {
      if (printContainerRef.current) {
        const originalContents = document.body.innerHTML
        const printContents = printContainerRef.current.innerHTML

        document.body.innerHTML = `
          <div style="padding: 20px;">
            ${printContents}
          </div>
        `

        window.print()
        document.body.innerHTML = originalContents

        // Reload the page to restore React functionality
        window.location.reload()
      } else {
        alert("Error preparing print content. Please try again.")
        setIsPrinting(false)
      }
    }, 500)
  }

  const openPreview = (student: Student) => {
    setPreviewStudent(student)
  }

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Student ID Card Generator</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4 mr-2" />
            ID Card Settings
          </Button>
          <Button onClick={() => router.push("/teacher/add-student")} variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Student
          </Button>
          <Button
            onClick={() => router.push("/teacher/id-card-editor")}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            ID Card Editor
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ID Card Settings</CardTitle>
            <CardDescription>Choose the orientation and style for your ID cards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Card Orientation</h3>
                <div className="flex gap-4">
                  <Button
                    variant={cardOrientation === "landscape" ? "default" : "outline"}
                    onClick={() => setCardOrientation("landscape")}
                    className="flex gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Landscape</span>
                  </Button>
                  <Button
                    variant={cardOrientation === "portrait" ? "default" : "outline"}
                    onClick={() => setCardOrientation("portrait")}
                    className="flex gap-2"
                  >
                    <CreditCardVertical className="h-4 w-4" />
                    <span>Portrait</span>
                  </Button>
                </div>
              </div>

              <div className="border rounded-md p-4 bg-gray-50 w-full">
                <p className="text-sm text-gray-600 mb-2 text-center">Preview</p>
                <div className="flex justify-center">
                  {students.length > 0 ? (
                    <StudentIdCard student={students[0]} orientation={cardOrientation} />
                  ) : (
                    <div className="text-gray-500 text-sm">Search for students to see a preview</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Students</CardTitle>
          <CardDescription>Search by name, roll number, or select a grade to find students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="searchTerm">Search by Name or Roll Number</Label>
              <Input
                id="searchTerm"
                placeholder="Enter name or roll number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {students.length} student{students.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={selectAllStudents}>
                {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                onClick={handlePrint}
                disabled={selectedStudents.length === 0 || isPrinting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Print {selectedStudents.length} Card{selectedStudents.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`border rounded-md p-3 cursor-pointer transition-colors ${
                    selectedStudents.some((s) => s.id === student.id)
                      ? "border-primary bg-primary/5"
                      : "hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={() => openPreview(student)}
                    >
                      {student.profilePictureUrl ? (
                        <img
                          src={student.profilePictureUrl || "/placeholder.svg"}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">👤</div>
                      )}
                    </div>
                    <div className="flex-1" onClick={() => toggleStudentSelection(student)}>
                      <h3 className="font-medium">{student.name}</h3>
                      <div className="text-sm text-gray-500">
                        Class: {student.grade} | Roll: {student.rollNumber}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0" onClick={() => openPreview(student)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print content - hidden but accessible to the DOM */}
      <div className="sr-only">
        <div ref={printContainerRef}>
          <div className="print-container">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @media print {
                body { margin: 0; padding: 0; }
                .print-card { 
                  page-break-inside: avoid;
                  margin-bottom: 0.5in;
                  display: inline-block;
                  ${
                    cardOrientation === "landscape"
                      ? "width: 3.375in; height: 2.125in;"
                      : "width: 2.125in; height: 3.375in;"
                  }
                  margin-right: 0.25in;
                }
                @page {
                  size: letter;
                  margin: 0.5in;
                }
              }
            `,
              }}
            />
            <div className="grid-print-container">
              {selectedStudents.map((student) => (
                <div key={student.id} className="print-card">
                  <StudentIdCard student={student} orientation={cardOrientation} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewStudent !== null} onOpenChange={(open) => !open && setPreviewStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
          </DialogHeader>
          {previewStudent && (
            <IdCardOrientationSelector
              student={previewStudent}
              orientation={cardOrientation}
              onOrientationChange={setCardOrientation}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
