"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { ClassRoutine } from "@/lib/models/class-routine-models"
import type { Teacher } from "@/lib/models"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface PeriodRow {
  startTime: string
  endTime: string
  subject: string
  teacherId: string
  teacherName: string
}

export default function AddClassRoutinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])

  // Class and section state
  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([])
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)

  // Selected values
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedClassName, setSelectedClassName] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [selectedSectionName, setSelectedSectionName] = useState("")
  const [day, setDay] = useState("Sunday")

  const [tiffinStartTime, setTiffinStartTime] = useState("")
  const [tiffinEndTime, setTiffinEndTime] = useState("")

  const [diaryCheckStartTime, setDiaryCheckStartTime] = useState("")
  const [diaryCheckEndTime, setDiaryCheckEndTime] = useState("")

  const [periods, setPeriods] = useState<PeriodRow[]>(
    Array(7)
      .fill(null)
      .map(() => ({
        startTime: "",
        endTime: "",
        subject: "Math",
        teacherId: "",
        teacherName: "",
      })),
  )

  const [error, setError] = useState<string | null>(null)

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  const subjects = [
    "Math",
    "Science",
    "English",
    "Serofero",
    "Computer",
    "Nepali",
    "Samajik",
    "Health",
    "O.PT",
    "Grammar",
    "Translation",
  ]

  useEffect(() => {
    checkPermission()
  }, [])

  useEffect(() => {
    if (hasPermission) {
      fetchClasses()
    }
  }, [hasPermission])

  useEffect(() => {
    if (selectedClassId) {
      fetchSections()
    }
  }, [selectedClassId])

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Get the current user (teacher) ID from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search)
      const teacherId = urlParams.get("id") || localStorage.getItem("teacherId")

      if (!teacherId) {
        setHasPermission(false)
        setPermissionMessage("Teacher ID not found. Please log in again.")
        setPermissionChecking(false)
        return
      }

      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

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
        fetchTeachers()
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
        setPermissionMessage("You don't have permission to add class routines")
        setPermissionChecking(false)
        return
      }

      setHasPermission(true)
      fetchTeachers()
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
    }
  }

  const fetchClasses = async () => {
    setLoadingClasses(true)
    setError(null)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo classes
        const demoClasses = [
          { id: "class1", name: "1", displayName: "Grade 1" },
          { id: "class2", name: "2", displayName: "Grade 2" },
          { id: "class3", name: "3", displayName: "Grade 3" },
          { id: "class4", name: "4", displayName: "Grade 4" },
          { id: "class5", name: "5", displayName: "Grade 5" },
          { id: "class6", name: "LKG", displayName: "Class LKG" },
          { id: "class7", name: "UKG", displayName: "Class UKG" },
          { id: "class8", name: "Nursery", displayName: "Class Nursery" },
          { id: "class9", name: "P.G", displayName: "Class P.G." },
        ]
        setClasses(demoClasses)

        // Set default selected class
        if (demoClasses.length > 0) {
          setSelectedClassId(demoClasses[0].id)
          setSelectedClassName(demoClasses[0].name)
          console.log(`Set default class: ID=${demoClasses[0].id}, name=${demoClasses[0].name}`)
        }
      } else {
        // Fetch real classes from Firestore
        const classesSnapshot = await getDocs(collection(db, "classes"))
        const classesList: { id: string; name: string; displayName: string }[] = []

        classesSnapshot.forEach((doc) => {
          const classData = doc.data()
          classesList.push({
            id: doc.id,
            name: classData.name || doc.id,
            displayName: classData.displayName || `Class ${classData.name || doc.id}`,
          })
        })

        console.log(`Fetched ${classesList.length} classes from Firestore`)

        // Sort classes in logical order
        classesList.sort((a, b) => {
          const order = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
          const aIndex = order.indexOf(a.name.toLowerCase().replace(/\./g, ""))
          const bIndex = order.indexOf(b.name.toLowerCase().replace(/\./g, ""))
          return aIndex - bIndex
        })

        setClasses(classesList)

        // Set default selected class
        if (classesList.length > 0) {
          setSelectedClassId(classesList[0].id)
          setSelectedClassName(classesList[0].name)
          console.log(`Set default class: ID=${classesList[0].id}, name=${classesList[0].name}`)
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      setError("Failed to load classes. Please try again.")
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async () => {
    if (!selectedClassId) return

    setLoadingSections(true)
    setError(null)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo sections
        const demoSections = [
          { id: "section1", name: "A" },
          { id: "section2", name: "B" },
          { id: "section3", name: "C" },
        ]
        setSections(demoSections)

        // Set default selected section
        if (demoSections.length > 0) {
          setSelectedSectionId(demoSections[0].id)
          setSelectedSectionName(demoSections[0].name)
          console.log(`Set default section: ID=${demoSections[0].id}, name=${demoSections[0].name}`)
        }
      } else {
        // Get the class document to access its sections
        console.log(`Fetching sections for class ID: ${selectedClassId}`)
        const classDoc = await getDoc(doc(db, "classes", selectedClassId))

        if (!classDoc.exists()) {
          console.error("Class document not found")
          setSections([])
          setError("Class document not found. Please select a different class.")
          return
        }

        const classData = classDoc.data()
        const sectionIds = classData.sections || []

        console.log(`Class has ${sectionIds.length} sections defined`)

        if (!sectionIds.length) {
          // Default sections if none defined
          const defaultSections = [
            { id: "A", name: "A" },
            { id: "B", name: "B" },
            { id: "C", name: "C" },
            { id: "D", name: "D" },
          ]
          setSections(defaultSections)

          // Set default selected section
          if (defaultSections.length > 0) {
            setSelectedSectionId(defaultSections[0].id)
            setSelectedSectionName(defaultSections[0].name)
            console.log(`Set default section: ID=${defaultSections[0].id}, name=${defaultSections[0].name}`)
          }

          console.log("No sections found, using defaults")
          return
        }

        // Process sections
        const sectionsData: { id: string; name: string }[] = []

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
                  const sectionData = sectionDoc.data()
                  sectionsData.push({
                    id: sectionId,
                    name: sectionData.name || sectionId,
                  })
                } else {
                  // If section document doesn't exist, use the ID as name
                  sectionsData.push({
                    id: sectionId,
                    name: sectionId,
                  })
                }
              }
            } else if (sectionId && typeof sectionId === "object" && sectionId.name) {
              // If it's an object with a name property
              sectionsData.push({
                id: sectionId.id || `section-${sectionsData.length}`,
                name: sectionId.name,
              })
            }
          } catch (error) {
            console.error(`Error processing section ${sectionId}:`, error)
          }
        }

        // Sort sections alphabetically
        sectionsData.sort((a, b) => a.name.localeCompare(b.name))

        setSections(sectionsData)
        console.log(`Processed ${sectionsData.length} sections`)

        // Set default selected section
        if (sectionsData.length > 0) {
          setSelectedSectionId(sectionsData[0].id)
          setSelectedSectionName(sectionsData[0].name)
          console.log(`Set default section: ID=${sectionsData[0].id}, name=${sectionsData[0].name}`)
        }
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      setError("Failed to load sections. Please try again.")
    } finally {
      setLoadingSections(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "teachers"))
      const teachersList: Teacher[] = []

      querySnapshot.forEach((doc) => {
        teachersList.push({
          id: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "",
          phone: doc.data().phone || "",
          qualification: doc.data().qualification || "",
          profileImageUrl: doc.data().profileImageUrl || "",
          roles: doc.data().roles || [],
          assignedClass: doc.data().assignedClass || "",
          active: doc.data().active || true,
        })
      })

      setTeachers(teachersList)
      console.log(`Loaded ${teachersList.length} teachers`)

      // Set default teacher for each period
      if (teachersList.length > 0) {
        setPeriods(
          periods.map((period) => ({
            ...period,
            teacherId: teachersList[0].id,
            teacherName: teachersList[0].name,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching teachers:", error)
      toast({
        title: "Error",
        description: "Failed to load teachers",
        variant: "destructive",
      })
    }
  }

  const handlePeriodChange = (index: number, field: keyof PeriodRow, value: string) => {
    const updatedPeriods = [...periods]

    if (field === "teacherId" && value) {
      const selectedTeacher = teachers.find((t) => t.id === value)
      if (selectedTeacher) {
        updatedPeriods[index] = {
          ...updatedPeriods[index],
          teacherId: value,
          teacherName: selectedTeacher.name,
        }
      }
    } else {
      updatedPeriods[index] = {
        ...updatedPeriods[index],
        [field]: value,
      }
    }

    setPeriods(updatedPeriods)
  }

  const validateForm = () => {
    // Check if class and section are selected
    if (!selectedClassName) {
      toast({
        title: "Missing Information",
        description: "Please select a class",
        variant: "destructive",
      })
      return false
    }

    if (!selectedSectionName) {
      toast({
        title: "Missing Information",
        description: "Please select a section",
        variant: "destructive",
      })
      return false
    }

    // Check tiffin times
    if (!tiffinStartTime || !tiffinEndTime) {
      toast({
        title: "Missing Information",
        description: "Please set times for Tiffin Break",
        variant: "destructive",
      })
      return false
    }

    // Check diary check times
    if (!diaryCheckStartTime || !diaryCheckEndTime) {
      toast({
        title: "Missing Information",
        description: "Please set times for Diary Check",
        variant: "destructive",
      })
      return false
    }

    // Check all periods have times
    for (let i = 0; i < periods.length; i++) {
      if (!periods[i].startTime || !periods[i].endTime) {
        toast({
          title: "Missing Information",
          description: `Please set times for Period ${i + 1}`,
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      console.log(`Creating routines for class: ${selectedClassName}, section: ${selectedSectionName}, day: ${day}`)

      const routines: ClassRoutine[] = []

      // Add regular periods
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i]

        const routine: ClassRoutine = {
          grade: selectedClassName,
          gradeId: selectedClassId,
          section: selectedSectionName,
          sectionId: selectedSectionId,
          day,
          startTime: period.startTime,
          endTime: period.endTime,
          isTiffin: false,
          isDiaryCheck: false,
          subject: period.subject,
          teacherId: period.teacherId,
          teacherName: period.teacherName,
        }

        routines.push(routine)

        // Add tiffin break after the 4th period
        if (i === 3) {
          const tiffinRoutine: ClassRoutine = {
            grade: selectedClassName,
            gradeId: selectedClassId,
            section: selectedSectionName,
            sectionId: selectedSectionId,
            day,
            startTime: tiffinStartTime,
            endTime: tiffinEndTime,
            isTiffin: true,
            isDiaryCheck: false,
          }
          routines.push(tiffinRoutine)
        }
      }

      // Add diary check after the last period
      const diaryCheckRoutine: ClassRoutine = {
        grade: selectedClassName,
        gradeId: selectedClassId,
        section: selectedSectionName,
        sectionId: selectedSectionId,
        day,
        startTime: diaryCheckStartTime,
        endTime: diaryCheckEndTime,
        isTiffin: false,
        isDiaryCheck: true,
      }
      routines.push(diaryCheckRoutine)

      // Save each routine individually
      for (const routine of routines) {
        await addDoc(collection(db, "class_routines"), routine)
      }

      toast({
        title: "Success",
        description: "Class routine saved successfully!",
      })

      router.push("/teacher/class-routine")
    } catch (error) {
      console.error("Error saving routine:", error)
      setError("Failed to save class routine. Please try again.")
      toast({
        title: "Error",
        description: "Failed to save class routine",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
            <h2 className="text-xl font-bold">Permission Denied</h2>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{permissionMessage}</p>
            <Button className="mt-4 w-full" onClick={() => router.push("/teacher/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Image src="/class-routine.png" alt="Class Routine" width={40} height={40} className="mr-2" />
        <h1 className="text-2xl font-bold">Create Class Routine</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="grade">Select Grade</Label>
              {loadingClasses ? (
                <div className="h-10 w-full flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading classes...</span>
                </div>
              ) : (
                <Select
                  value={selectedClassId}
                  onValueChange={(value) => {
                    // Find the class object
                    const classObj = classes.find((c) => c.id === value)
                    if (classObj) {
                      setSelectedClassId(value)
                      setSelectedClassName(classObj.name)
                      console.log(`Selected class: ID=${value}, name=${classObj.name}`)

                      // Reset section when class changes
                      setSelectedSectionId("")
                      setSelectedSectionName("")
                    }
                  }}
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="section">Select Section</Label>
              {loadingSections ? (
                <div className="h-10 w-full flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading sections...</span>
                </div>
              ) : (
                <Select
                  value={selectedSectionId}
                  onValueChange={(value) => {
                    // Find the section object
                    const sectionObj = sections.find((s) => s.id === value)
                    if (sectionObj) {
                      setSelectedSectionId(value)
                      setSelectedSectionName(sectionObj.name)
                      console.log(`Selected section: ID=${value}, name=${sectionObj.name}`)
                    }
                  }}
                  disabled={!selectedClassId || sections.length === 0}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder={sections.length === 0 ? "No sections available" : "Select Section"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="day">Select Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger id="day">
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Periods</h2>
            <div className="space-y-4">
              {periods.map((period, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center mb-2">
                      <h3 className="font-medium">Period {index + 1}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`start-time-${index}`}>Start Time</Label>
                        <Input
                          id={`start-time-${index}`}
                          type="time"
                          value={period.startTime}
                          onChange={(e) => handlePeriodChange(index, "startTime", e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`end-time-${index}`}>End Time</Label>
                        <Input
                          id={`end-time-${index}`}
                          type="time"
                          value={period.endTime}
                          onChange={(e) => handlePeriodChange(index, "endTime", e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`subject-${index}`}>Subject</Label>
                        <Select
                          value={period.subject}
                          onValueChange={(value) => handlePeriodChange(index, "subject", value)}
                        >
                          <SelectTrigger id={`subject-${index}`}>
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`teacher-${index}`}>Teacher</Label>
                        <Select
                          value={period.teacherId}
                          onValueChange={(value) => handlePeriodChange(index, "teacherId", value)}
                        >
                          <SelectTrigger id={`teacher-${index}`}>
                            <SelectValue placeholder="Select Teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Tiffin Break Time</h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tiffin-start">Start Time</Label>
                    <Input
                      id="tiffin-start"
                      type="time"
                      value={tiffinStartTime}
                      onChange={(e) => setTiffinStartTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tiffin-end">End Time</Label>
                    <Input
                      id="tiffin-end"
                      type="time"
                      value={tiffinEndTime}
                      onChange={(e) => setTiffinEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Diary Check Time</h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="diary-start">Start Time</Label>
                    <Input
                      id="diary-start"
                      type="time"
                      value={diaryCheckStartTime}
                      onChange={(e) => setDiaryCheckStartTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="diary-end">End Time</Label>
                    <Input
                      id="diary-end"
                      type="time"
                      value={diaryCheckEndTime}
                      onChange={(e) => setDiaryCheckEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>

        <CardFooter>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Routine"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
