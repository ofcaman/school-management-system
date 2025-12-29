"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { Loader2 } from "lucide-react";
import { firebaseConfig } from "@/lib/firebase-config";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Student {
  id: string;
  name: string;
  grade: string;
  sectionId?: string;
  section?: string;
}

interface AttendanceInput {
  studentId: string;
  totalDaysPresent: number;
  totalSchoolDays: number;
}

// Exam term date ranges (adjust as per your school calendar)
const examTermRanges: { [key: string]: { start: Date; end: Date } } = {
  "First Term": { start: new Date("2025-07-01"), end: new Date("2025-09-30") },
  "Second Term": { start: new Date("2025-10-01"), end: new Date("2025-12-31") },
  "Final Term": { start: new Date("2026-01-01"), end: new Date("2026-03-31") },
};

// Generate random dates within a range
const generateRandomDates = (start: Date, end: Date, count: number): Date[] => {
  console.log(`Generating ${count} random dates between ${start} and ${end}`);
  const dates: Date[] = [];
  const startTime = start.getTime();
  const endTime = end.getTime();
  const range = endTime - startTime;

  while (dates.length < count) {
    const randomTime = startTime + Math.random() * range;
    const randomDate = new Date(randomTime);
    randomDate.setHours(0, 0, 0, 0); // Normalize to midnight
    if (!dates.some((d) => d.toDateString() === randomDate.toDateString())) {
      dates.push(randomDate);
    }
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
};

export default function ManualAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get("id") || "";
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedExamTerm, setSelectedExamTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: AttendanceInput }>({});
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<string[]>([]);

  // Mock data for grades and exam terms
  const grades = ["P.G", "Nursery", "Lkg", "Ukg", "1", "2", "3", "4", "5", "6"];
  const examTerms = ["First Term", "Second Term", "Final Term"];
  const defaultSchoolDays = 65; // Adjust based on exam term duration

  // Load sections when grade changes
  useEffect(() => {
    if (selectedGrade) {
      loadSections();
    }
  }, [selectedGrade]);

  // Load students when grade, section, or exam term changes
  useEffect(() => {
    if (selectedGrade && selectedExamTerm) {
      loadStudents();
    }
  }, [selectedGrade, selectedSection, selectedExamTerm]);

  const loadSections = async () => {
    try {
      console.log("Loading sections for grade:", selectedGrade);
      const sectionsQuery = query(collection(db, "sections"), where("grade", "==", selectedGrade));
      const sectionsSnapshot = await getDocs(sectionsQuery);
      const sectionList = sectionsSnapshot.docs.map((doc) => doc.data().sectionId);
      setSections(["all", ...sectionList]);
      console.log("Sections loaded:", sectionList);
      if (sectionList.length === 0) {
        console.log("No sections found for grade:", selectedGrade);
        toast({
          title: "Warning",
          description: `No sections found for grade ${selectedGrade}. You can still proceed with attendance for all sections.`,
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error loading sections:", error);
      toast({
        title: "Error",
        description: `Failed to load sections: ${error.message}. ${error.code === "permission-denied" ? "Please check Firestore permissions." : ""}`,
        variant: "destructive",
      });
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      console.log("Loading students for grade:", selectedGrade, "section:", selectedSection);
      let studentsQuery = query(collection(db, "students"), where("grade", "==", selectedGrade));
      if (selectedSection && selectedSection !== "all") {
        studentsQuery = query(
          collection(db, "students"),
          where("grade", "==", selectedGrade),
          where("sectionId", "==", selectedSection),
        );
      }
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList: Student[] = [];
      studentsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Student data:", { id: doc.id, ...data });
        studentsList.push({
          id: doc.id,
          name: data.name || "",
          grade: selectedGrade, // Use UI grade for consistency
          sectionId: data.sectionId || "",
          section: data.section || "",
        });
      });
      if (studentsList.length === 0) {
        console.log("No students found for grade:", selectedGrade);
        toast({
          title: "Error",
          description: `No students found for grade ${selectedGrade}. Please ensure students are added to the database with grade "${selectedGrade}".`,
          variant: "destructive",
        });
      }
      setStudents(studentsList);
      console.log("Students loaded:", studentsList);

      // Initialize attendance data with defaults
      const initialAttendance: { [key: string]: AttendanceInput } = {};
      studentsList.forEach((student) => {
        initialAttendance[student.id] = {
          studentId: student.id,
          totalDaysPresent: Math.floor(defaultSchoolDays * 0.9), // Default to 90% attendance
          totalSchoolDays: defaultSchoolDays,
        };
      });
      setAttendanceData(initialAttendance);
      console.log("Initialized attendance data:", initialAttendance);
    } catch (error: any) {
      console.error("Error loading students:", error);
      toast({
        title: "Error",
        description: `Failed to load students: ${error.message}. ${error.code === "permission-denied" ? "Please check Firestore permissions." : ""}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId: string, field: keyof AttendanceInput, value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: "Error",
        description: `${field === "totalDaysPresent" ? "Days Present" : "Total School Days"} must be a non-negative number.`,
        variant: "destructive",
      });
      return;
    }
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue,
      },
    }));
  };

  const handleSubmit = async () => {
    console.log("handleSubmit called with:", { selectedGrade, selectedExamTerm, attendanceData, students });
    if (!selectedGrade || !selectedExamTerm) {
      console.log("Validation failed: Missing grade or exam term");
      toast({
        title: "Error",
        description: "Please select both a grade and an exam term.",
        variant: "destructive",
      });
      return;
    }

    if (students.length === 0) {
      console.log("Validation failed: No students loaded");
      toast({
        title: "Error",
        description: "No students found for the selected grade/section. Please check your selection and database.",
        variant: "destructive",
      });
      return;
    }

    const termRange = examTermRanges[selectedExamTerm];
    if (!termRange) {
      console.log("Validation failed: Invalid exam term");
      toast({
        title: "Error",
        description: "Invalid exam term selected. Please choose a valid term.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check for existing attendance records
      console.log("Checking for existing attendance records...");
      for (const studentId of Object.keys(attendanceData)) {
        const existingQuery = query(
          collection(db, "attendance"),
          where("studentId", "==", studentId),
          where("examTerm", "==", selectedExamTerm),
        );
        const existingSnapshot = await getDocs(existingQuery);
        if (!existingSnapshot.empty) {
          const student = students.find((s) => s.id === studentId);
          console.log(`Duplicate found for student ${student?.name} in ${selectedExamTerm}`);
          toast({
            title: "Error",
            description: `Attendance already exists for ${student?.name} in ${selectedExamTerm}. Please delete existing records or choose a different term.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Save attendance records
      console.log("Saving attendance records for", students.length, "students...");
      const writePromises: Promise<any>[] = [];
      let savedRecords = 0;

      for (const studentId of Object.keys(attendanceData)) {
        const data = attendanceData[studentId];
        const student = students.find((s) => s.id === studentId);
        if (!student) {
          console.log(`Student not found for ID: ${studentId}`);
          continue;
        }

        if (data.totalDaysPresent > data.totalSchoolDays) {
          console.log(`Invalid attendance for ${student.name}: ${data.totalDaysPresent}/${data.totalSchoolDays}`);
          toast({
            title: "Error",
            description: `Invalid attendance for ${student.name}: Days present (${data.totalDaysPresent}) cannot exceed total school days (${data.totalSchoolDays}).`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Generate random dates for present days
        const presentDates = generateRandomDates(termRange.start, termRange.end, data.totalDaysPresent);
        console.log(`Generated ${presentDates.length} present dates for ${student.name}`);

        // Prepare "Present" records
        for (const date of presentDates) {
          writePromises.push(
            addDoc(collection(db, "attendance"), {
              studentId,
              grade: selectedGrade, // Use UI grade for consistency
              sectionId: selectedSection && selectedSection !== "all" ? selectedSection : "",
              section: student.section || "",
              date,
              status: "Present",
              examTerm: selectedExamTerm,
              createdAt: serverTimestamp(),
              createdBy: teacherId,
            }).then(() => {
              console.log(`Saved Present record for ${student.name} on ${date.toDateString()}`);
              savedRecords++;
            }).catch((error) => {
              console.error(`Failed to save Present record for ${student.name} on ${date.toDateString()}:`, error);
              throw error; // Re-throw to catch in outer try-catch
            })
          );
        }

        // Save "Absent" records for remaining days
        const absentDays = data.totalSchoolDays - data.totalDaysPresent;
        if (absentDays > 0) {
          const allDates = generateRandomDates(termRange.start, termRange.end, data.totalSchoolDays);
          const absentDates = allDates.filter((d) => !presentDates.some((pd) => pd.toDateString() === d.toDateString())).slice(0, absentDays);
          console.log(`Generated ${absentDates.length} absent dates for ${student.name}`);
          for (const date of absentDates) {
            writePromises.push(
              addDoc(collection(db, "attendance"), {
                studentId,
                grade: selectedGrade, // Use UI grade for consistency
                sectionId: selectedSection && selectedSection !== "all" ? selectedSection : "",
                section: student.section || "",
                date,
                status: "Absent",
                examTerm: selectedExamTerm,
                createdAt: serverTimestamp(),
                createdBy: teacherId,
              }).then(() => {
                console.log(`Saved Absent record for ${student.name} on ${date.toDateString()}`);
                savedRecords++;
              }).catch((error) => {
                console.error(`Failed to save Absent record for ${student.name} on ${date.toDateString()}:`, error);
                throw error; // Re-throw to catch in outer try-catch
              })
            );
          }
        }
      }

      // Execute all writes
      console.log(`Executing ${writePromises.length} write operations...`);
      await Promise.all(writePromises);

      console.log(`Attendance saved successfully: ${savedRecords} records for ${students.length} students`);
      toast({
        title: "Complete",
        description: `Attendance successfully marked for ${students.length} students in ${selectedExamTerm} (${savedRecords} records saved).`,
        variant: "default",
      });
      router.push(`/teacher/generate-report?id=${teacherId}`);
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Error",
        description: `Failed to save attendance: ${error.message}. ${error.code === "permission-denied" ? "Please check Firestore permissions in the Firebase Console." : "Please check your network or Firestore configuration."}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Manual Attendance Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section (Optional)</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section === "all" ? "All Sections" : section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="examTerm">Exam Term</Label>
              <Select value={selectedExamTerm} onValueChange={setSelectedExamTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam term" />
                </SelectTrigger>
                <SelectContent>
                  {examTerms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {students.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Enter Attendance</h3>
                {students.map((student) => (
                  <div key={student.id} className="flex items-center gap-4">
                    <div className="flex-1">{student.name}</div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Days Present"
                        value={attendanceData[student.id]?.totalDaysPresent ?? ""}
                        onChange={(e) => handleAttendanceChange(student.id, "totalDaysPresent", e.target.value)}
                        min="0"
                        className="border rounded p-2"
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Total Days"
                        value={attendanceData[student.id]?.totalSchoolDays ?? ""}
                        onChange={(e) => handleAttendanceChange(student.id, "totalSchoolDays", e.target.value)}
                        min="0"
                        className="border rounded p-2"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    console.log("Save Attendance button clicked");
                    handleSubmit();
                  }}
                  disabled={loading || !selectedGrade || !selectedExamTerm || students.length === 0}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Attendance"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}