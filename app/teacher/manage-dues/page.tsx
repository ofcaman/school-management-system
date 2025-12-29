"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { Loader2, ArrowLeft, Save, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

type Student = {
  id: string
  name: string
  rollNumber: string
  grade: string
  dues: number
}

export default function ManageDuesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedClass, setSelectedClass] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [duesAmount, setDuesAmount] = useState("")
  const [duesNote, setDuesNote] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Available classes
  const classes = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    setLoading(false)
  }, [teacherId, router])

  useEffect(() => {
    if (selectedClass) {
      loadStudents()
    }
  }, [selectedClass])

  useEffect(() => {
    filterStudents()
  }, [students, searchQuery])

  const loadStudents = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo students
        const demoStudents: Student[] = Array.from({ length: 15 }, (_, i) => ({
          id: `student${i + 1}`,
          name: `Student ${i + 1}`,
          rollNumber: `${i + 1}`.padStart(2, "0"),
          grade: selectedClass,
          dues: i % 3 === 0 ? 1500 : 0,
        }))
        setStudents(demoStudents)
      } else {
        // Load real data from Firebase
        const studentsRef = collection(db, "students")
        const q = query(studentsRef, where("grade", "==", selectedClass))
        const querySnapshot = await getDocs(q)

        const studentsList: Student[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          studentsList.push({
            id: doc.id,
            name: data.name || "Unknown",
            rollNumber: data.rollNumber || "0",
            grade: data.grade || selectedClass,
            dues: data.dues || 0,
          })
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(studentsList)
      }
    } catch (error) {
      console.error("Error loading students:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterStudents = () => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = students.filter(
      (student) => student.name.toLowerCase().includes(query) || student.rollNumber.includes(query),
    )

    setFilteredStudents(filtered)
  }

  const selectStudent = (student: Student) => {
    setSelectedStudent(student)
    setDuesAmount(student.dues.toString())
    setDuesNote("")
    setSuccessMessage("")
  }

  const saveDues = async () => {
    if (!selectedStudent) {
      return
    }

    const amount = Number.parseInt(duesAmount)
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid dues amount")
      return
    }

    setSaving(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, just update the local state
        setTimeout(() => {
          const updatedStudents = students.map((s) => (s.id === selectedStudent.id ? { ...s, dues: amount } : s))
          setStudents(updatedStudents)
          setSelectedStudent({ ...selectedStudent, dues: amount })
          setSuccessMessage("Dues updated successfully (Demo Mode)")
        }, 500)
      } else {
        // In real mode, update in Firestore
        const studentRef = doc(db, "students", selectedStudent.id)

        const updateData: Record<string, any> = { dues: amount }

        // Add note to history if provided
        if (duesNote.trim()) {
          const timestamp = new Date().toISOString()
          updateData.duesHistory = {
            [`dues_${timestamp}`]: {
              amount: amount,
              date: timestamp,
              note: duesNote.trim(),
              previousAmount: selectedStudent.dues,
            },
          }
        }

        await updateDoc(studentRef, updateData)

        // Update local state
        const updatedStudents = students.map((s) => (s.id === selectedStudent.id ? { ...s, dues: amount } : s))
        setStudents(updatedStudents)
        setSelectedStudent({ ...selectedStudent, dues: amount })
        setSuccessMessage("Dues updated successfully")
      }
    } catch (error) {
      console.error("Error updating dues:", error)
      alert("Error updating dues. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Manage Student Dues</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Class</CardTitle>
              <CardDescription>Choose a class to view students</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Class {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedClass && (
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or roll number"
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedClass && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>
                  {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Dues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <TableRow
                            key={student.id}
                            className={`cursor-pointer ${selectedStudent?.id === student.id ? "bg-muted" : ""}`}
                            onClick={() => selectStudent(student)}
                          >
                            <TableCell>{student.rollNumber}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell className="text-right">
                              {student.dues > 0 ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                                  Rs. {student.dues}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                                  No Dues
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            No students found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Update Dues</CardTitle>
              <CardDescription>
                {selectedStudent
                  ? `Update dues for ${selectedStudent.name} (Roll: ${selectedStudent.rollNumber})`
                  : "Select a student to update dues"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStudent ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="currentDues">Current Dues</Label>
                      <div className="mt-1 text-lg font-semibold">Rs. {selectedStudent.dues}</div>
                    </div>
                    <div>
                      <Label htmlFor="newDues">New Dues Amount</Label>
                      <Input
                        id="newDues"
                        type="number"
                        placeholder="Enter amount"
                        value={duesAmount}
                        onChange={(e) => setDuesAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="duesNote">Note (Optional)</Label>
                    <Input
                      id="duesNote"
                      placeholder="Add a note about this dues update"
                      value={duesNote}
                      onChange={(e) => setDuesNote(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {successMessage && <div className="bg-green-50 text-green-700 p-3 rounded-md">{successMessage}</div>}

                  <Button onClick={saveDues} disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Dues
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  Please select a student from the list to update their dues
                </div>
              )}
            </CardContent>
          </Card>

          {selectedStudent && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Dues Management Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    <strong>Adding New Dues:</strong> Enter the total amount the student owes, including any previous
                    dues.
                  </li>
                  <li>
                    <strong>Clearing Dues:</strong> Enter 0 to mark the student as having no dues.
                  </li>
                  <li>
                    <strong>Partial Payments:</strong> When a student makes a partial payment, update the dues amount to
                    reflect the remaining balance.
                  </li>
                  <li>
                    <strong>Adding Notes:</strong> Add notes to keep track of why dues were added or modified.
                  </li>
                  <li>
                    <strong>Term Bills:</strong> When generating term bills, any dues entered here will automatically be
                    included as "Previous Dues".
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
