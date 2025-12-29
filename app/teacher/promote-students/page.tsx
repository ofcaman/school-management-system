"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { Loader2, ArrowLeft, Search, ArrowUpCircle, ArrowUp, CheckCircle2, AlertCircle } from "lucide-react"
import type { Teacher, Student } from "@/lib/models"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function PromoteStudentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)

  // Classes and sections state
  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [sections, setSections] = useState<string[]>(["A", "B", "C", "D"])
  const [loadingSections, setLoadingSections] = useState(false)

  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [promotionType, setPromotionType] = useState<"single" | "double">("single")
  const [isPromoting, setIsPromoting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [promotionResults, setPromotionResults] = useState<{
    success: number
    failed: number
    details: Array<{ id: string; name: string; success: boolean; message: string }>
  }>({
    success: 0,
    failed: 0,
    details: [],
  })

  useEffect(() => {
    checkPermission()
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedGrade) {
      fetchSections()
    }
  }, [selectedGrade])

  useEffect(() => {
    if (selectedGrade && selectedSection) {
      loadStudents()
    }
  }, [selectedGrade, selectedSection])

  useEffect(() => {
    filterStudents()
  }, [students, searchQuery])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo classes
        const demoClasses = [
          { id: "pg", name: "P.G", displayName: "Class P.G." },
          { id: "nursery", name: "Nursery", displayName: "Class Nursery" },
          { id: "lkg", name: "LKG", displayName: "Class LKG" },
          { id: "ukg", name: "UKG", displayName: "Class UKG" },
          ...Array.from({ length: 6 }, (_, i) => {
            const grade = (i + 1).toString()
            return { id: grade, name: grade, displayName: `Grade ${grade}` }
          }),
        ]
        setClasses(demoClasses)
        console.log("Demo classes loaded:", demoClasses)
      } else {
        // Fetch classes from Firestore
        const classesRef = collection(db, "classes")
        const querySnapshot = await getDocs(classesRef)

        const classesData: { id: string; name: string; displayName: string }[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          classesData.push({
            id: doc.id,
            name: data.name,
            displayName: data.displayName || `Class ${data.name}`,
          })
        })

        // Sort classes in logical order
        classesData.sort((a, b) => {
          const order = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
          return order.indexOf(a.name) - order.indexOf(b.name)
        })

        setClasses(classesData)
        console.log("Firestore classes loaded:", classesData)

        // If no classes were found, use default classes
        if (classesData.length === 0) {
          const defaultClasses = [
            { id: "pg", name: "P.G", displayName: "Class P.G." },
            { id: "nursery", name: "Nursery", displayName: "Class Nursery" },
            { id: "lkg", name: "LKG", displayName: "Class LKG" },
            { id: "ukg", name: "UKG", displayName: "Class UKG" },
            ...Array.from({ length: 6 }, (_, i) => {
              const grade = (i + 1).toString()
              return { id: grade, name: grade, displayName: `Grade ${grade}` }
            }),
          ]
          setClasses(defaultClasses)
          console.log("Using default classes:", defaultClasses)
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      // Fallback to default classes
      const defaultClasses = [
        { id: "pg", name: "P.G", displayName: "Class P.G." },
        { id: "nursery", name: "Nursery", displayName: "Class Nursery" },
        { id: "lkg", name: "LKG", displayName: "Class LKG" },
        { id: "ukg", name: "UKG", displayName: "Class UKG" },
        ...Array.from({ length: 6 }, (_, i) => {
          const grade = (i + 1).toString()
          return { id: grade, name: grade, displayName: `Grade ${grade}` }
        }),
      ]
      setClasses(defaultClasses)
      console.log("Error fallback to default classes:", defaultClasses)
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async () => {
    if (!selectedGrade) return

    setLoadingSections(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo sections
        const demoSections = ["A", "B", "C", "D"]
        setSections(demoSections)
        console.log("Demo sections loaded:", demoSections)
      } else {
        // Find the class document
        const classQuery = query(collection(db, "classes"), where("name", "==", selectedGrade))
        const classSnapshot = await getDocs(classQuery)

        if (!classSnapshot.empty) {
          const classDoc = classSnapshot.docs[0]
          const classData = classDoc.data()

          if (classData.sections && Array.isArray(classData.sections) && classData.sections.length > 0) {
            // Ensure sections are simple strings like "A", "B", etc.
            // If they're objects or complex values, extract just the section name or use default
            const processedSections = classData.sections.map((section: any) => {
              if (typeof section === "string") {
                // If it's already a simple string but looks like an ID, use a default
                if (section.length > 10) {
                  return String.fromCharCode(65 + classData.sections.indexOf(section)) // A, B, C, etc.
                }
                return section
              }
              // If it's an object, try to get the name property
              if (section && typeof section === "object" && section.name) {
                return section.name
              }
              // Fallback to index-based section name
              return String.fromCharCode(65 + classData.sections.indexOf(section)) // A, B, C, etc.
            })

            setSections(processedSections)
            console.log("Processed sections:", processedSections)
          } else {
            // Default sections if none defined
            const defaultSections = ["A", "B", "C", "D"]
            setSections(defaultSections)
            console.log("No sections found, using defaults:", defaultSections)
          }
        } else {
          // Default sections if class not found
          const defaultSections = ["A", "B", "C", "D"]
          setSections(defaultSections)
          console.log("Class not found, using default sections:", defaultSections)
        }
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      // Fallback to default sections
      const defaultSections = ["A", "B", "C", "D"]
      setSections(defaultSections)
      console.log("Error fallback to default sections:", defaultSections)
    } finally {
      setLoadingSections(false)
    }
  }

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

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
          assignedSection: "A",
          active: true,
        })
        setHasPermission(true)
        setPermissionChecking(false)
        return
      }

      const user = auth.currentUser

      if (!user) {
        // Check if we have a teacher ID in localStorage
        const teacherId = localStorage.getItem("teacherId")

        if (teacherId) {
          await checkTeacherPermission(teacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to promote students")
          router.push("/teacher/login")
        }
      } else {
        // Get the teacher document for the current user
        const teachersRef = collection(db, "teachers")
        const q = query(teachersRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const teacherId = querySnapshot.docs[0].id
          await checkTeacherPermission(teacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Teacher not found in database")
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

        if (teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")) {
          setHasPermission(true)
        } else {
          setHasPermission(false)
          setPermissionMessage("Only principal or computer teacher can promote students")
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

  const loadStudents = async () => {
    if (!selectedGrade || !selectedSection) return

    console.log(`Loading students for grade: ${selectedGrade}, section: ${selectedSection}`)
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Generate demo students
        const demoStudents: Student[] = Array.from({ length: 15 }, (_, i) => {
          const rollNumber = `${i + 1}`.padStart(2, "0")
          const firstName = [
            "Aarav",
            "Arjun",
            "Divya",
            "Kavya",
            "Rahul",
            "Priya",
            "Neha",
            "Vikram",
            "Sanjay",
            "Ananya",
          ][i % 10]
          const lastName = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Joshi", "Yadav", "Verma", "Mishra", "Reddy"][
            i % 10
          ]

          return {
            id: `student${i + 1}`,
            firstName,
            middleName: "",
            lastName,
            name: `${firstName} ${lastName}`,
            fatherName: `${["Raj", "Suresh", "Anil", "Vijay", "Sanjay"][i % 5]} ${lastName}`,
            motherName: `${["Meena", "Sunita", "Anita", "Pooja", "Rekha"][i % 5]} ${lastName}`,
            contactNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
            dob: "2010-01-01",
            rollNumber,
            grade: selectedGrade,
            section: selectedSection,
            symbolNumber: `SYM${i + 100}`,
            address: "Kathmandu, Nepal",
            usesBus: i % 3 === 0,
            busRoute: i % 3 === 0 ? "Route A" : "",
            resultPdfUrl: "",
            subjects: [],
            totalMarks: 0,
            percentage: 0.0,
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
            profilePictureUrl: "",
            transportationFee: i % 3 === 0 ? 500 : 0,
          }
        })

        setStudents(demoStudents)
        console.log("Demo students loaded:", demoStudents.length)
      } else {
        // Load real data from Firebase
        const studentsRef = collection(db, "students")
        const q = query(studentsRef, where("grade", "==", selectedGrade), where("section", "==", selectedSection))
        const querySnapshot = await getDocs(q)

        const studentsList: Student[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Student
          studentsList.push({
            ...data,
            id: doc.id,
          })
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(studentsList)
        console.log("Firestore students loaded:", studentsList.length)
      }
    } catch (error: any) {
      console.error("Error loading students:", error)
      toast({
        title: "Error",
        description: "Failed to load students. Please try again.",
        variant: "destructive",
      })
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

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId)
      } else {
        return [...prev, studentId]
      }
    })
  }

  const handleSelectAll = () => {
    const newSelectAll = !selectAll
    setSelectAll(newSelectAll)

    if (newSelectAll) {
      setSelectedStudents(filteredStudents.map((student) => student.id))
    } else {
      setSelectedStudents([])
    }
  }

  const getNextGrade = (currentGrade: string, doublePromotion = false): string => {
    const classNames = classes.map((c) => c.name)
    const gradeIndex = classNames.indexOf(currentGrade)

    if (gradeIndex === -1 || gradeIndex >= classNames.length - 1) {
      // If current grade is not found or is the highest grade
      return ""
    }

    // For double promotion, skip one grade
    const nextIndex = doublePromotion ? gradeIndex + 2 : gradeIndex + 1

    // Check if next index is valid
    if (nextIndex >= classNames.length) {
      return ""
    }

    return classNames[nextIndex]
  }

  const getDefaultMonthlyFee = (grade: string): number => {
    switch (grade) {
      case "P.G":
      case "Nursery":
        return 1200
      case "LKG":
        return 1300
      case "UKG":
        return 1400
      default:
        const classNumber = Number.parseInt(grade)
        if (!isNaN(classNumber) && classNumber >= 1) {
          return 1500 + (classNumber - 1) * 100
        }
        return 0
    }
  }

  const promoteStudents = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to promote.",
        variant: "destructive",
      })
      return
    }

    setIsPromoting(true)
    const results = {
      success: 0,
      failed: 0,
      details: [] as Array<{ id: string; name: string; success: boolean; message: string }>,
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Simulate promotion in demo mode
        const selectedStudentsList = students.filter((student) => selectedStudents.includes(student.id))

        for (const student of selectedStudentsList) {
          const nextGrade = getNextGrade(student.grade, promotionType === "double")

          if (!nextGrade) {
            results.failed++
            results.details.push({
              id: student.id,
              name: student.name,
              success: false,
              message: "No higher grade available for promotion",
            })
            continue
          }

          // Simulate successful promotion
          results.success++
          results.details.push({
            id: student.id,
            name: student.name,
            success: true,
            message: `Promoted from ${classes.find((c) => c.name === student.grade)?.displayName || student.grade} Section ${student.section} to ${classes.find((c) => c.name === nextGrade)?.displayName || nextGrade} Section ${student.section}`,
          })
        }
      } else {
        // Real promotion using Firebase
        const batch = writeBatch(db)
        const selectedStudentsList = students.filter((student) => selectedStudents.includes(student.id))

        for (const student of selectedStudentsList) {
          const nextGrade = getNextGrade(student.grade, promotionType === "double")

          if (!nextGrade) {
            results.failed++
            results.details.push({
              id: student.id,
              name: student.name,
              success: false,
              message: "No higher grade available for promotion",
            })
            continue
          }

          // Get monthly fee for the next grade
          let monthlyFee = getDefaultMonthlyFee(nextGrade)

          try {
            const feeDoc = await getDoc(doc(db, "fees", nextGrade))
            if (feeDoc.exists() && feeDoc.data().monthlyFee) {
              monthlyFee = feeDoc.data().monthlyFee
            }
          } catch (error) {
            console.warn(`No fee set for ${nextGrade}. Using default fee.`)
          }

          // Update student document
          const studentRef = doc(db, "students", student.id)
          batch.update(studentRef, {
            grade: nextGrade,
            monthlyFee: monthlyFee,
            // Keep the same section
            section: student.section,
          })

          results.success++
          results.details.push({
            id: student.id,
            name: student.name,
            success: true,
            message: `Promoted from ${classes.find((c) => c.name === student.grade)?.displayName || student.grade} Section ${student.section} to ${classes.find((c) => c.name === nextGrade)?.displayName || nextGrade} Section ${student.section}`,
          })
        }

        // Commit the batch
        await batch.commit()
      }

      // Show results
      setPromotionResults(results)
      setShowResults(true)

      // Reload students after promotion
      if (!isDemoMode) {
        await loadStudents()
      }

      toast({
        title: "Promotion Complete",
        description: `Successfully promoted ${results.success} students. Failed: ${results.failed}`,
        variant: results.failed > 0 ? "default" : "default",
      })
    } catch (error: any) {
      console.error("Error promoting students:", error)
      toast({
        title: "Error",
        description: `Failed to promote students: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsPromoting(false)
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

  // Force default classes if none are loaded
  if (classes.length === 0 && !loadingClasses) {
    const defaultClasses = [
      { id: "pg", name: "P.G", displayName: "Class P.G." },
      { id: "nursery", name: "Nursery", displayName: "Class Nursery" },
      { id: "lkg", name: "LKG", displayName: "Class LKG" },
      { id: "ukg", name: "UKG", displayName: "Class UKG" },
      ...Array.from({ length: 6 }, (_, i) => {
        const grade = (i + 1).toString()
        return { id: grade, name: grade, displayName: `Grade ${grade}` }
      }),
    ]
    setClasses(defaultClasses)
    console.log("Forced default classes:", defaultClasses)
  }

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Promote Students</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Current Grade</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingClasses ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedGrade}
                onValueChange={(value) => {
                  console.log("Grade selected:", value)
                  setSelectedGrade(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.name}>
                      {cls.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Section</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSections ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedSection}
                onValueChange={(value) => {
                  console.log("Section selected:", value)
                  setSelectedSection(value)
                }}
                disabled={!selectedGrade || sections.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name or Roll Number"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="mb-6">
        <TabsList>
          <TabsTrigger value="list">Student List</TabsTrigger>
          <TabsTrigger value="results" disabled={!showResults}>
            Promotion Results
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>
                  {selectedGrade && selectedSection
                    ? `Students in ${classes.find((c) => c.name === selectedGrade)?.displayName || selectedGrade} Section ${selectedSection}`
                    : "Select Grade and Section"}
                </span>
                <div className="flex items-center space-x-2">
                  <Checkbox id="selectAll" checked={selectAll} onCheckedChange={handleSelectAll} />
                  <label htmlFor="selectAll" className="text-sm font-normal">
                    Select All
                  </label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <div className="grid grid-cols-12 p-2 font-medium border-b bg-muted">
                  <div className="col-span-1"></div>
                  <div className="col-span-1">Roll</div>
                  <div className="col-span-4">Name</div>
                  <div className="col-span-3">Father's Name</div>
                  <div className="col-span-3">Current Grade</div>
                </div>
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Loading students...</p>
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div key={student.id} className="grid grid-cols-12 p-2 items-center">
                        <div className="col-span-1">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                          />
                        </div>
                        <div className="col-span-1">{student.rollNumber}</div>
                        <div className="col-span-4">{student.name}</div>
                        <div className="col-span-3">{student.fatherName}</div>
                        <div className="col-span-3">
                          {classes.find((c) => c.name === student.grade)?.displayName || student.grade}{" "}
                          {student.section && `Section ${student.section}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {!selectedGrade || !selectedSection
                        ? "Please select a grade and section."
                        : students.length === 0
                          ? "No students found in this grade and section."
                          : "No students match your search criteria."}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Promotion Options</CardTitle>
              <CardDescription>Select how you want to promote the selected students</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={promotionType}
                onValueChange={(value) => setPromotionType(value as "single" | "double")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="flex items-center">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Regular Promotion (One Grade)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="double" id="double" />
                  <Label htmlFor="double" className="flex items-center">
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Double Promotion (Two Grades)
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
            <CardFooter>
              <Button
                onClick={promoteStudents}
                disabled={selectedStudents.length === 0 || isPromoting}
                className="w-full"
              >
                {isPromoting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Promoting...
                  </>
                ) : (
                  <>
                    Promote {selectedStudents.length} Student{selectedStudents.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {selectedStudents.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Promotion Preview</AlertTitle>
              <AlertDescription>
                {promotionType === "single" ? (
                  <p>
                    Selected students will be promoted from{" "}
                    {classes.find((c) => c.name === selectedGrade)?.displayName || selectedGrade} Section{" "}
                    {selectedSection} to{" "}
                    <strong>
                      {classes.find((c) => c.name === getNextGrade(selectedGrade))?.displayName ||
                        getNextGrade(selectedGrade)}
                    </strong>{" "}
                    (keeping the same section)
                  </p>
                ) : (
                  <p>
                    Selected students will be promoted from{" "}
                    {classes.find((c) => c.name === selectedGrade)?.displayName || selectedGrade} Section{" "}
                    {selectedSection} to{" "}
                    <strong>
                      {classes.find((c) => c.name === getNextGrade(selectedGrade, true))?.displayName ||
                        getNextGrade(selectedGrade, true)}
                    </strong>{" "}
                    (skipping one grade, keeping the same section)
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Promotion Results</CardTitle>
              <CardDescription>
                Successfully promoted {promotionResults.success} students. Failed: {promotionResults.failed}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <div className="grid grid-cols-12 p-2 font-medium border-b bg-muted">
                  <div className="col-span-1">Status</div>
                  <div className="col-span-4">Name</div>
                  <div className="col-span-7">Result</div>
                </div>
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {promotionResults.details.map((result, index) => (
                    <div key={index} className="grid grid-cols-12 p-2 items-center">
                      <div className="col-span-1">
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="col-span-4">{result.name}</div>
                      <div className="col-span-7">{result.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setShowResults(false)} variant="outline" className="mr-2">
                Back to Student List
              </Button>
              <Button onClick={() => router.push("/teacher/dashboard?id=" + currentTeacher?.id)}>
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
