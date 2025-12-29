"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, ArrowLeft, Upload, FileText, Check, X, AlertCircle } from 'lucide-react'
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMonthlyFees } from "./use-monthly-fees"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export default function AddStudentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Use the monthly fees hook
  const { fees, loading: feesLoading, error: feesError, getMonthlyFeeForGrade } = useMonthlyFees()

  // Janma Darta document
  const [janmaDartaDoc, setJanmaDartaDoc] = useState<File | null>(null)
  const [janmaDartaNumber, setJanmaDartaNumber] = useState("")

  // Form fields
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("") // Explicitly initialized as empty
  const [lastName, setLastName] = useState("")
  const [fatherName, setFatherName] = useState("")
  const [motherName, setMotherName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [dob, setDob] = useState("")
  const [rollNumber, setRollNumber] = useState("")
  const [grade, setGrade] = useState("")
  const [section, setSection] = useState("")
  const [symbolNumber, setSymbolNumber] = useState("")
  const [address, setAddress] = useState("")
  const [usesBus, setUsesBus] = useState(false)
  const [busRoute, setBusRoute] = useState("")
  const [dues, setDues] = useState("0")

  // Classes and sections from database
  const [classes, setClasses] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [availableSections, setAvailableSections] = useState<string[]>([])
  const [loadingClassData, setLoadingClassData] = useState(true)

  // Fee preview state
  const [previewMonthlyFee, setPreviewMonthlyFee] = useState<number>(0)

  // Memoize the fee calculation function to prevent infinite loops
  const updateFeePreview = useCallback(() => {
    if (grade) {
      const monthlyFee = getMonthlyFeeForGrade(grade, section)
      setPreviewMonthlyFee(monthlyFee)
    } else {
      setPreviewMonthlyFee(0)
    }
  }, [grade, section, getMonthlyFeeForGrade])

  useEffect(() => {
    checkPermission()
    fetchClassesAndSections()
  }, [])

  // Update available sections when grade changes
  useEffect(() => {
    if (grade) {
      setAvailableSections(sections)
    } else {
      setAvailableSections([])
      setSection("")
      setPreviewMonthlyFee(0)
    }
  }, [grade, sections])

  // Update fee preview when grade, section, or fees change
  useEffect(() => {
    updateFeePreview()
  }, [updateFeePreview])

  const fetchClassesAndSections = async () => {
    setLoadingClassData(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      if (isDemoMode) {
        setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
        setSections(["A", "B", "C", "D"])
        setLoadingClassData(false)
        return
      }

      const classesSnapshot = await getDocs(collection(db, "classes"))
      const classesData = classesSnapshot.docs.map((doc) => doc.data().name || doc.id)
      const sortedClasses = classesData.sort((a, b) => {
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

      if (sortedClasses.length === 0) {
        setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
      } else {
        setClasses(sortedClasses)
      }

      const sectionsSnapshot = await getDocs(collection(db, "sections"))
      const sectionsData = sectionsSnapshot.docs.map((doc) => doc.data().name || doc.id)
      if (sectionsData.length === 0) {
        setSections(["A", "B", "C", "D"])
      } else {
        setSections(sectionsData)
      }
    } catch (error) {
      console.error("Error fetching classes and sections:", error)
      setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
      setSections(["A", "B", "C", "D"])
    } finally {
      setLoadingClassData(false)
    }
  }

  const checkPermission = async () => {
    setPermissionChecking(true)
    try {
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
        const teacherId = localStorage.getItem("teacherId")
        if (teacherId) {
          await checkTeacherPermission(teacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to add students")
          router.push("/teacher/login")
        }
      } else {
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
          setPermissionMessage("Only principal or computer teacher can add students")
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleJanmaDartaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setJanmaDartaDoc(file)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = "First name is required"
    if (!lastName.trim()) errors.lastName = "Last name is required"
    if (!rollNumber.trim()) errors.rollNumber = "Roll number is required"
    if (!fatherName.trim()) errors.fatherName = "Father's name is required"
    if (!contactNumber.trim()) {
      errors.contactNumber = "Contact number is required"
    } else if (contactNumber.length !== 10 || !/^\d+$/.test(contactNumber)) {
      errors.contactNumber = "Enter a valid 10-digit contact number"
    }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      errors.dob = "Enter date in YYYY-MM-DD format (e.g., 2080-01-15)"
    }
    const duesValue = Number.parseInt(dues)
    if (isNaN(duesValue) || duesValue < 0) {
      errors.dues = "Dues cannot be negative"
    }
    if (!grade) errors.grade = "Please select a grade"
    if (!section) errors.section = "Please select a section"
    if (previewMonthlyFee === 0) {
      errors.grade = "No monthly fee configured for this grade/section. Please configure fees first."
    }
    // Optional: Warn if middleName is unexpectedly "prasad"
    if (middleName.trim() === "prasad") {
      console.warn("Unexpected middleName value: 'prasad'. Verify if this is intentional.")
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (localStorage.getItem("isDemoMode") === "true") {
      return "/placeholder-user.jpg"
    }
    const storageRef = ref(storage, `student_profile_pics/${Date.now()}_${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const uploadJanmaDartaToStorage = async (file: File): Promise<string> => {
    if (localStorage.getItem("isDemoMode") === "true") {
      return "/placeholder-document.pdf"
    }
    const storageRef = ref(storage, `student_documents/janma_darta/${Date.now()}_${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("middleName before submit:", middleName) // Debug log
    if (!validateForm()) return
    setLoading(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      if (!isDemoMode) {
        const studentsRef = collection(db, "students")
        const q = query(
          studentsRef,
          where("rollNumber", "==", rollNumber),
          where("grade", "==", grade),
          where("section", "==", section),
        )
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          setFormErrors({
            ...formErrors,
            rollNumber: `Roll number ${rollNumber} already exists in ${grade} Section ${section}`,
          })
          setLoading(false)
          return
        }
      }

      const monthlyFee = getMonthlyFeeForGrade(grade, section)
      if (monthlyFee === 0) {
        setFormErrors({
          ...formErrors,
          grade: "No monthly fee configured for this grade/section. Please configure fees first.",
        })
        setLoading(false)
        return
      }

      const transportationFee = usesBus ? 500 : 0
      let profilePictureUrl = ""
      if (selectedImage) {
        profilePictureUrl = await uploadImageToStorage(selectedImage)
      }
      let janmaDartaUrl = ""
      if (janmaDartaDoc) {
        janmaDartaUrl = await uploadJanmaDartaToStorage(janmaDartaDoc)
      }

      const fullName = middleName.trim()
        ? `${firstName.trim()} ${middleName.trim()} ${lastName.trim()}`
        : `${firstName.trim()} ${lastName.trim()}`

      const student: Omit<Student, "id"> = {
        address: address.trim() || "",
        attendance: 0,
        attendanceId: "",
        attendanceStatus: "",
        busRoute: usesBus ? busRoute.trim() : "",
        contactNumber: contactNumber.trim() || "",
        currentSubject: null,
        dob: dob.trim() || "",
        dues: Number.parseInt(dues) || 0,
        fatherName: fatherName.trim() || "",
        firstName: firstName.trim(),
        grade: grade || "",
        id: "",
        lastName: lastName.trim() || "",
        middleName: middleName.trim() || "", // Ensure empty string if blank
        monthlyFee: monthlyFee,
        motherName: motherName.trim() || "",
        name: fullName,
        percentage: 0,
        profilePictureUrl: profilePictureUrl || "",
        qrCode: null,
        rank: 0,
        resultPdfUrl: "",
        rollNumber: rollNumber.trim() || "",
        selected: false,
        subjects: [],
        symbolNumber: symbolNumber.trim() || "",
        totalClasses: 0,
        totalMarks: 0,
        transportationFee: transportationFee || 0,
        usesBus: usesBus || false,
        janmaDartaUrl: janmaDartaUrl || "",
        janmaDartaNumber: janmaDartaNumber.trim() || "",
        section: section || "",
        janmaDartaSection: section || "",
      }

      if (isDemoMode) {
        alert("Student added successfully (Demo Mode)")
        router.push("/teacher/dashboard?id=demo123")
      } else {
        await addDoc(collection(db, "students"), student)
        router.push("/teacher/dashboard?id=" + currentTeacher?.id)
      }
    } catch (error: any) {
      console.error("Error adding student:", error)
      alert(`Error adding student: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (permissionChecking || loadingClassData || feesLoading) {
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

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add New Student</h1>
      </div>

      {feesError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading fees: {feesError}. Please check your fee management configuration.
          </AlertDescription>
        </Alert>
      )}

      {fees.length === 0 && !feesLoading && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No monthly fees have been configured yet. Please set up fees in the{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => router.push("/teachers/fee-management?id=" + currentTeacher?.id)}
            >
              Fee Management
            </Button>{" "}
            section before adding students.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
          <CardDescription>Enter the details of the new student</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-gray-400">👤</span>
                )}
              </div>
              <div className="flex items-center">
                <Label
                  htmlFor="picture"
                  className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Picture
                </Label>
                <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={formErrors.firstName ? "border-red-500" : ""}
                />
                {formErrors.firstName && <p className="text-red-500 text-sm">{formErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={formErrors.lastName ? "border-red-500" : ""}
                />
                {formErrors.lastName && <p className="text-red-500 text-sm">{formErrors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fatherName">
                  Father's Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fatherName"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className={formErrors.fatherName ? "border-red-500" : ""}
                />
                {formErrors.fatherName && <p className="text-red-500 text-sm">{formErrors.fatherName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother's Name</Label>
                <Input id="motherName" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className={formErrors.contactNumber ? "border-red-500" : ""}
                />
                {formErrors.contactNumber && <p className="text-red-500 text-sm">{formErrors.contactNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth (YYYY-MM-DD)</Label>
                <Input
                  id="dob"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="2080-01-15"
                  className={formErrors.dob ? "border-red-500" : ""}
                />
                {formErrors.dob && <p className="text-red-500 text-sm">{formErrors.dob}</p>}
              </div>
            </div>

            <div className="space-y-4 border rounded-md p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  <h3 className="font-medium">Janma Darta (Birth Registration)</h3>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={janmaDartaDoc ? "default" : "outline"} className="ml-2">
                        {janmaDartaDoc ? (
                          <span className="flex items-center">
                            <Check className="h-3 w-3 mr-1" /> Document Added
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <X className="h-3 w-3 mr-1" /> No Document
                          </span>
                        )}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {janmaDartaDoc
                        ? `Selected file: ${janmaDartaDoc.name}`
                        : "Please upload the birth registration document"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="janmaDartaNumber">Janma Darta Number</Label>
                  <Input
                    id="janmaDartaNumber"
                    value={janmaDartaNumber}
                    onChange={(e) => setJanmaDartaNumber(e.target.value)}
                    placeholder="e.g. 123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="janmaDartaDoc">Upload Document</Label>
                  <div className="flex items-center">
                    <Label
                      htmlFor="janmaDartaDoc"
                      className="cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-md flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {janmaDartaDoc ? "Change Document" : "Upload Document"}
                    </Label>
                    <Input
                      id="janmaDartaDoc"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleJanmaDartaChange}
                    />
                    {janmaDartaDoc && (
                      <span className="ml-2 text-sm text-gray-500 truncate max-w-[150px]">{janmaDartaDoc.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Accepted formats: PDF, JPG, PNG</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">
                  Grade <span className="text-red-500">*</span>
                </Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className={formErrors.grade ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.grade && <p className="text-red-500 text-sm">{formErrors.grade}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">
                  Section <span className="text-red-500">*</span>
                </Label>
                <Select value={section} onValueChange={setSection} disabled={!grade}>
                  <SelectTrigger className={formErrors.section ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.section && <p className="text-red-500 text-sm">{formErrors.section}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNumber">
                  Roll Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rollNumber"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className={formErrors.rollNumber ? "border-red-500" : ""}
                />
                {formErrors.rollNumber && <p className="text-red-500 text-sm">{formErrors.rollNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbolNumber">Symbol Number</Label>
                <Input id="symbolNumber" value={symbolNumber} onChange={(e) => setSymbolNumber(e.target.value)} />
              </div>
            </div>

            {(grade || section) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Fee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Monthly Fee:</span>
                    <p className="font-semibold text-blue-900">
                      {previewMonthlyFee > 0 ? `Rs. ${previewMonthlyFee.toLocaleString()}` : "Not configured"}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Term Fee (3 months):</span>
                    <p className="font-semibold text-blue-900">
                      {previewMonthlyFee > 0 ? `Rs. ${(previewMonthlyFee * 3).toLocaleString()}` : "Not configured"}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Transportation Fee:</span>
                    <p className="font-semibold text-blue-900">
                      {usesBus ? "Rs. 500" : "Rs. 0"} {usesBus && "(Bus)"}
                    </p>
                  </div>
                </div>
                {previewMonthlyFee === 0 && (
                  <p className="text-red-600 text-sm mt-2">
                    ⚠️ No fee configured for {grade} {section ? `Section ${section}` : ""}. Please configure fees first.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="usesBus" checked={usesBus} onCheckedChange={setUsesBus} />
                <Label htmlFor="usesBus">Uses School Bus</Label>
              </div>

              {usesBus && (
                <div className="space-y-2">
                  <Label htmlFor="busRoute">Bus Route</Label>
                  <Input id="busRoute" value={busRoute} onChange={(e) => setBusRoute(e.target.value)} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dues">Dues (if any)</Label>
              <Input
                id="dues"
                type="number"
                value={dues}
                onChange={(e) => setDues(e.target.value)}
                className={formErrors.dues ? "border-red-500" : ""}
              />
              {formErrors.dues && <p className="text-red-500 text-sm">{formErrors.dues}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading || previewMonthlyFee === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Student"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}