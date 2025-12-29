"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { ClassRoutine } from "@/lib/models/class-routine-models"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusCircle, Pencil, Trash2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { ArrowLeft } from "lucide-react"

export default function ClassRoutinePage() {
  const router = useRouter()
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedGradeId, setSelectedGradeId] = useState("")
  const [selectedGradeName, setSelectedGradeName] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [selectedSectionName, setSelectedSectionName] = useState("")
  const [selectedDay, setSelectedDay] = useState("Sunday")
  const [routines, setRoutines] = useState<ClassRoutine[]>([])
  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([])
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedGrade || selectedGradeId) {
      fetchSections()
    }
  }, [selectedGrade, selectedGradeId])

  useEffect(() => {
    if ((selectedGrade || selectedGradeId) && (selectedSection || selectedSectionId) && selectedDay) {
      fetchRoutines()
    }
  }, [selectedGrade, selectedGradeId, selectedSection, selectedSectionId, selectedDay])

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
        ]
        setClasses(demoClasses)
        setSelectedGradeId(demoClasses[0].id)
        setSelectedGradeName(demoClasses[0].name)
        setSelectedGrade(demoClasses[0].name)
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

        setClasses(classesList)
        if (classesList.length > 0) {
          setSelectedGradeId(classesList[0].id)
          setSelectedGradeName(classesList[0].name)
          setSelectedGrade(classesList[0].name)
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
    if (!selectedGrade && !selectedGradeId) return

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
        setSelectedSectionId(demoSections[0].id)
        setSelectedSectionName(demoSections[0].name)
        setSelectedSection(demoSections[0].name)
      } else {
        // Find the selected class to get its sections
        const selectedClass = classes.find((c) => c.id === selectedGradeId || c.name === selectedGrade)

        if (selectedClass) {
          // Get sections for this class
          const sectionsSnapshot = await getDocs(collection(db, "sections"))
          const sectionsList: { id: string; name: string }[] = []

          sectionsSnapshot.forEach((doc) => {
            sectionsList.push({
              id: doc.id,
              name: doc.data().name || doc.id,
            })
          })

          setSections(sectionsList)
          if (sectionsList.length > 0) {
            setSelectedSectionId(sectionsList[0].id)
            setSelectedSectionName(sectionsList[0].name)
            setSelectedSection(sectionsList[0].name)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      setError("Failed to load sections. Please try again.")
    } finally {
      setLoadingSections(false)
    }
  }

  const fetchRoutines = async () => {
    if ((!selectedGrade && !selectedGradeId) || (!selectedSection && !selectedSectionId) || !selectedDay) return

    setLoading(true)
    setError(null)
    try {
      // Get the actual grade value to use in the query
      let gradeValue = selectedGradeName || selectedGrade

      // If we're using class IDs, find the corresponding class name
      if (selectedGradeId && !selectedGradeName) {
        const classObj = classes.find((c) => c.id === selectedGradeId)
        if (classObj) {
          gradeValue = classObj.name
          console.log(`Using class name "${gradeValue}" from class ID "${selectedGradeId}" for query`)
        }
      }

      // Get the section name if we have a section ID
      let sectionValue = selectedSectionName || selectedSection
      if (selectedSectionId && !selectedSectionName) {
        const sectionObj = sections.find((s) => s.id === selectedSectionId)
        if (sectionObj) {
          sectionValue = sectionObj.name
          console.log(`Using section name "${sectionValue}" from section ID "${selectedSectionId}" for query`)
        }
      }

      console.log(`Fetching routines for grade: ${gradeValue}, section: ${sectionValue}, day: ${selectedDay}`)

      // First try with section
      let routineQuery

      if (sectionValue && sectionValue !== "all") {
        // Filter by grade, section, and day
        routineQuery = query(
          collection(db, "class_routines"),
          where("grade", "==", gradeValue),
          where("section", "==", sectionValue),
          where("day", "==", selectedDay),
        )
        console.log(`Querying with grade="${gradeValue}", section="${sectionValue}", day="${selectedDay}"`)
      } else {
        // Filter by grade and day only
        routineQuery = query(
          collection(db, "class_routines"),
          where("grade", "==", gradeValue),
          where("day", "==", selectedDay),
        )
        console.log(`Querying with grade="${gradeValue}", day="${selectedDay}" (no section filter)`)
      }

      const querySnapshot = await getDocs(routineQuery)
      const routineData: ClassRoutine[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data() as ClassRoutine
        routineData.push({
          id: doc.id,
          ...data,
          // Ensure section is defined for filtering
          section: data.section || "",
        })
      })

      console.log(`Found ${routineData.length} routines`)

      // Filter routines by section if needed
      let filteredRoutines = routineData
      if (sectionValue && sectionValue !== "all") {
        // Keep only routines with matching section or no section
        filteredRoutines = routineData.filter((routine) => routine.section === sectionValue || !routine.section)
        console.log(`Filtered to ${filteredRoutines.length} routines for section ${sectionValue}`)
      }

      // Sort routines by start time
      filteredRoutines.sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0
        return a.startTime.localeCompare(b.startTime)
      })

      setRoutines(filteredRoutines)
    } catch (error) {
      console.error("Error fetching routines:", error)
      setError("Failed to load routines. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const deleteRoutine = async (routineId: string) => {
    if (!routineId) return

    // Confirm deletion
    if (!confirm("Are you sure you want to delete this routine?")) {
      return
    }

    setDeleting(routineId)

    try {
      // Delete the routine document
      await deleteDoc(doc(db, "class_routines", routineId))
      console.log(`Deleted routine: ${routineId}`)

      // Remove the deleted routine from the state
      setRoutines(routines.filter((r) => r.id !== routineId))

      // Show success message
      alert("Routine deleted successfully")
    } catch (error) {
      console.error("Error deleting routine:", error)
      alert("Failed to delete routine. Please try again.")
    } finally {
      setDeleting(null)
    }
  }

  const editRoutine = (routineId: string) => {
    if (!routineId) return

    // Navigate to edit page with routine ID
    router.push(`/teacher/edit-class-routine?id=${routineId}`)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Image src="/class-routine.png" alt="Class Routine" width={40} height={40} className="mr-2" />
            <h1 className="text-2xl font-bold">Class Routine</h1>
          </div>
          <Button onClick={() => router.push("/teacher/add-class-routine")} className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Routine
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-1/2 lg:w-1/3">
              <label className="block text-sm font-medium mb-1">Select Grade</label>
              {loadingClasses ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedGradeId || selectedGrade}
                  onValueChange={(value) => {
                    console.log("Grade selected:", value)

                    // Find the class object
                    const classObj = classes.find((c) => c.id === value || c.name === value)

                    if (classObj) {
                      if (classObj.id === value) {
                        // We selected by ID
                        setSelectedGradeId(value)
                        setSelectedGradeName(classObj.name)
                        setSelectedGrade("")
                        console.log(`Set grade ID: ${value}, grade name: ${classObj.name}`)
                      } else {
                        // We selected by name
                        setSelectedGrade(value)
                        setSelectedGradeId("")
                        setSelectedGradeName("")
                        console.log(`Set grade name: ${value}`)
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id || classItem.name}>
                        {classItem.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="w-full md:w-1/2 lg:w-1/3">
              <label className="block text-sm font-medium mb-1">Select Section</label>
              {loadingSections ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedSectionId || selectedSection}
                  onValueChange={(value) => {
                    console.log("Section selected:", value)

                    // Find the section object
                    const sectionObj = sections.find((s) => s.id === value || s.name === value)

                    if (sectionObj) {
                      if (sectionObj.id === value) {
                        // We selected by ID
                        setSelectedSectionId(value)
                        setSelectedSectionName(sectionObj.name)
                        setSelectedSection("")
                        console.log(`Set section ID: ${value}, section name: ${sectionObj.name}`)
                      } else {
                        // We selected by name
                        setSelectedSection(value)
                        setSelectedSectionId("")
                        setSelectedSectionName("")
                        console.log(`Set section name: ${value}`)
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id || section.name}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
              {days.map((day) => (
                <TabsTrigger key={day} value={day}>
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {days.map((day) => (
              <TabsContent key={day} value={day}>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : routines.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No routine found for{" "}
                      {classes.find((c) => c.id === selectedGradeId || c.name === selectedGrade)?.displayName ||
                        selectedGrade}
                      {selectedSection || selectedSectionName
                        ? ` Section ${selectedSection || selectedSectionName}`
                        : ""}{" "}
                      on {selectedDay}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => router.push("/teacher/add-class-routine")}
                    >
                      Create Routine
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {routines.map((routine, index) => (
                      <Card
                        key={routine.id || index}
                        className={`
                        ${routine.isTiffin ? "bg-yellow-50 border-yellow-200" : ""}
                        ${routine.isDiaryCheck ? "bg-blue-50 border-blue-200" : ""}
                      `}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {routine.isTiffin
                                    ? "Tiffin Break"
                                    : routine.isDiaryCheck
                                      ? "Diary Check"
                                      : routine.subject}
                                </p>
                                {routine.section && (
                                  <Badge variant="outline" className="text-xs">
                                    Section {routine.section}
                                  </Badge>
                                )}
                              </div>
                              {!routine.isTiffin && !routine.isDiaryCheck && (
                                <p className="text-sm text-gray-500">
                                  Teacher: {routine.teacherName || "Not assigned"}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="font-medium">
                                  {routine.startTime} - {routine.endTime}
                                </p>
                              </div>
                              {routine.id && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editRoutine(routine.id || "")}
                                    className="px-2"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteRoutine(routine.id || "")}
                                    disabled={deleting === routine.id}
                                    className="px-2"
                                  >
                                    {deleting === routine.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
