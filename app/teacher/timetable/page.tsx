"use client"

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
}

interface Subject {
  id: string
  name: string
  code: string
}

interface Section {
  id: string
  name: string
}

interface TimeSlot {
  id: string
  day: string
  period: number
  startTime: string
  endTime: string
  classId: string
  sectionId: string
  subjectId: string
  teacherId: string
}

export default function TimetablePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedTeacher, setSelectedTeacher] = useState("")
  const [viewMode, setViewMode] = useState<"class" | "teacher">("class")
  const [availableSections, setAvailableSections] = useState<Section[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [slotToEdit, setSlotToEdit] = useState<TimeSlot | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newDay, setNewDay] = useState("Sunday")
  const [newPeriod, setNewPeriod] = useState("1")
  const [newStartTime, setNewStartTime] = useState("10:00")
  const [newEndTime, setNewEndTime] = useState("10:45")
  const [newSubject, setNewSubject] = useState("")
  const [newTeacher, setNewTeacher] = useState("")
  const [editDay, setEditDay] = useState("")
  const [editPeriod, setEditPeriod] = useState("")
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editSubject, setEditSubject] = useState("")
  const [editTeacherSelect, setEditTeacherSelect] = useState("")

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const periods = ["1", "2", "3", "4", "5", "6", "7", "8"]

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
      await fetchSubjects()
      await fetchTimeSlots()
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
          { id: "class1", name: "1", displayName: "Class 1" },
          { id: "class2", name: "2", displayName: "Class 2" },
          { id: "class3", name: "3", displayName: "Class 3" },
          { id: "class4", name: "LKG", displayName: "LKG" },
        ]
        setClasses(demoClasses)
      } else {
        // Fetch real classes from Firestore
        const classesSnapshot = await getDocs(collection(db, "classes"))
        const classesList: Class[] = []
        classesSnapshot.forEach((doc) => {
          classesList.push({
            id: doc.id,
            name: doc.data().name,
            displayName: doc.data().displayName,
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

  const fetchSubjects = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo subjects
        const demoSubjects: Subject[] = [
          { id: "subject1", name: "English", code: "ENG" },
          { id: "subject2", name: "Mathematics", code: "MATH" },
          { id: "subject3", name: "Science", code: "SCI" },
          { id: "subject4", name: "Social Studies", code: "SOC" },
          { id: "subject5", name: "Computer", code: "COMP" },
          { id: "subject6", name: "Nepali", code: "NEP" },
        ]
        setSubjects(demoSubjects)
      } else {
        // Fetch real subjects from Firestore
        const subjectsSnapshot = await getDocs(collection(db, "subjects"))
        const subjectsList: Subject[] = []
        subjectsSnapshot.forEach((doc) => {
          subjectsList.push({
            id: doc.id,
            name: doc.data().name,
            code: doc.data().code,
          })
        })
        setSubjects(subjectsList)
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      throw error
    }
  }

  const fetchTimeSlots = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo time slots
        const demoTimeSlots: TimeSlot[] = [
          {
            id: "slot1",
            day: "Sunday",
            period: 1,
            startTime: "10:00",
            endTime: "10:45",
            classId: "class1",
            sectionId: "section1",
            subjectId: "subject1",
            teacherId: "teacher2",
          },
          {
            id: "slot2",
            day: "Sunday",
            period: 2,
            startTime: "10:45",
            endTime: "11:30",
            classId: "class1",
            sectionId: "section1",
            subjectId: "subject2",
            teacherId: "teacher1",
          },
          {
            id: "slot3",
            day: "Monday",
            period: 1,
            startTime: "10:00",
            endTime: "10:45",
            classId: "class1",
            sectionId: "section1",
            subjectId: "subject3",
            teacherId: "teacher3",
          },
          {
            id: "slot4",
            day: "Monday",
            period: 1,
            startTime: "10:00",
            endTime: "10:45",
            classId: "class2",
            sectionId: "section1",
            subjectId: "subject1",
            teacherId: "teacher2",
          },
        ]
        setTimeSlots(demoTimeSlots)
      } else {
        // Fetch real time slots from Firestore
        const timeSlotsSnapshot = await getDocs(collection(db, "time_slots"))
        const timeSlotsList: TimeSlot[] = []
        timeSlotsSnapshot.forEach((doc) => {
          timeSlotsList.push({
            id: doc.id,
            ...(doc.data() as Omit<TimeSlot, "id">),
          })
        })
        setTimeSlots(timeSlotsList)
      }
    } catch (error) {
      console.error("Error fetching time slots:", error)
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

    // In a real app, you would filter sections based on the class
    // For simplicity, we'll just use all sections
    setAvailableSections(sections)

    // If the currently selected section is not in the available sections, reset it
    if (selectedSection && !sections.some((s) => s.id === selectedSection)) {
      setSelectedSection("")
    }
  }

  const openAddDialog = () => {
    if (viewMode === "class" && (!selectedClass || !selectedSection)) {
      toast({
        title: "Error",
        description: "Please select a class and section first",
        variant: "destructive",
      })
      return
    }

    if (viewMode === "teacher" && !selectedTeacher) {
      toast({
        title: "Error",
        description: "Please select a teacher first",
        variant: "destructive",
      })
      return
    }

    // Reset form fields
    setNewDay("Sunday")
    setNewPeriod("1")
    setNewStartTime("10:00")
    setNewEndTime("10:45")
    setNewSubject("")
    setNewTeacher("")

    // If in teacher view, pre-select the teacher
    if (viewMode === "teacher") {
      setNewTeacher(selectedTeacher)
    }

    setAddDialogOpen(true)
  }

  const handleAddTimeSlot = async () => {
    if (!newDay || !newPeriod || !newStartTime || !newEndTime || !newSubject) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (viewMode === "class" && (!selectedClass || !selectedSection)) {
      toast({
        title: "Error",
        description: "Please select a class and section",
        variant: "destructive",
      })
      return
    }

    if (!newTeacher) {
      toast({
        title: "Error",
        description: "Please select a teacher",
        variant: "destructive",
      })
      return
    }

    // Check for conflicts
    const periodNumber = Number.parseInt(newPeriod)
    const conflictingSlot = timeSlots.find(
      (slot) =>
        slot.day === newDay &&
        slot.period === periodNumber &&
        ((viewMode === "class" && slot.classId === selectedClass && slot.sectionId === selectedSection) ||
          (viewMode === "teacher" && slot.teacherId === newTeacher)),
    )

    if (conflictingSlot) {
      toast({
        title: "Error",
        description: "There is already a class scheduled for this time slot",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Add to demo time slots
        const newSlot: TimeSlot = {
          id: `slot${Date.now()}`,
          day: newDay,
          period: periodNumber,
          startTime: newStartTime,
          endTime: newEndTime,
          classId: viewMode === "class" ? selectedClass : "",
          sectionId: viewMode === "class" ? selectedSection : "",
          subjectId: newSubject,
          teacherId: newTeacher,
        }
        setTimeSlots([...timeSlots, newSlot])
        toast({
          title: "Success",
          description: "Time slot added successfully (Demo Mode)",
        })
      } else {
        // Add to Firestore
        const slotData: Omit<TimeSlot, "id"> = {
          day: newDay,
          period: periodNumber,
          startTime: newStartTime,
          endTime: newEndTime,
          classId: viewMode === "class" ? selectedClass : "",
          sectionId: viewMode === "class" ? selectedSection : "",
          subjectId: newSubject,
          teacherId: newTeacher,
        }

        const docRef = await addDoc(collection(db, "time_slots"), slotData)

        const newSlot: TimeSlot = {
          id: docRef.id,
          ...slotData,
        }

        setTimeSlots([...timeSlots, newSlot])
        toast({
          title: "Success",
          description: "Time slot added successfully",
        })
      }

      // Close dialog
      setAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding time slot:", error)
      toast({
        title: "Error",
        description: "Failed to add time slot. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (slot: TimeSlot) => {
    setSlotToEdit(slot)
    setEditDay(slot.day)
    setEditPeriod(slot.period.toString())
    setEditStartTime(slot.startTime)
    setEditEndTime(slot.endTime)
    setEditSubject(slot.subjectId)
    setEditTeacherSelect(slot.teacherId)
    setEditDialogOpen(true)
  }

  const handleEditTimeSlot = async () => {
    if (!slotToEdit) return

    if (!editDay || !editPeriod || !editStartTime || !editEndTime || !editSubject || !editTeacherSelect) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const periodNumber = Number.parseInt(editPeriod)

    // Check for conflicts (excluding the current slot)
    const conflictingSlot = timeSlots.find(
      (slot) =>
        slot.id !== slotToEdit.id &&
        slot.day === editDay &&
        slot.period === periodNumber &&
        ((slot.classId === slotToEdit.classId && slot.sectionId === slotToEdit.sectionId) ||
          slot.teacherId === editTeacherSelect),
    )

    if (conflictingSlot) {
      toast({
        title: "Error",
        description: "There is already a class scheduled for this time slot",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Update in demo time slots
        const updatedSlots = timeSlots.map((slot) =>
          slot.id === slotToEdit.id
            ? {
                ...slot,
                day: editDay,
                period: periodNumber,
                startTime: editStartTime,
                endTime: editEndTime,
                subjectId: editSubject,
                teacherId: editTeacherSelect,
              }
            : slot,
        )
        setTimeSlots(updatedSlots)
        toast({
          title: "Success",
          description: "Time slot updated successfully (Demo Mode)",
        })
      } else {
        // Update in Firestore
        const slotRef = doc(db, "time_slots", slotToEdit.id)
        await updateDoc(slotRef, {
          day: editDay,
          period: periodNumber,
          startTime: editStartTime,
          endTime: editEndTime,
          subjectId: editSubject,
          teacherId: editTeacherSelect,
        })

        // Update local state
        const updatedSlots = timeSlots.map((slot) =>
          slot.id === slotToEdit.id
            ? {
                ...slot,
                day: editDay,
                period: periodNumber,
                startTime: editStartTime,
                endTime: editEndTime,
                subjectId: editSubject,
                teacherId: editTeacherSelect,
              }
            : slot,
        )
        setTimeSlots(updatedSlots)
        toast({
          title: "Success",
          description: "Time slot updated successfully",
        })
      }

      // Close dialog
      setEditDialogOpen(false)
      setSlotToEdit(null)
    } catch (error) {
      console.error("Error updating time slot:", error)
      toast({
        title: "Error",
        description: "Failed to update time slot. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (slot: TimeSlot) => {
    setSlotToDelete(slot)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!slotToDelete) return

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Remove from demo time slots
        const filteredSlots = timeSlots.filter((slot) => slot.id !== slotToDelete.id)
        setTimeSlots(filteredSlots)
        toast({
          title: "Success",
          description: "Time slot removed successfully (Demo Mode)",
        })
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "time_slots", slotToDelete.id))

        // Update local state
        const filteredSlots = timeSlots.filter((slot) => slot.id !== slotToDelete.id)
        setTimeSlots(filteredSlots)
        toast({
          title: "Success",
          description: "Time slot removed successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting time slot:", error)
      toast({
        title: "Error",
        description: "Failed to remove time slot. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setSlotToDelete(null)
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

  const getSubjectName = (subjectId: string) => {
    const subjectObj = subjects.find((s) => s.id === subjectId)
    return subjectObj ? subjectObj.name : "Unknown"
  }

  const getTeacherName = (teacherId: string) => {
    const teacherObj = teachers.find((t) => t.id === teacherId)
    return teacherObj ? teacherObj.name : "Unknown"
  }

  const getFilteredTimeSlots = () => {
    if (viewMode === "class") {
      if (!selectedClass || !selectedSection) return []
      return timeSlots.filter((slot) => slot.classId === selectedClass && slot.sectionId === selectedSection)
    } else {
      if (!selectedTeacher) return []
      return timeSlots.filter((slot) => slot.teacherId === selectedTeacher)
    }
  }

  const renderTimetable = () => {
    const filteredSlots = getFilteredTimeSlots()

    // Group by day
    const slotsByDay: Record<string, TimeSlot[]> = {}
    days.forEach((day) => {
      slotsByDay[day] = filteredSlots.filter((slot) => slot.day === day)
    })

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              {days.map((day) => (
                <TableHead key={day}>{day}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period}>
                <TableCell className="font-medium">Period {period}</TableCell>
                {days.map((day) => {
                  const slot = slotsByDay[day]?.find((s) => s.period === Number.parseInt(period))
                  return (
                    <TableCell key={day} className="min-w-[150px]">
                      {slot ? (
                        <div className="space-y-1">
                          <div className="font-medium">{getSubjectName(slot.subjectId)}</div>
                          {viewMode === "class" ? (
                            <div className="text-sm text-muted-foreground">{getTeacherName(slot.teacherId)}</div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {getClassName(slot.classId)} - {getSectionName(slot.sectionId)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {slot.startTime} - {slot.endTime}
                          </div>
                          <div className="flex space-x-1 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => openEditDialog(slot)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => confirmDelete(slot)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-7xl">
      <Toaster />

      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Manage Timetable</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Timetable View</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "class" | "teacher")}>
            <TabsList className="mb-4">
              <TabsTrigger value="class">Class View</TabsTrigger>
              <TabsTrigger value="teacher">Teacher View</TabsTrigger>
            </TabsList>

            <TabsContent value="class">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="class">Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger id="class" className="mt-1">
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

                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                    disabled={availableSections.length === 0}
                  >
                    <SelectTrigger id="section" className="mt-1">
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

                <div className="flex items-end">
                  <Button onClick={openAddDialog} disabled={!selectedClass || !selectedSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="teacher">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="teacher">Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger id="teacher" className="mt-1">
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

                <div className="flex items-end">
                  <Button onClick={openAddDialog} disabled={!selectedTeacher}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {getFilteredTimeSlots().length > 0 ? (
            renderTimetable()
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {viewMode === "class"
                ? selectedClass && selectedSection
                  ? "No time slots found for this class and section. Add your first time slot."
                  : "Please select a class and section to view the timetable."
                : selectedTeacher
                  ? "No time slots found for this teacher. Add your first time slot."
                  : "Please select a teacher to view the timetable."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Time Slot Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day">Day</Label>
                <Select value={newDay} onValueChange={setNewDay}>
                  <SelectTrigger id="day">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select value={newPeriod} onValueChange={setNewPeriod}>
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        Period {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Select value={newStartTime} onValueChange={setNewStartTime}>
                  <SelectTrigger id="startTime">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="10:45">10:45 AM</SelectItem>
                    <SelectItem value="11:30">11:30 AM</SelectItem>
                    <SelectItem value="12:15">12:15 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="13:45">1:45 PM</SelectItem>
                    <SelectItem value="14:30">2:30 PM</SelectItem>
                    <SelectItem value="15:15">3:15 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Select value={newEndTime} onValueChange={setNewEndTime}>
                  <SelectTrigger id="endTime">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10:45">10:45 AM</SelectItem>
                    <SelectItem value="11:30">11:30 AM</SelectItem>
                    <SelectItem value="12:15">12:15 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="13:45">1:45 PM</SelectItem>
                    <SelectItem value="14:30">2:30 PM</SelectItem>
                    <SelectItem value="15:15">3:15 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={newSubject} onValueChange={setNewSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {viewMode === "class" && (
              <div className="space-y-2">
                <Label htmlFor="teacher">Teacher</Label>
                <Select value={newTeacher} onValueChange={setNewTeacher}>
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="Select teacher" />
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTimeSlot} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Time Slot"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Time Slot Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Time Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDay">Day</Label>
                <Select value={editDay} onValueChange={setEditDay}>
                  <SelectTrigger id="editDay">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPeriod">Period</Label>
                <Select value={editPeriod} onValueChange={setEditPeriod}>
                  <SelectTrigger id="editPeriod">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        Period {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editStartTime">Start Time</Label>
                <Select value={editStartTime} onValueChange={setEditStartTime}>
                  <SelectTrigger id="editStartTime">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="10:45">10:45 AM</SelectItem>
                    <SelectItem value="11:30">11:30 AM</SelectItem>
                    <SelectItem value="12:15">12:15 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="13:45">1:45 PM</SelectItem>
                    <SelectItem value="14:30">2:30 PM</SelectItem>
                    <SelectItem value="15:15">3:15 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEndTime">End Time</Label>
                <Select value={editEndTime} onValueChange={setEditEndTime}>
                  <SelectTrigger id="editEndTime">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10:45">10:45 AM</SelectItem>
                    <SelectItem value="11:30">11:30 AM</SelectItem>
                    <SelectItem value="12:15">12:15 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="13:45">1:45 PM</SelectItem>
                    <SelectItem value="14:30">2:30 PM</SelectItem>
                    <SelectItem value="15:15">3:15 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSubject">Subject</Label>
              <Select value={editSubject} onValueChange={setEditSubject}>
                <SelectTrigger id="editSubject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editTeacher">Teacher</Label>
              <Select value={editTeacherSelect} onValueChange={setEditTeacherSelect}>
                <SelectTrigger id="editTeacher">
                  <SelectValue placeholder="Select teacher" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTimeSlot}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this time slot. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
