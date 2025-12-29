"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { ArrowLeft, Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface Teacher {
  id: string
  name: string
  email: string
  subject?: string
}

interface Class {
  id: string
  name: string
  displayName: string
  sections: string[]
}

interface Section {
  id: string
  name: string
}

interface ClassTeacher {
  id: string
  classId: string
  sectionId: string
  teacherId: string
  academicYear: string
}

export default function ClassTeachersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedTeacher, setSelectedTeacher] = useState("")
  const [academicYear, setAcademicYear] = useState("2081")
  const [availableSections, setAvailableSections] = useState<Section[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<ClassTeacher | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [assignmentToEdit, setAssignmentToEdit] = useState<ClassTeacher | null>(null)
  const [editTeacher, setEditTeacher] = useState("")

  const academicYears = ["2080", "2081", "2082", "2083", "2084", "2085"]

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    fetchData()
  }, [teacherId, router])

  useEffect(() => {
    if (selectedClass) {
      updateAvailableSections()
    } else {
      setAvailableSections([])
      setSelectedSection("")
    }
  }, [selectedClass, sections, classes])

  const fetchData = async () => {
    setLoading(true)
    try {
      await fetchTeachers()
      await fetchClasses()
      await fetchSections()
      await fetchClassTeachers()
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo teachers
        const demoTeachers: Teacher[] = [
          { id: "teacher1", name: "John Doe", email: "john@example.com", subject: "Mathematics" },
          { id: "teacher2", name: "Jane Smith", email: "jane@example.com", subject: "English" },
          { id: "teacher3", name: "Bob Johnson", email: "bob@example.com", subject: "Science" },
          { id: "teacher4", name: "Alice Brown", email: "alice@example.com", subject: "Social Studies" },
          { id: "teacher5", name: "Ram Sharma", email: "ram@example.com", subject: "Nepali" },
        ]
        setTeachers(demoTeachers)
      } else {
        // Fetch real teachers from Firestore
        const teachersSnapshot = await getDocs(collection(db, "teachers"))
        const teachersList: Teacher[] = []
        teachersSnapshot.forEach((doc) => {
          teachersList.push({
            id: doc.id,
            ...(doc.data() as Omit<Teacher, "id">),
          })
        })
        setTeachers(teachersList)
      }
    } catch (error) {
      console.error("Error fetching teachers:", error)
      throw error
    }
  }

  const fetchClasses = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo classes
        const demoClasses: Class[] = [
          { id: "class1", name: "1", displayName: "Class 1", sections: ["section1", "section2"] },
          { id: "class2", name: "2", displayName: "Class 2", sections: ["section1", "section2", "section3"] },
          { id: "class3", name: "3", displayName: "Class 3", sections: ["section1", "section2"] },
          { id: "class4", name: "LKG", displayName: "LKG", sections: ["section1", "section2"] },
        ]
        setClasses(demoClasses)
      } else {
        // Fetch real classes from Firestore
        const classesSnapshot = await getDocs(collection(db, "classes"))
        const classesList: Class[] = []
        classesSnapshot.forEach((doc) => {
          classesList.push({
            id: doc.id,
            ...(doc.data() as Omit<Class, "id">),
          })
        })
        setClasses(classesList)
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      throw error
    }
  }

  const fetchSections = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo sections
        const demoSections: Section[] = [
          { id: "section1", name: "A" },
          { id: "section2", name: "B" },
          { id: "section3", name: "C" },
        ]
        setSections(demoSections)
      } else {
        // Fetch real sections from Firestore
        const sectionsSnapshot = await getDocs(collection(db, "sections"))
        const sectionsList: Section[] = []
        sectionsSnapshot.forEach((doc) => {
          sectionsList.push({
            id: doc.id,
            name: doc.data().name,
          })
        })
        setSections(sectionsList)
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      throw error
    }
  }

  const fetchClassTeachers = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo class teachers
        const demoClassTeachers: ClassTeacher[] = [
          {
            id: "ct1",
            classId: "class1",
            sectionId: "section1",
            teacherId: "teacher1",
            academicYear: "2081",
          },
          {
            id: "ct2",
            classId: "class1",
            sectionId: "section2",
            teacherId: "teacher2",
            academicYear: "2081",
          },
          {
            id: "ct3",
            classId: "class2",
            sectionId: "section1",
            teacherId: "teacher3",
            academicYear: "2081",
          },
        ]
        setClassTeachers(demoClassTeachers)
      } else {
        // Fetch real class teachers from Firestore
        const classTeachersSnapshot = await getDocs(collection(db, "class_teachers"))
        const classTeachersList: ClassTeacher[] = []
        classTeachersSnapshot.forEach((doc) => {
          classTeachersList.push({
            id: doc.id,
            ...(doc.data() as Omit<ClassTeacher, "id">),
          })
        })
        setClassTeachers(classTeachersList)
      }
    } catch (error) {
      console.error("Error fetching class teachers:", error)
      throw error
    }
  }

  const updateAvailableSections = () => {
    if (!selectedClass) {
      setAvailableSections([])
      return
    }

    const selectedClassObj = classes.find((c) => c.id === selectedClass)
    if (!selectedClassObj) {
      setAvailableSections([])
      return
    }

    const classSections = selectedClassObj.sections
    const availableSecs = sections.filter((section) => classSections.includes(section.id))
    setAvailableSections(availableSecs)

    // If the currently selected section is not in the available sections, reset it
    if (selectedSection && !classSections.includes(selectedSection)) {
      setSelectedSection("")
    }
  }

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClass) {
      toast({
        title: "Error",
        description: "Please select a class",
        variant: "destructive",
      })
      return
    }

    if (!selectedSection) {
      toast({
        title: "Error",
        description: "Please select a section",
        variant: "destructive",
      })
      return
    }

    if (!selectedTeacher) {
      toast({
        title: "Error",
        description: "Please select a teacher",
        variant: "destructive",
      })
      return
    }

    if (!academicYear) {
      toast({
        title: "Error",
        description: "Please select an academic year",
        variant: "destructive",
      })
      return
    }

    // Check if this class-section already has a teacher assigned for the selected academic year
    const existingAssignment = classTeachers.find(
      (ct) => ct.classId === selectedClass && ct.sectionId === selectedSection && ct.academicYear === academicYear,
    )

    if (existingAssignment) {
      toast({
        title: "Error",
        description: "This class and section already has a teacher assigned for the selected academic year",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Add to demo class teachers
        const newAssignment: ClassTeacher = {
          id: `ct${Date.now()}`,
          classId: selectedClass,
          sectionId: selectedSection,
          teacherId: selectedTeacher,
          academicYear,
        }
        setClassTeachers([...classTeachers, newAssignment])
        toast({
          title: "Success",
          description: "Class teacher assigned successfully (Demo Mode)",
        })
      } else {
        // Add to Firestore
        const docRef = await addDoc(collection(db, "class_teachers"), {
          classId: selectedClass,
          sectionId: selectedSection,
          teacherId: selectedTeacher,
          academicYear,
        })

        const newAssignment: ClassTeacher = {
          id: docRef.id,
          classId: selectedClass,
          sectionId: selectedSection,
          teacherId: selectedTeacher,
          academicYear,
        }

        setClassTeachers([...classTeachers, newAssignment])
        toast({
          title: "Success",
          description: "Class teacher assigned successfully",
        })
      }

      // Reset form
      setSelectedClass("")
      setSelectedSection("")
      setSelectedTeacher("")
    } catch (error) {
      console.error("Error assigning class teacher:", error)
      toast({
        title: "Error",
        description: "Failed to assign class teacher. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (assignment: ClassTeacher) => {
    setAssignmentToEdit(assignment)
    setEditTeacher(assignment.teacherId)
    setEditDialogOpen(true)
  }

  const handleEditAssignment = async () => {
    if (!assignmentToEdit) return

    if (!editTeacher) {
      toast({
        title: "Error",
        description: "Please select a teacher",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Update in demo class teachers
        const updatedAssignments = classTeachers.map((assignment) =>
          assignment.id === assignmentToEdit.id ? { ...assignment, teacherId: editTeacher } : assignment,
        )
        setClassTeachers(updatedAssignments)
        toast({
          title: "Success",
          description: "Class teacher updated successfully (Demo Mode)",
        })
      } else {
        // Update in Firestore
        const assignmentRef = doc(db, "class_teachers", assignmentToEdit.id)
        await updateDoc(assignmentRef, {
          teacherId: editTeacher,
        })

        // Update local state
        const updatedAssignments = classTeachers.map((assignment) =>
          assignment.id === assignmentToEdit.id ? { ...assignment, teacherId: editTeacher } : assignment,
        )
        setClassTeachers(updatedAssignments)
        toast({
          title: "Success",
          description: "Class teacher updated successfully",
        })
      }

      // Close dialog
      setEditDialogOpen(false)
      setAssignmentToEdit(null)
      setEditTeacher("")
    } catch (error) {
      console.error("Error updating class teacher:", error)
      toast({
        title: "Error",
        description: "Failed to update class teacher. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (assignment: ClassTeacher) => {
    setAssignmentToDelete(assignment)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!assignmentToDelete) return

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Remove from demo class teachers
        const filteredAssignments = classTeachers.filter((assignment) => assignment.id !== assignmentToDelete.id)
        setClassTeachers(filteredAssignments)
        toast({
          title: "Success",
          description: "Class teacher assignment removed successfully (Demo Mode)",
        })
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "class_teachers", assignmentToDelete.id))

        // Update local state
        const filteredAssignments = classTeachers.filter((assignment) => assignment.id !== assignmentToDelete.id)
        setClassTeachers(filteredAssignments)
        toast({
          title: "Success",
          description: "Class teacher assignment removed successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting class teacher assignment:", error)
      toast({
        title: "Error",
        description: "Failed to remove class teacher assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
    }
  }

  const getClassName = (classId: string) => {
    const classObj = classes.find((c) => c.id === classId)
    return classObj ? classObj.displayName : "Unknown"
  }

  const getSectionName = (sectionId: string) => {
    const sectionObj = sections.find((s) => s.id === sectionId)
    return sectionObj ? sectionObj.name : "Unknown"
  }

  const getTeacherName = (teacherId: string) => {
    const teacherObj = teachers.find((t) => t.id === teacherId)
    return teacherObj ? teacherObj.name : "Unknown"
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-5xl">
      <Toaster />

      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Assign Class Teachers</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Assign New Class Teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignTeacher} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger id="academicYear">
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year} BS
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                    disabled={availableSections.length === 0}
                  >
                    <SelectTrigger id="section">
                      <SelectValue
                        placeholder={
                          selectedClass
                            ? availableSections.length > 0
                              ? "Select a section"
                              : "No sections available for this class"
                            : "Select a class first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          Section {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher">Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger id="teacher">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} {teacher.subject ? `(${teacher.subject})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Teacher
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Class Teacher Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {classTeachers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Academic Year</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classTeachers.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>{getClassName(assignment.classId)}</TableCell>
                          <TableCell>Section {getSectionName(assignment.sectionId)}</TableCell>
                          <TableCell>{getTeacherName(assignment.teacherId)}</TableCell>
                          <TableCell>{assignment.academicYear} BS</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(assignment)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => confirmDelete(assignment)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No class teacher assignments found. Assign your first class teacher.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Class Teacher</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {assignmentToEdit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Class</p>
                    <p>{getClassName(assignmentToEdit.classId)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Section</p>
                    <p>Section {getSectionName(assignmentToEdit.sectionId)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Academic Year</p>
                  <p>{assignmentToEdit.academicYear} BS</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editTeacher">Teacher</Label>
                  <Select value={editTeacher} onValueChange={setEditTeacher}>
                    <SelectTrigger id="editTeacher">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} {teacher.subject ? `(${teacher.subject})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAssignment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the class teacher assignment for{" "}
              {assignmentToDelete && (
                <>
                  {getClassName(assignmentToDelete.classId)} Section {getSectionName(assignmentToDelete.sectionId)}
                </>
              )}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove Assignment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
