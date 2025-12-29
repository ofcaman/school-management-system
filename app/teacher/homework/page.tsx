"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import type { Homework } from "@/lib/models/homework-models"
import {
  ArrowLeft,
  Book,
  Calendar,
  Clock,
  Download,
  FileText,
  Plus,
  Layers,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Default data for fallback
const DEFAULT_GRADES = ["10", "9", "8"]
const DEFAULT_SECTIONS = ["A", "B", "C", "D"]

export default function HomeworkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  // Main states
  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [allHomeworks, setAllHomeworks] = useState<Homework[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Filter states
  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [sections, setSections] = useState<string[]>([])
  const [loadingSections, setLoadingSections] = useState(false)
  const [selectedSection, setSelectedSection] = useState<string>("")

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/dashboard")
      return
    }

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (permissionChecking) {
        setPermissionChecking(false)
        setPermissionMessage("Loading timed out. Please refresh the page.")
      }
    }, 10000) // 10 seconds timeout

    checkPermission()
    fetchClasses()
    fetchSections()

    // Cleanup
    return () => clearTimeout(timeoutId)
  }, [teacherId, router])

  useEffect(() => {
    if (selectedGrade) {
      fetchSections()
    }
  }, [selectedGrade])

  useEffect(() => {
    if (hasPermission && currentTeacher) {
      console.log("Loading all homework data")
      loadAllHomeworks(currentTeacher)
    }
  }, [hasPermission, currentTeacher])

  useEffect(() => {
    // Add event listener for page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && hasPermission && currentTeacher) {
        console.log("Page became visible, refreshing homework data")
        loadAllHomeworks(currentTeacher)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [hasPermission, currentTeacher])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo classes
        const demoClasses = [
          { id: "pg", name: "pg", displayName: "Class P.G." },
          { id: "nursery", name: "nursery", displayName: "Class Nursery" },
          { id: "lkg", name: "lkg", displayName: "Class LKG" },
          { id: "ukg", name: "ukg", displayName: "Class UKG" },
          ...Array.from({ length: 12 }, (_, i) => {
            const grade = (i + 1).toString()
            return { id: grade, name: grade, displayName: `Grade ${grade}` }
          }),
        ]
        setClasses(demoClasses)
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

        // Sort classes in logical order
        classesData.sort((a, b) => {
          const order = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
          const aIndex = order.indexOf(a.name.toLowerCase())
          const bIndex = order.indexOf(b.name.toLowerCase())
          return aIndex - bIndex
        })

        setClasses(classesData)

        // If no classes were found, use default classes
        if (classesData.length === 0) {
          const defaultClasses = [
            { id: "pg", name: "pg", displayName: "Class P.G." },
            { id: "nursery", name: "nursery", displayName: "Class Nursery" },
            { id: "lkg", name: "lkg", displayName: "Class LKG" },
            { id: "ukg", name: "ukg", displayName: "Class UKG" },
            ...Array.from({ length: 12 }, (_, i) => {
              const grade = (i + 1).toString()
              return { id: grade, name: grade, displayName: `Grade ${grade}` }
            }),
          ]
          setClasses(defaultClasses)
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      // Fallback to default classes
      const defaultClasses = [
        { id: "pg", name: "pg", displayName: "Class P.G." },
        { id: "nursery", name: "nursery", displayName: "Class Nursery" },
        { id: "lkg", name: "lkg", displayName: "Class LKG" },
        { id: "ukg", name: "ukg", displayName: "Class UKG" },
        ...Array.from({ length: 12 }, (_, i) => {
          const grade = (i + 1).toString()
          return { id: grade, name: grade, displayName: `Grade ${grade}` }
        }),
      ]
      setClasses(defaultClasses)
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async () => {
    setLoadingSections(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo sections
        const demoSections = ["A", "B", "C", "D"]
        setSections(demoSections)
        setLoadingSections(false)
        return
      }

      // Query the sections collection directly
      const sectionsQuery = query(collection(db, "sections"))
      const sectionsSnapshot = await getDocs(sectionsQuery)

      if (!sectionsSnapshot.empty) {
        const sectionsList: string[] = []

        sectionsSnapshot.forEach((doc) => {
          const sectionData = doc.data()
          if (sectionData.name) {
            sectionsList.push(sectionData.name)
          }
        })

        console.log("Fetched sections from collection:", sectionsList)

        if (sectionsList.length > 0) {
          // Sort sections alphabetically
          sectionsList.sort()
          setSections(sectionsList)
          setLoadingSections(false)
          return
        }
      }

      // If we get here, we didn't find valid sections
      console.log("No valid sections found in collection, using defaults")
      setSections(DEFAULT_SECTIONS)
    } catch (error) {
      console.error("Error fetching sections:", error)
      // Fallback to default sections
      setSections(DEFAULT_SECTIONS)
    } finally {
      setLoadingSections(false)
    }
  }

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
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
        setSelectedGrade("10")
        setSelectedSection("A")
        loadDemoHomeworks()
        setPermissionChecking(false)
        return
      }

      const user = auth.currentUser

      if (!user) {
        // Check if we have a teacher ID in localStorage
        const storedTeacherId = localStorage.getItem("teacherId")

        if (storedTeacherId) {
          await checkTeacherPermission(storedTeacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to access homework")
          setPermissionChecking(false)
          router.push("/teacher/login")
        }
      } else {
        // Get the teacher document for the current user
        const teacherDoc = await getDoc(doc(db, "teachers", teacherId!))

        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data() as Teacher
          teacherData.id = teacherDoc.id
          setCurrentTeacher(teacherData)
          setHasPermission(true)

          // If teacher is a class teacher, set their assigned class and section as default
          if (teacherData.assignedClass) {
            setSelectedGrade(teacherData.assignedClass)
          }
          if (teacherData.assignedSection) {
            setSelectedSection(teacherData.assignedSection)
          }
        } else {
          setHasPermission(false)
          setPermissionMessage("Teacher not found")
        }
      }
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
    }
  }

  const checkTeacherPermission = async (teacherId: string) => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)
        setHasPermission(true)

        // If teacher is a class teacher, set their assigned class and section as default
        if (teacherData.assignedClass) {
          setSelectedGrade(teacherData.assignedClass)
        }
        if (teacherData.assignedSection) {
          setSelectedSection(teacherData.assignedSection)
        }
      } else {
        setHasPermission(false)
        setPermissionMessage("Teacher account not found")
      }
    } catch (error: any) {
      console.error("Error checking teacher permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    }
  }

  const loadDemoHomeworks = () => {
    // Create demo homeworks
    const demoHomeworks: Homework[] = [
      {
        id: "hw1",
        grade: "10",
        section: "A",
        subject: "Mathematics",
        title: "Algebra Practice",
        description: "Complete exercises 1-10 on page 45 of the textbook.",
        timestamp: new Date(2025, 3, 15), // April 15, 2025
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
        fileUrl: "https://example.com/math_homework.pdf",
        fileName: "math_homework.pdf",
      },
      {
        id: "hw2",
        grade: "10",
        section: "B",
        subject: "Science",
        title: "Chemistry Lab Report",
        description: "Write a lab report on the experiment we conducted in class.",
        timestamp: new Date(2025, 3, 18), // April 18, 2025
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
      },
      {
        id: "hw3",
        grade: "9",
        section: "A",
        subject: "English",
        title: "Essay Writing",
        description: "Write a 500-word essay on the topic 'My Future Goals'.",
        timestamp: new Date(2025, 3, 20), // April 20, 2025
        teacherId: "teacher1",
        teacherName: "JOHN DOE",
      },
      {
        id: "hw4",
        grade: "10",
        section: "C",
        subject: "Social Studies",
        title: "History Project",
        description: "Research and create a presentation on a historical event of your choice.",
        timestamp: new Date(2025, 3, 17), // April 17, 2025
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
      },
      // Add a nursery class homework for testing
      {
        id: "hw5",
        grade: "nursery",
        section: "A",
        subject: "Drawing",
        title: "Color the Animals",
        description: "Color the animal pictures in your workbook.",
        timestamp: new Date(2025, 3, 16), // April 16, 2025
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
      },
    ]

    setAllHomeworks(demoHomeworks)
    setLoading(false)
  }

  const loadAllHomeworks = async (teacherData: Teacher) => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      console.log("Loading all homework data")
      let homeworkQuery

      // If teacher is a principal or computer teacher, they can see all homeworks
      if (teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")) {
        homeworkQuery = query(collection(db, "homework"), orderBy("timestamp", "desc"), limit(100))
      } else {
        // For regular teachers, only show their homeworks
        homeworkQuery = query(
          collection(db, "homework"),
          where("teacherId", "==", teacherData.id),
          orderBy("timestamp", "desc"),
          limit(100),
        )
      }

      console.log("Executing homework query...")
      const querySnapshot = await getDocs(homeworkQuery)
      console.log(`Found ${querySnapshot.size} homework documents`)

      const homeworkList: Homework[] = []
      const debugData: any[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()

        // Store raw data for debugging
        debugData.push({
          id: doc.id,
          grade: data.grade,
          section: data.section,
          title: data.title,
          rawData: JSON.stringify(data),
        })

        const homework: Homework = {
          id: doc.id,
          grade: data.grade?.toString().trim() || "",
          section: data.section?.toString().trim() || "",
          subject: data.subject,
          title: data.title,
          description: data.description,
          teacherId: data.teacherId,
          teacherName: data.teacherName,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          timestamp: data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date(),
        }

        console.log(
          "Processing homework:",
          doc.id,
          homework.title,
          "grade:",
          homework.grade,
          "section:",
          homework.section,
        )
        homeworkList.push(homework)
      })

      console.log(`Loaded ${homeworkList.length} homework assignments`)
      setAllHomeworks(homeworkList)

      // Set debug info
      // Debug info is not set by default
    } catch (error: any) {
      console.error("Error loading homeworks:", error)
      setError(`Error loading homework: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddHomework = () => {
    router.push(`/teacher/add-homework?id=${currentTeacher?.id}`)
  }

  const filterHomeworks = () => {
    console.log(
      "Filtering homeworks - activeTab:",
      activeTab,
      "selectedGrade:",
      selectedGrade,
      "selectedSection:",
      selectedSection,
    )

    // First apply teacher filter if on "my" tab
    let filtered = [...allHomeworks]

    if (activeTab === "my") {
      filtered = filtered.filter((hw) => hw.teacherId === currentTeacher?.id)
    } else if (activeTab !== "all") {
      // Filter by grade tab
      filtered = filtered.filter((hw) => {
        const hwGrade = hw.grade?.toString().toLowerCase() || ""
        const tabGrade = activeTab.toLowerCase()
        return hwGrade === tabGrade
      })
    }

    // Then apply grade filter if selected
    if (selectedGrade && selectedGrade !== "all") {
      const targetGrade = selectedGrade.toLowerCase()
      filtered = filtered.filter((hw) => {
        const hwGrade = hw.grade?.toString().toLowerCase() || ""
        const match = hwGrade === targetGrade
        if (!match) {
          console.log(`Grade mismatch: homework grade="${hwGrade}" vs selected="${targetGrade}"`)
        }
        return match
      })
    }

    // Then apply section filter if selected
    if (selectedSection && selectedSection !== "all") {
      const targetSection = selectedSection.toLowerCase()
      filtered = filtered.filter((hw) => {
        const hwSection = hw.section?.toString().toLowerCase() || ""
        const match = hwSection === targetSection
        if (!match) {
          console.log(`Section mismatch: homework section="${hwSection}" vs selected="${targetSection}"`)
        }
        return match
      })
    }

    console.log(`Filtered to ${filtered.length} homework assignments`)
    return filtered
  }

  const getUniqueGrades = () => {
    const grades = new Set<string>()
    allHomeworks.forEach((hw) => {
      if (hw.grade) {
        grades.add(hw.grade.toString())
      }
    })
    return Array.from(grades).sort()
  }

  const handleRefresh = () => {
    if (currentTeacher) {
      loadAllHomeworks(currentTeacher)
    }
  }

  const toggleDebugInfo = () => {
    if (debugInfo) {
      setDebugInfo(null)
    } else {
      // Generate debug info if not already available
      const debugData = allHomeworks.map((hw) => ({
        id: hw.id,
        grade: hw.grade,
        section: hw.section,
        title: hw.title,
      }))
      setDebugInfo(JSON.stringify(debugData, null, 2))
    }
  }

  if (permissionChecking) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Permission Denied</CardTitle>
            <CardDescription>{permissionMessage}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push("/teacher/dashboard?id=" + currentTeacher?.id)}>
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const filteredHomeworks = filterHomeworks()
  const uniqueGrades = getUniqueGrades()

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Homework Management</h1>
        </div>
        <Button onClick={handleAddHomework}>
          <Plus className="h-4 w-4 mr-2" />
          Add Homework
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {debugInfo && (
        <Alert className="mb-6 overflow-auto max-h-60">
          <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription>
            <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter by grade and section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filter-grade">Filter by Class/Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade} disabled={loadingClasses}>
                <SelectTrigger id="filter-grade">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.name}>
                      {cls.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-section">Filter by Section</Label>
              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
                disabled={!selectedGrade || loadingSections}
              >
                <SelectTrigger id="filter-section">
                  {loadingSections ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="All Sections" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="all">All Homework</TabsTrigger>
          <TabsTrigger value="my">My Assignments</TabsTrigger>
          {uniqueGrades.map((grade) => (
            <TabsTrigger key={grade} value={grade}>
              Grade {grade}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredHomeworks.length > 0 ? (
            <div className="space-y-4">
              {filteredHomeworks.map((homework) => (
                <Card key={homework.id}>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div>
                        <CardTitle className="text-xl">{homework.title}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="flex items-center">
                            <Book className="h-4 w-4 mr-1" />
                            {homework.subject}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Grade {homework.grade}
                          </span>
                          <span className="flex items-center">
                            <Layers className="h-4 w-4 mr-1" />
                            Section {homework.section || "All"}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {homework.timestamp ? format(homework.timestamp, "PPP") : "Date not available"}
                          </span>
                        </CardDescription>
                      </div>
                      {homework.fileUrl && (
                        <a
                          href={homework.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-primary hover:underline"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {homework.fileName || "Download Attachment"}
                        </a>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line">{homework.description}</p>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">Assigned by: {homework.teacherName}</CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No homework assignments found</p>
                <Button className="mt-4" onClick={handleAddHomework}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Homework
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
