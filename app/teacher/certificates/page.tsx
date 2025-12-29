"use client"

import { useState, useRef, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, Printer } from "lucide-react"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student, Teacher } from "@/lib/models"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function CertificatesPage() {
  const router = useRouter()
  const certificateRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [sections, setSections] = useState<string[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [symbolNo, setSymbolNo] = useState("02123456 'W'")
  const [loadingClassData, setLoadingClassData] = useState(true)

  // Check permission and fetch data on component mount
  useEffect(() => {
    checkPermission()
    fetchClassesAndSections()
  }, [])

  // Fetch students when class or section changes
  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudents(selectedClass, selectedSection)
    }
  }, [selectedClass, selectedSection])

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
          setPermissionMessage("Please sign in to generate certificates")
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
          setPermissionMessage("Only principal or computer teacher can generate certificates")
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

  const fetchClassesAndSections = async () => {
    setLoadingClassData(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use default classes and sections in demo mode
        setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
        setSections(["A", "B", "C", "D"])
        setLoadingClassData(false)
        return
      }

      // Fetch classes
      const classesSnapshot = await getDocs(collection(db, "classes"))
      const classesData = classesSnapshot.docs.map((doc) => doc.data().name || doc.id)

      // Sort classes
      const sortedClasses = classesData.sort((a, b) => {
        // Custom sorting to handle special class names
        if (a === "P.G") return -1
        if (b === "P.G") return 1
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
        setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
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
      setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
      setSections(["A", "B", "C", "D"])
    } finally {
      setLoadingClassData(false)
    }
  }

  const fetchStudents = async (grade: string, section: string) => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Create demo students
        const demoStudents: Student[] = [
          {
            id: "student1",
            name: "Tulasi Shrestha",
            firstName: "Tulasi",
            middleName: "",
            lastName: "Shrestha",
            grade: grade,
            section: section,
            rollNumber: "1",
            symbolNumber: "1101",
            fatherName: "Shubha Narayan Shrestha",
            motherName: "Ambika Shrestha",
            address: "Siddhalek Rural Municipality",
            contactNumber: "9815277607",
            dob: "2059/02/05 BS",
            profilePictureUrl: "/diverse-students-studying.png",
            usesBus: false,
            busRoute: "",
            dues: 0,
            monthlyFee: 1200,
            transportationFee: 0,
            attendance: 180,
            totalClasses: 200,
            attendanceStatus: "Present",
            attendanceId: "",
            currentSubject: null,
            percentage: 90,
            rank: 1,
            resultPdfUrl: "",
            selected: false,
            subjects: [],
            totalMarks: 480,
            qrCode: null,
            janmaDartaUrl: "",
            janmaDartaNumber: "",
          },
          {
            id: "student2",
            name: "Aman Gautam",
            firstName: "Aman",
            middleName: "",
            lastName: "Gautam",
            grade: grade,
            section: section,
            rollNumber: "2",
            symbolNumber: "1102",
            fatherName: "Buddhi Gautam",
            motherName: "Ambika Gautam",
            address: "Dhading",
            contactNumber: "9815277608",
            dob: "2060/03/15 BS",
            profilePictureUrl: "/diverse-students-studying.png",
            usesBus: false,
            busRoute: "",
            dues: 0,
            monthlyFee: 1200,
            transportationFee: 0,
            attendance: 175,
            totalClasses: 200,
            attendanceStatus: "Present",
            attendanceId: "",
            currentSubject: null,
            percentage: 87.5,
            rank: 2,
            resultPdfUrl: "",
            selected: false,
            subjects: [],
            totalMarks: 450,
            qrCode: null,
            janmaDartaUrl: "",
            janmaDartaNumber: "",
          },
          {
            id: "student3",
            name: "Sarita Tamang",
            firstName: "Sarita",
            middleName: "",
            lastName: "Tamang",
            grade: grade,
            section: section,
            rollNumber: "3",
            symbolNumber: "1103",
            fatherName: "Ram Tamang",
            motherName: "Sita Tamang",
            address: "Dhading",
            contactNumber: "9815277609",
            dob: "2059/08/20 BS",
            profilePictureUrl: "/diverse-students-studying.png",
            usesBus: true,
            busRoute: "Route 1",
            dues: 0,
            monthlyFee: 1200,
            transportationFee: 500,
            attendance: 190,
            totalClasses: 200,
            attendanceStatus: "Present",
            attendanceId: "",
            currentSubject: null,
            percentage: 95,
            rank: 3,
            resultPdfUrl: "",
            selected: false,
            subjects: [],
            totalMarks: 470,
            qrCode: null,
            janmaDartaUrl: "",
            janmaDartaNumber: "",
          },
        ]
        setStudents(demoStudents)
      } else {
        // Fetch students from Firestore
        const studentsRef = collection(db, "students")
        const q = query(studentsRef, where("grade", "==", grade), where("section", "==", section))
        const querySnapshot = await getDocs(q)

        const fetchedStudents: Student[] = []
        querySnapshot.forEach((doc) => {
          const studentData = doc.data() as Student
          studentData.id = doc.id
          fetchedStudents.push(studentData)
        })

        setStudents(fetchedStudents)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = useReactToPrint({
    content: () => certificateRef.current,
    documentTitle: `Certificate_${selectedStudent?.name || "Student"}`,
  })

  if (permissionChecking || loadingClassData) {
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
            <p>{permissionMessage}</p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/teacher/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Certificate Generator</h1>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="mb-4">
          <TabsTrigger value="generate">Generate Certificate</TabsTrigger>
          <TabsTrigger value="preview">Certificate Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Select Student</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((sec) => (
                        <SelectItem key={sec} value={sec}>
                          Section {sec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Student</label>
                  <Select
                    value={selectedStudent?.id || ""}
                    onValueChange={(value) => {
                      const student = students.find((s) => s.id === value)
                      setSelectedStudent(student || null)
                      if (student?.symbolNumber) {
                        setSymbolNo(student.symbolNumber + " 'W'")
                      }
                    }}
                    disabled={!selectedClass || !selectedSection || students.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading students..." : "Select student"} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} (Roll: {student.rollNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Symbol Number</label>
                  <input
                    type="text"
                    value={symbolNo}
                    onChange={(e) => setSymbolNo(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handlePrint} disabled={!selectedStudent} className="flex items-center">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Certificate
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="bg-white mx-auto max-w-4xl shadow-lg">
              <div ref={certificateRef} className="p-8">
                {/* Certificate Design */}
                <div className="relative border-8 border-red-600 p-6">
                  {/* Corner Decorations */}
                  <div className="absolute top-0 left-0 w-16 h-16 text-red-600">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M0,0 C50,25 75,50 100,100 L0,100 Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16 text-red-600 transform scale-x-[-1]">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M0,0 C50,25 75,50 100,100 L0,100 Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 text-red-600 transform scale-y-[-1]">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M0,0 C50,25 75,50 100,100 L0,100 Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 text-red-600 transform scale-x-[-1] scale-y-[-1]">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M0,0 C50,25 75,50 100,100 L0,100 Z" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Header with Logo and School Name */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="w-24 h-24 mr-4">
                        <img
                          src="/placeholder.svg?key=lxv41"
                          alt="School Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-blue-600">AMAR ADARSHA SECONDARY SCHOOL</h1>
                        <p className="text-gray-600 text-lg">Estd. 2040</p>
                        <p className="text-gray-600 mt-2">Rural Municipality - 3, Dumidanda, Dhading</p>
                      </div>
                    </div>
                    <div className="w-28 h-36 border-2 border-yellow-500 bg-blue-800 flex items-center justify-center">
                      {selectedStudent?.profilePictureUrl ? (
                        <img
                          src={selectedStudent.profilePictureUrl || "/placeholder.svg"}
                          alt="Student"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-800 flex items-center justify-center">
                          <span className="text-white text-xs">Student Photo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate Title */}
                  <div className="text-center my-6">
                    <div className="border-2 border-red-600 inline-block px-8 py-2">
                      <h2 className="text-2xl font-bold text-red-600">TRANSFER/CHARACTER CERTIFICATE</h2>
                    </div>
                  </div>

                  {/* Certificate Content */}
                  <div className="mt-8 space-y-6">
                    <h3 className="text-2xl font-bold text-blue-600 text-center">TO WHOM IT MAY CONCERN</h3>

                    <div className="text-lg leading-relaxed text-justify">
                      <p>
                        This is to certify that Mr./Ms.{" "}
                        <span className="text-red-600 font-bold">{selectedStudent?.name || "Tulasi Shrestha"}</span>{" "}
                        son/daughter of Mr. / Mrs. {selectedStudent?.fatherName || "Shubha Narayan Shrestha"} resident
                        of <span className="text-red-600 font-bold">Siddhalek Rural Municipality</span> Ward No.-{" "}
                        <span className="text-red-600 font-bold">3</span> District{" "}
                        <span className="text-red-600 font-bold">Dhading</span> was student of this school. He/She
                        passed the{" "}
                        <span className="text-red-600 font-bold">Secondary Education Examination (Grade - 10)</span> in
                        the year <span className="text-red-600 font-bold">2076</span> and placed{" "}
                        <span className="text-red-600 font-bold">2.80 GPA</span>. His/Her character so far known to this
                        school is good. His/Her date of birth according to the register of this school is{" "}
                        <span className="text-red-600 font-bold">{selectedStudent?.dob || "2059/02/05 BS"}</span>.
                      </p>
                      <p className="mt-4">
                        I know nothing against his/her moral character while he / she was studying in this school. I
                        wish success in every step of his/her life.
                      </p>
                    </div>

                    <div className="border-t-2 border-blue-600 pt-2 mt-8"></div>

                    {/* Certificate Footer */}
                    <div className="mt-8">
                      <div className="text-left space-y-1">
                        <p>Symbol No {symbolNo}</p>
                        <p>Date of Issue: {format(new Date(issueDate), "yyyy-MM-dd")}</p>
                      </div>

                      <div className="flex justify-between mt-16 pt-8">
                        <div className="text-center">
                          <div className="border-t border-black pt-1">
                            <p className="font-bold">Issued By</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-black pt-1">
                            <p className="font-bold">Checked By</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-black pt-1">
                            <p className="font-bold">Headmaster</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
