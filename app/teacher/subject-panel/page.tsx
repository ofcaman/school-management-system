"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import type { ExamTerm } from "@/lib/models/exam-models"
import { calculateGrade } from "@/lib/models/subject-models"
import { ArrowLeft, Loader2, Search, Save, Check } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Fallback subjects if no subject groups are found
const FALLBACK_SUBJECTS = {
  primary: [
    "English",
    "Nepali",
    "Mathematics",
    "Science",
    "Social Studies",
    "Computer",
    "Health",
    "Moral Education",
    "Optional Mathematics",
  ],
  secondary: [
    "English",
    "Nepali",
    "Mathematics",
    "Science",
    "Social Studies",
    "Computer",
    "Health",
    "Optional I",
    "Optional II",
  ],
  preschool: ["English", "Nepali", "Mathematics", "Drawing", "General Knowledge", "Handwriting"],
}

export default function SubjectPanelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([])
  const [selectedExamTermId, setSelectedExamTermId] = useState<string>("")
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedGradeId, setSelectedGradeId] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [sections, setSections] = useState<string[]>([])
  const [loadingSections, setLoadingSections] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])
  const [assignedSubjects, setAssignedSubjects] = useState<{ id: string; name: string }[]>([])
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [studentMarks, setStudentMarks] = useState<
    Record<string, { theory: string; practical: string; remarks: string }>
  >({})
  const [subjectConfig, setSubjectConfig] = useState<any>(null)
  const [formErrors, setFormErrors] = useState<Record<string, Record<string, string>>>({})
  const [subjectGroups, setSubjectGroups] = useState<{ id: string; name: string; code: string; forClass: string }[]>([])
  const [selectedSubjectGroup, setSelectedSubjectGroup] = useState<string>("")
  const [selectedSubjectGroupId, setSelectedSubjectGroupId] = useState<string>("")
  const [loadingSubjectGroups, setLoadingSubjectGroups] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [fallbackSubjects, setFallbackSubjects] = useState<{ id: string; name: string }[]>([])
  const [useFallback, setUseFallback] = useState(false)
  const [hasUsedFallback, setHasUsedFallback] = useState(false)

  const [isFallbackSubjectsUsed, setIsFallbackSubjectsUsed] = useState(false)

  const useFallbackSubjects = useCallback(() => {
    // Determine which subject set to use based on grade
    let subjectSet: string[] = []
    const gradeName = selectedGrade.toLowerCase()

    if (["pg", "nursery", "lkg", "ukg"].includes(gradeName)) {
      subjectSet = FALLBACK_SUBJECTS.preschool
    } else {
      const gradeNum = Number.parseInt(selectedGrade)
      if (!isNaN(gradeNum)) {
        if (gradeNum <= 8) {
          subjectSet = FALLBACK_SUBJECTS.primary
        } else {
          subjectSet = FALLBACK_SUBJECTS.secondary
        }
      } else {
        // Default to primary if we can't determine
        subjectSet = FALLBACK_SUBJECTS.primary
      }
    }

    // Convert to the expected format
    const fallbackSubjects = subjectSet.map((name, index) => ({
      id: `fallback-${index}`,
      name,
    }))

    setAssignedSubjects(fallbackSubjects)
    setFallbackSubjects(fallbackSubjects)
    setIsFallbackSubjectsUsed(true)
    console.log("Using fallback subjects:", fallbackSubjects)
  }, [selectedGrade])

  const checkTeacherAndLoadData = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      // Load available classes/grades
      await fetchClasses()

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
        await loadExamTerms()
        setLoading(false)
        return
      }

      // Get teacher ID from localStorage
      const teacherId = localStorage.getItem("teacherId")

      if (!teacherId) {
        router.push("/teacher/login")
        return
      }

      // Load teacher data
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)

        // If teacher is a class teacher, set the selected grade to their assigned class
        if (teacherData.roles?.includes("class_teacher") && teacherData.assignedClass) {
          // Find the class object that matches the assigned class
          const classObj = classes.find((c) => c.name === teacherData.assignedClass)
          if (classObj) {
            setSelectedGrade(classObj.name)
            setSelectedGradeId(classObj.id)
          }

          // If teacher has an assigned section, set that too
          if (teacherData.assignedSection) {
            setSelectedSection(teacherData.assignedSection)
          }
        }

        await loadExamTerms()
      } else {
        router.push("/teacher/login")
      }
    } catch (error) {
      console.error("Error checking teacher:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadExamTerms = async () => {
    try {
      if (isDemoMode) {
        // Create demo exam terms
        const demoExamTerms: ExamTerm[] = [
          {
            id: "term1",
            name: "First Term (Active)",
            startDate: new Date(2025, 3, 9),
            endDate: new Date(2025, 3, 23),
            isActive: true,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
          {
            id: "term2",
            name: "Second Term",
            startDate: new Date(2025, 6, 15),
            endDate: new Date(2025, 6, 30),
            isActive: false,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
        ]
        setExamTerms(demoExamTerms)
        setSelectedExamTermId(demoExamTerms[0].id)
      } else {
        // Get current academic year
        const now = new Date()
        const year = now.getFullYear()
        const academicYear = now.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`

        // Query exam terms for the current academic year
        const examTermsRef = collection(db, "exam_terms")
        const q = query(examTermsRef, where("academicYear", "==", academicYear))
        const querySnapshot = await getDocs(q)

        const examTermsList: ExamTerm[] = []
        querySnapshot.forEach((doc) => {
          const examTerm = doc.data() as ExamTerm
          examTerm.id = doc.id

          // Convert Firestore timestamps to Date objects
          if (doc.data().startDate) {
            examTerm.startDate = doc.data().startDate.toDate()
          }
          if (doc.data().endDate) {
            examTerm.endDate = doc.data().endDate.toDate()
          }
          if (doc.data().createdAt) {
            examTerm.createdAt = doc.data().createdAt.toDate()
          }
          if (doc.data().updatedAt) {
            examTerm.updatedAt = doc.data().updatedAt.toDate()
          }

          examTermsList.push(examTerm)
        })

        setExamTerms(examTermsList)

        // Set active term as selected
        const activeTerm = examTermsList.find((term) => term.isActive)
        if (activeTerm) {
          setSelectedExamTermId(activeTerm.id)
        } else if (examTermsList.length > 0) {
          setSelectedExamTermId(examTermsList[0].id)
        }
      }
    } catch (error) {
      console.error("Error loading exam terms:", error)
    }
  }

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
        console.log("Firestore classes loaded:", classesData)

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
          console.log("Using default classes:", defaultClasses)
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

  const fetchSubjectGroups = async () => {
    if (!selectedGradeId) return

    setLoadingSubjectGroups(true)
    setSubjectGroups([])
    setSelectedSubjectGroup("")
    setSelectedSubjectGroupId("")

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo subject groups
        const demoSubjectGroups = [
          {
            id: "group1",
            name: "for class 1 to 3",
            code: "one-three",
            forClass: selectedGradeId,
          },
          {
            id: "group2",
            name: "for class 4 to 5",
            code: "four-five",
            forClass: selectedGradeId,
          },
        ]
        setSubjectGroups(demoSubjectGroups)

        // Auto-select the first group
        if (demoSubjectGroups.length > 0) {
          setSelectedSubjectGroup(demoSubjectGroups[0].name)
          setSelectedSubjectGroupId(demoSubjectGroups[0].id)
        }

        console.log("Demo subject groups loaded:", demoSubjectGroups)
      } else {
        // Fetch all subject groups from Firestore
        console.log("Fetching subject groups for class ID:", selectedGradeId)
        const subjectGroupsRef = collection(db, "subject_groups")
        const querySnapshot = await getDocs(subjectGroupsRef)

        const groupsData = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          // Include groups that are either for this specific class or don't have a class specified (for all classes)
          if (!data.forClass || data.forClass === selectedGradeId || data.forClass === "all") {
            groupsData.push({
              id: doc.id,
              name: data.name || `Group ${groupsData.length + 1}`,
              code: data.code || doc.id,
              forClass: data.forClass || "all",
            })
          }
        })

        console.log("Found subject groups:", groupsData.length)
        setSubjectGroups(groupsData)

        // Auto-select the first group
        if (groupsData.length > 0) {
          setSelectedSubjectGroup(groupsData[0].name)
          setSelectedSubjectGroupId(groupsData[0].id)
        } else {
          console.warn("No subject groups found for this class")
          // If no subject groups found, use fallback subjects
          setUseFallback(true)
        }
      }
    } catch (error) {
      console.error("Error fetching subject groups:", error)
      toast({
        title: "Error",
        description: "Failed to load subject groups. Using default subjects.",
        variant: "destructive",
      })
      // If error, use fallback subjects
      setUseFallback(true)
    } finally {
      setLoadingSubjectGroups(false)
    }
  }

  const fetchSubjects = async () => {
    if (!selectedSubjectGroupId) return

    setLoadingSubjects(true)
    setAssignedSubjects([])
    setSelectedSubject("")
    setSelectedSubjectId("")

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo subjects
        const demoSubjects = [
          { id: "subject1", name: "Mathematics" },
          { id: "subject2", name: "English" },
          { id: "subject3", name: "Science" },
          { id: "subject4", name: "Social Studies" },
          { id: "subject5", name: "Computer" },
        ]

        setAssignedSubjects(demoSubjects)
        console.log("Demo subjects loaded:", demoSubjects)
      } else {
        // First, get the subject group document to check for subjects array
        const groupDoc = await getDoc(doc(db, "subject_groups", selectedSubjectGroupId))

        if (groupDoc.exists() && groupDoc.data().subjects && Array.isArray(groupDoc.data().subjects)) {
          const subjectIds = groupDoc.data().subjects || []
          const subjectsData: { id: string; name: string }[] = []

          console.log("Found subject IDs in group:", subjectIds)

          // Fetch each subject document by ID
          for (const subjectId of subjectIds) {
            try {
              // Check if subjectId is a string (it should be a document ID)
              if (typeof subjectId === "string") {
                const subjectDoc = await getDoc(doc(db, "subjects", subjectId))

                if (subjectDoc.exists()) {
                  const subjectData = subjectDoc.data()
                  subjectsData.push({
                    id: subjectDoc.id,
                    name: subjectData.name || subjectDoc.id,
                  })
                } else {
                  console.warn(`Subject document ${subjectId} not found`)
                }
              } else {
                console.warn(`Invalid subject ID format:`, subjectId)
              }
            } catch (err) {
              console.error(`Error fetching subject ${subjectId}:`, err)
            }
          }

          console.log("Loaded subjects:", subjectsData)

          // Check if the teacher is a principal or computer_teacher
          const isAdmin =
            currentTeacher?.roles?.includes("principal") || currentTeacher?.roles?.includes("computer_teacher") || false

          if (isAdmin) {
            // Admin can see all subjects
            setAssignedSubjects(subjectsData)
          } else {
            // Regular teachers can only see subjects they're assigned to
            // For simplicity, we'll just use all subjects for now
            setAssignedSubjects(subjectsData)
          }
        } else {
          console.warn("No subjects array found in subject group document or invalid format")
          setUseFallback(true)
        }
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      setUseFallback(true)
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchSubjectConfig = async () => {
    if (!selectedSubject || !selectedSubjectId) {
      // Use default configuration
      setSubjectConfig({
        hasPractical: false,
        maxTheoryMarks: 100,
        maxPracticalMarks: 0,
        totalMarks: 100,
      })
      return
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Special configurations for subjects with practical components in demo mode
        const specialConfigs: Record<string, any> = {
          Science: {
            hasPractical: true,
            maxTheoryMarks: 75,
            maxPracticalMarks: 25,
            totalMarks: 100,
          },
          Computer: {
            hasPractical: false,
            maxTheoryMarks: 50,
            maxPracticalMarks: 0,
            totalMarks: 50,
          },
        }

        const config = specialConfigs[selectedSubject] || {
          hasPractical: false,
          maxTheoryMarks: 100,
          maxPracticalMarks: 0,
          totalMarks: 100,
        }

        setSubjectConfig(config)
      } else {
        // Try to fetch subject configuration from Firestore
        const subjectDoc = await getDoc(doc(db, "subjects", selectedSubjectId))

        if (subjectDoc.exists()) {
          const data = subjectDoc.data()

          // Read hasPractical directly from the document
          const hasPractical = data.hasPractical === true

          const config = {
            hasPractical: hasPractical,
            maxTheoryMarks: data.theoryMarks || 100,
            maxPracticalMarks: hasPractical ? data.practicalMarks || 0 : 0,
            totalMarks: data.fullMarks || 100,
            creditHours: data.creditHours || 4, // Read creditHours from the subject document
          }

          console.log("Subject config loaded:", config)
          setSubjectConfig(config)
        } else {
          // Use default configuration if subject document doesn't exist
          setSubjectConfig({
            hasPractical: false,
            maxTheoryMarks: 100,
            maxPracticalMarks: 0,
            totalMarks: 100,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching subject configuration:", error)
      // Use default configuration on error
      setSubjectConfig({
        hasPractical: false,
        maxTheoryMarks: 100,
        maxPracticalMarks: 0,
        totalMarks: 100,
      })
    }
  }

  const loadStudentsByGradeAndSection = async () => {
    if (!selectedGrade || !selectedSection) return

    console.log(`Loading students for grade: "${selectedGrade}", section: "${selectedSection}"`)
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
        setFilteredStudents(demoStudents)
        console.log("Demo students loaded:", demoStudents.length)
      } else {
        // Load real data from Firebase
        const studentsRef = collection(db, "students")

        // Create an array of possible grade values to search for, including cleaned versions
        const possibleGradeValues = [
          selectedGrade, // Original grade name (e.g., "1", "2", "pg")
          selectedGrade.trim(), // Trimmed version
          selectedGrade.toLowerCase(), // Lowercase version
          selectedGrade.toUpperCase(), // Uppercase version
          selectedGradeId, // Grade ID from classes collection
          selectedGradeId?.trim(), // Trimmed grade ID
          Number.parseInt(selectedGrade), // Convert to number if possible (e.g., 1, 2, 3)
        ].filter((val) => val !== undefined && val !== null && val !== "")

        console.log("Searching for students with grade values:", possibleGradeValues)

        // Special debugging for grade "2"
        if (selectedGrade === "2") {
          console.log("🔍 DEBUGGING GRADE 2:")
          console.log("Selected grade:", `"${selectedGrade}"`)
          console.log("Selected grade length:", selectedGrade.length)
          console.log(
            "Selected grade char codes:",
            selectedGrade.split("").map((c) => c.charCodeAt(0)),
          )
          console.log("Selected section:", `"${selectedSection}"`)

          // Let's first check what grades actually exist in the database
          console.log("🔍 Checking all grades in database...")
          const allStudentsQuery = query(studentsRef)
          const allStudentsSnapshot = await getDocs(allStudentsQuery)
          const uniqueGrades = new Set()
          const uniqueSections = new Set()

          allStudentsSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.grade) {
              uniqueGrades.add(`"${data.grade}" (length: ${data.grade.length})`)
            }
            if (data.section) {
              uniqueSections.add(`"${data.section}"`)
            }
          })

          console.log("All unique grades found:", Array.from(uniqueGrades))
          console.log("All unique sections found:", Array.from(uniqueSections))
        }

        const studentsList: Student[] = []

        // Try each possible grade value
        for (const gradeValue of possibleGradeValues) {
          if (studentsList.length > 0) break // Stop if we found students

          try {
            console.log(
              `🔍 Trying query with grade="${gradeValue}" (type: ${typeof gradeValue}) and section="${selectedSection}"`,
            )

            const q = query(studentsRef, where("grade", "==", gradeValue), where("section", "==", selectedSection))
            const querySnapshot = await getDocs(q)

            console.log(
              `Query with grade="${gradeValue}" and section="${selectedSection}" returned ${querySnapshot.size} students`,
            )

            if (!querySnapshot.empty) {
              querySnapshot.forEach((doc) => {
                const data = doc.data() as Student
                console.log(`Found student: ${data.name}, grade: "${data.grade}", section: "${data.section}"`)
                studentsList.push({
                  ...data,
                  id: doc.id,
                })
              })
              console.log(`✅ Found ${studentsList.length} students with grade value: ${gradeValue}`)
              break // Stop searching once we find students
            }
          } catch (error) {
            console.error(`❌ Error querying with grade value ${gradeValue}:`, error)
          }
        }

        // If still no students found, try a broader search without section filter
        if (studentsList.length === 0) {
          console.log("🔍 No students found with section filter, trying without section...")

          for (const gradeValue of possibleGradeValues) {
            try {
              console.log(`🔍 Broader search with grade="${gradeValue}" (type: ${typeof gradeValue})`)
              const q = query(studentsRef, where("grade", "==", gradeValue))
              const querySnapshot = await getDocs(q)

              console.log(`Broader query with grade="${gradeValue}" returned ${querySnapshot.size} students`)

              if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                  const data = doc.data() as Student
                  console.log(
                    `Found student in broader search: ${data.name}, grade: "${data.grade}", section: "${data.section}"`,
                  )

                  // Filter by section in memory if section field exists
                  if (
                    !data.section ||
                    data.section === selectedSection ||
                    data.section.trim() === selectedSection.trim()
                  ) {
                    studentsList.push({
                      ...data,
                      id: doc.id,
                    })
                  }
                })

                if (studentsList.length > 0) {
                  console.log(`✅ Found ${studentsList.length} students with broader search for grade: ${gradeValue}`)
                  break
                }
              }
            } catch (error) {
              console.error(`❌ Error in broader query with grade value ${gradeValue}:`, error)
            }
          }
        }

        // If STILL no students found, let's do a manual check for grade "2"
        if (studentsList.length === 0 && selectedGrade === "2") {
          console.log("🔍 MANUAL CHECK FOR GRADE 2 - Getting all students and filtering manually...")

          try {
            const allStudentsQuery = query(studentsRef)
            const allStudentsSnapshot = await getDocs(allStudentsQuery)

            allStudentsSnapshot.forEach((doc) => {
              const data = doc.data() as Student
              const studentGrade = data.grade?.toString().trim()
              const studentSection = data.section?.toString().trim()

              console.log(`Student: ${data.name}, grade: "${studentGrade}", section: "${studentSection}"`)

              if (studentGrade === "2" && studentSection === selectedSection.trim()) {
                console.log(`✅ MANUAL MATCH FOUND: ${data.name}`)
                studentsList.push({
                  ...data,
                  id: doc.id,
                })
              }
            })

            console.log(`Manual search found ${studentsList.length} students for grade 2`)
          } catch (error) {
            console.error("❌ Error in manual search:", error)
          }
        }

        // Sort by roll number
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(studentsList)
        setFilteredStudents(studentsList)
        console.log("Final students loaded:", studentsList.length)

        if (studentsList.length === 0) {
          console.warn("❌ No students found. Check if:")
          console.warn("1. Students exist in the database")
          console.warn("2. Grade field in students matches:", possibleGradeValues)
          console.warn("3. Section field matches:", selectedSection)

          // Additional debugging for grade "2"
          if (selectedGrade === "2") {
            console.warn("🔍 GRADE 2 SPECIFIC DEBUG:")
            console.warn("- Check if grade field has extra spaces")
            console.warn("- Check if grade is stored as number vs string")
            console.warn("- Check if there are any special characters")
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Error loading students:", error)
      toast({
        title: "Error",
        description: "Failed to load students. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  const loadExistingMarks = async () => {
    if (!selectedExamTermId || !selectedSubject || !selectedGrade || !selectedSection) return

    try {
      if (isDemoMode) {
        // Create demo marks for some students
        const updatedMarks = { ...studentMarks }

        // Only add marks for some students to simulate partial completion
        students.slice(0, 3).forEach((student, index) => {
          updatedMarks[student.id] = {
            theory: (Math.floor(Math.random() * 20) + 70).toString(),
            practical: subjectConfig?.hasPractical ? (Math.floor(Math.random() * 10) + 15).toString() : "0",
            remarks: index === 0 ? "OUTSTANDING" : "",
          }
        })

        setStudentMarks(updatedMarks)
      } else {
        // Get the exam term name instead of just the ID
        const examTerm = examTerms.find((term) => term.id === selectedExamTermId)
        const examTermName = examTerm ? examTerm.name : "Unknown Term"

        // Query for existing subject marks for each student
        for (const student of students) {
          const subjectsRef = collection(db, "students", student.id, "subjects")
          const q = query(subjectsRef, where("name", "==", selectedSubject), where("examTerm", "==", examTermName))
          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            const subjectDoc = querySnapshot.docs[0]
            const subjectData = subjectDoc.data()

            setStudentMarks((prev) => ({
              ...prev,
              [student.id]: {
                ...prev[student.id],
                theory: subjectData.theoryMarks?.toString() || "",
                practical: subjectConfig?.hasPractical ? subjectData.practicalMarks?.toString() || "" : "0",
                remarks: subjectData.remarks || "",
              },
            }))
          }
        }
      }
    } catch (error) {
      console.error("Error loading existing marks:", error)
    }
  }

  const handleInputChange = (studentId: string, field: "theory" | "practical" | "remarks", value: string) => {
    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
  }

  const validateForm = () => {
    const errors: Record<string, Record<string, string>> = {}
    let isValid = true

    if (!selectedExamTermId || !selectedSubject || !selectedGrade || !selectedSection) {
      isValid = false
      toast({
        title: "Error",
        description: "Please select grade, section, exam term and subject",
        variant: "destructive",
      })
      return false
    }

    // Validate each student's marks
    students.forEach((student) => {
      const marks = studentMarks[student.id]
      const studentErrors: Record<string, string> = {}

      if (!marks) return

      if (!marks.theory.trim()) {
        studentErrors.theory = "Required"
        isValid = false
      } else {
        const theory = Number(marks.theory)
        if (isNaN(theory) || theory < 0 || theory > subjectConfig.maxTheoryMarks) {
          studentErrors.theory = `0-${subjectConfig.maxTheoryMarks}`
          isValid = false
        }
      }

      if (subjectConfig && subjectConfig.hasPractical) {
        if (!marks.practical.trim()) {
          studentErrors.practical = "Required"
          isValid = false
        } else {
          const practical = Number(marks.practical)
          if (isNaN(practical) || practical < 0 || practical > subjectConfig.maxPracticalMarks) {
            studentErrors.practical = `0-${subjectConfig.maxPracticalMarks}`
            isValid = false
          }
        }
      }

      if (Object.keys(studentErrors).length > 0) {
        errors[student.id] = studentErrors
      }
    })

    setFormErrors(errors)
    return isValid
  }

  const handleSaveAllMarks = async () => {
    if (!validateForm()) return

    setSaving(true)
    setSaveSuccess(false)

    try {
      // Create subject objects for each student
      for (const student of students) {
        const marks = studentMarks[student.id]

        if (!marks || !marks.theory.trim()) {
          // Skip students with no marks entered
          continue
        }

        const theory = Number(marks.theory) || 0
        const practical = subjectConfig && subjectConfig.hasPractical ? Number(marks.practical) || 0 : 0
        const totalObtained = theory + practical
        const totalPossible = subjectConfig ? subjectConfig.totalMarks : 100
        const percentage = (totalObtained / totalPossible) * 100
        const { grade, gradePoint } = calculateGrade(percentage)

        // Get the exam term name instead of just the ID
        const examTerm = examTerms.find((term) => term.id === selectedExamTermId)
        const examTermName = examTerm ? examTerm.name : "Unknown Term"

        // Create subject object with EXACT field names matching the Firestore structure
        const subjectData = {
          creditHours: subjectConfig ? subjectConfig.creditHours || 4 : 4, // Use creditHours from subjectConfig
          examTerm: examTermName, // Store the name, not the ID
          finalGrade: grade,
          gradePoint: gradePoint,
          hasPractical: subjectConfig ? subjectConfig.hasPractical : false,
          id: "", // This will be set by Firestore
          maxPracticalMarks: subjectConfig ? subjectConfig.maxPracticalMarks : 0,
          maxTheoryMarks: subjectConfig ? subjectConfig.maxTheoryMarks : 100,
          name: selectedSubject,
          practicalMarks: practical,
          remarks: marks.remarks || "",
          theoryMarks: theory,
          section: selectedSection, // Add section information
          subjectGroup: selectedSubjectGroup, // Add subject group information
          subjectId: selectedSubjectId, // Add subject ID
          subjectGroupId: selectedSubjectGroupId, // Add subject group ID
        }

        if (isDemoMode) {
          // In demo mode, just update the local state
          console.log(`Saved marks for student ${student.name}: ${theory}/${practical}`)
        } else {
          // Check if a subject already exists for this student, subject, and exam term
          const subjectsRef = collection(db, "students", student.id, "subjects")
          const q = query(subjectsRef, where("name", "==", selectedSubject), where("examTerm", "==", examTermName))
          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            // Update existing subject
            const subjectDoc = querySnapshot.docs[0]
            await updateDoc(doc(db, "students", student.id, "subjects", subjectDoc.id), {
              theoryMarks: theory,
              practicalMarks: practical,
              finalGrade: grade,
              gradePoint: gradePoint,
              remarks: marks.remarks || "",
              section: selectedSection, // Update section information
              subjectGroup: selectedSubjectGroup, // Update subject group information
              subjectId: selectedSubjectId, // Add subject ID
              subjectGroupId: selectedSubjectGroupId, // Add subject group ID
            })
          } else {
            // Create new subject with the exact field structure
            await addDoc(collection(db, "students", student.id, "subjects"), subjectData)
          }
        }
      }

      setSaveSuccess(true)
      toast({
        title: "Success",
        description: "All marks saved successfully",
      })

      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error: any) {
      console.error("Error saving marks:", error)
      toast({
        title: "Error",
        description: `Error saving marks: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    checkTeacherAndLoadData()
  }, [])

  useEffect(() => {
    if (selectedGrade && selectedGradeId) {
      fetchSections()
      fetchSubjectGroups()
    }
  }, [selectedGrade, selectedGradeId])

  useEffect(() => {
    if (selectedSubjectGroupId) {
      fetchSubjects()
    }
  }, [selectedSubjectGroupId])

  useEffect(() => {
    if (selectedGrade && selectedSection) {
      loadStudentsByGradeAndSection()
    }
  }, [selectedGrade, selectedSection])

  useEffect(() => {
    if (selectedSubject) {
      // Get subject configuration
      fetchSubjectConfig()

      // Initialize marks for all students
      const initialMarks: Record<string, { theory: string; practical: string; remarks: string }> = {}
      students.forEach((student) => {
        initialMarks[student.id] = { theory: "", practical: "", remarks: "" }
      })
      setStudentMarks(initialMarks)

      // Load existing marks if available
      if (selectedExamTermId) {
        loadExistingMarks()
      }
    }
  }, [selectedSubject, students, selectedExamTermId])

  useEffect(() => {
    if (searchQuery) {
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.fatherName?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchQuery, students])

  const [useFallbackSubjectsEffect] = useState(() => {
    if (useFallback && !isFallbackSubjectsUsed) {
      useFallbackSubjects()
    }
  })

  useEffect(() => {
    useFallbackSubjectsEffect
  }, [useFallbackSubjectsEffect])

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Special handling for principals and computer teachers
  const isAdmin =
    currentTeacher?.roles?.includes("principal") || currentTeacher?.roles?.includes("computer_teacher") || false

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Subject Panel</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enter Marks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="grade">Select Grade</Label>
              {loadingClasses ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedGrade}
                  onValueChange={(value) => {
                    const classObj = classes.find((c) => c.name === value)
                    if (classObj) {
                      setSelectedGrade(value)
                      setSelectedGradeId(classObj.id)
                      console.log(`Selected grade: ${value}, ID: ${classObj.id}`)

                      // Reset dependent fields
                      setSelectedSection("")
                      setSelectedSubjectGroup("")
                      setSelectedSubjectGroupId("")
                      setSelectedSubject("")
                      setSelectedSubjectId("")
                      setStudents([])
                      setFilteredStudents([])
                    }
                  }}
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Select grade" />
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
            </div>

            <div>
              <Label htmlFor="section">Select Section</Label>
              {loadingSections ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedSection}
                  onValueChange={setSelectedSection}
                  disabled={!selectedGrade || sections.length === 0}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Select section" />
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
            </div>

            <div>
              <Label htmlFor="examTerm">Select Exam Term</Label>
              <Select value={selectedExamTermId} onValueChange={setSelectedExamTermId}>
                <SelectTrigger id="examTerm">
                  <SelectValue placeholder="Select exam term" />
                </SelectTrigger>
                <SelectContent>
                  {examTerms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} {term.isActive && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subjectGroup">Select Subject Group</Label>
              {loadingSubjectGroups ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedSubjectGroup}
                  onValueChange={(value) => {
                    const group = subjectGroups.find((g) => g.name === value)
                    if (group) {
                      setSelectedSubjectGroup(value)
                      setSelectedSubjectGroupId(group.id)

                      // Reset subject selection
                      setSelectedSubject("")
                      setSelectedSubjectId("")
                    }
                  }}
                  disabled={!selectedGrade || subjectGroups.length === 0}
                >
                  <SelectTrigger id="subjectGroup">
                    <SelectValue placeholder="Select subject group" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name} ({group.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="subject">Select Subject</Label>
              {loadingSubjects ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedSubject}
                  onValueChange={(value) => {
                    const subject = assignedSubjects.find((s) => s.name === value)
                    if (subject) {
                      setSelectedSubject(value)
                      setSelectedSubjectId(subject.id)
                    }
                  }}
                  disabled={!selectedSubjectGroup || assignedSubjects.length === 0}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.name}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedGrade && selectedSection && selectedExamTermId && selectedSubject && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Students</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveAllMarks} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Marks
                  </>
                )}
              </Button>
            </div>
          </div>

          {assignedSubjects.length === 0 && !isAdmin && (
            <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
              You are not assigned to teach any subjects for Grade {selectedGrade}. Please contact the administrator.
            </div>
          )}

          {isAdmin && (
            <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded border border-blue-200">
              As an administrator, you have access to enter marks for all subjects.
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-4 bg-green-50 text-green-800 rounded border border-green-200 flex items-center">
              <Check className="h-5 w-5 mr-2" />
              All marks saved successfully!
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading students...</p>
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">Roll No.</th>
                        <th className="text-left p-4">Name</th>
                        <th className="text-left p-4">
                          Theory Marks {subjectConfig && `(${subjectConfig.maxTheoryMarks})`}
                        </th>
                        {subjectConfig?.hasPractical && (
                          <th className="text-left p-4">
                            Practical Marks {subjectConfig && `(${subjectConfig.maxPracticalMarks})`}
                          </th>
                        )}
                        <th className="text-left p-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const marks = studentMarks[student.id] || { theory: "", practical: "", remarks: "" }
                        const errors = formErrors[student.id] || {}

                        return (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">{student.rollNumber}</td>
                            <td className="p-4">{student.name}</td>
                            <td className="p-4">
                              <div className="w-24">
                                <Input
                                  type="number"
                                  min="0"
                                  max={subjectConfig?.maxTheoryMarks}
                                  value={marks.theory}
                                  onChange={(e) => handleInputChange(student.id, "theory", e.target.value)}
                                  className={errors.theory ? "border-red-500" : ""}
                                />
                                {errors.theory && <p className="text-red-500 text-xs mt-1">{errors.theory}</p>}
                              </div>
                            </td>
                            {subjectConfig?.hasPractical && (
                              <td className="p-4">
                                <div className="w-24">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={subjectConfig?.maxPracticalMarks}
                                    value={marks.practical}
                                    onChange={(e) => handleInputChange(student.id, "practical", e.target.value)}
                                    className={errors.practical ? "border-red-500" : ""}
                                  />
                                  {errors.practical && <p className="text-red-500 text-xs mt-1">{errors.practical}</p>}
                                </div>
                              </td>
                            )}
                            <td className="p-4">
                              <Input
                                value={marks.remarks}
                                onChange={(e) => handleInputChange(student.id, "remarks", e.target.value)}
                                placeholder="Optional remarks"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {selectedGrade && selectedSection
                      ? "No students found in this grade and section"
                      : "Please select a grade and section to view students"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
