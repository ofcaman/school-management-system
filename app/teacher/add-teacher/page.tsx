'use client';

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

import { firebaseConfig } from "@/lib/firebase-config";
import type { Teacher } from "@/lib/models";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function AddTeacherPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [qualification, setQualification] = useState("");
  const [assignedClass, setAssignedClass] = useState("");
  const [assignedSection, setAssignedSection] = useState("");
  const [roles, setRoles] = useState<string[]>(["subject_teacher"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [classes, setClasses] = useState<string[]>(["none"]);
  const [sections, setSections] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get("id");

  useEffect(() => {
    const fetchClassesAndSections = async () => {
      setLoadingData(true);
      try {
        const isDemoMode = localStorage.getItem("isDemoMode") === "true";
        if (isDemoMode) {
          setClasses(["none", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
          setSections(["A", "B", "C", "D"]);
          setLoadingData(false);
          return;
        }

        const classesSnapshot = await getDocs(collection(db, "classes"));
        const classNames = classesSnapshot.docs.map((doc) => doc.data().name || doc.id);
        const sortedClasses = [
          "none",
          ...classNames.sort((a, b) => {
            if (a === "Nursery") return -1;
            if (b === "Nursery") return 1;
            if (a === "LKG") return -1;
            if (b === "LKG") return 1;
            if (a === "UKG") return -1;
            if (b === "UKG") return 1;
            return parseInt(a) - parseInt(b);
          }),
        ];
        setClasses(sortedClasses);

        const sectionsSnapshot = await getDocs(collection(db, "sections"));
        const sectionNames = sectionsSnapshot.docs.map((doc) => doc.data().name || doc.id);
        setSections(sectionNames);
      } catch (err) {
        console.error("Error loading class/section data", err);
        setClasses(["none", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
        setSections(["A", "B", "C", "D"]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchClassesAndSections();
  }, []);

  useEffect(() => {
    if (assignedClass && assignedClass !== "none") {
      setAvailableSections(sections);
    } else {
      setAvailableSections([]);
      setAssignedSection("");
    }
  }, [assignedClass, sections]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setQualification("");
    setAssignedClass("");
    setAssignedSection("");
    setRoles(["subject_teacher"]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (!name || !email || !phone) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      const isDemoMode = localStorage.getItem("isDemoMode") === "true";

      const teacherData: Omit<Teacher, "id"> = {
        name: name.toUpperCase(),
        email,
        phone,
        qualification,
        roles,
        assignedClass,
        assignedSection,
        profileImageUrl: "",
        active: true,
      };

      if (!isDemoMode) {
        // Create Firebase Auth user
        const defaultPassword = phone;
        try {
          await createUserWithEmailAndPassword(auth, email, defaultPassword);
          await sendPasswordResetEmail(auth, email);
          console.log(`Reset email sent to ${email}`);
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            throw new Error("This email is already registered.");
          } else {
            throw authErr;
          }
        }

        await addDoc(collection(db, "teachers"), teacherData);
      } else {
        console.log("Demo mode: added teacher", teacherData);
      }

      setSuccess(true);
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleClassChange = (value: string) => {
    setAssignedClass(value === "none" ? "" : value);
    setAssignedSection("");
    if (value !== "none" && !roles.includes("class_teacher")) {
      setRoles((prev) => [...prev, "class_teacher"]);
    }
    if (value === "none" && roles.includes("class_teacher")) {
      setRoles((prev) => prev.filter((r) => r !== "class_teacher"));
    }
  };

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Add Teacher</h1>
          <p className="text-muted-foreground">Add a new teacher to the system</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher Information</CardTitle>
          <CardDescription>Fill out the form to register a teacher</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input id="qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Class</Label>
                  <Select value={assignedClass} onValueChange={handleClassChange}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls} value={cls}>{cls === "none" ? "None" : `Class ${cls}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Section</Label>
                  <Select
                    value={assignedSection}
                    onValueChange={setAssignedSection}
                    disabled={!assignedClass || assignedClass === "none"}
                  >
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem key={section} value={section}>Section {section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6">
                <Label className="mb-2 block">Roles</Label>
                <div className="grid grid-cols-2 gap-4">
                  {["principal", "computer_teacher", "class_teacher", "subject_teacher"].map((role) => (
                    <div className="flex items-center space-x-2" key={role}>
                      <Checkbox
                        id={`role-${role}`}
                        checked={roles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                        disabled={role === "class_teacher" && assignedClass && assignedClass !== "none"}
                      />
                      <Label htmlFor={`role-${role}`}>{role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="mt-4 text-red-500">{error}</p>}
              {success && <p className="mt-4 text-green-600">Teacher added & reset email sent successfully!</p>}

              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Teacher
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
