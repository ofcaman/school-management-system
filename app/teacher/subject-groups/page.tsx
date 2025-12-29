"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { ArrowLeft, Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface Subject {
  id: string
  name: string
  code: string
}

interface SubjectGroup {
  id: string
  name: string
  code: string
  subjects: string[]
  description: string
  forClass?: string
}

interface Class {
  id: string
  name: string
  displayName: string
}

export default function SubjectGroupsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([])
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupCode, setNewGroupCode] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<SubjectGroup | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState<SubjectGroup | null>(null)
  const [editName, setEditName] = useState("")
  const [editCode, setEditCode] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSubjects, setEditSubjects] = useState<string[]>([])
  const [editClass, setEditClass] = useState<string>("")

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    fetchData()
  }, [teacherId, router])

  const fetchData = async () => {
    setLoading(true)
    try {
      await fetchSubjects()
      await fetchClasses()
      await fetchSubjectGroups()
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
          { id: "class4", name: "4", displayName: "Class 4" },
          { id: "class5", name: "5", displayName: "Class 5" },
          { id: "class6", name: "LKG", displayName: "LKG" },
          { id: "class7", name: "UKG", displayName: "UKG" },
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

  const fetchSubjectGroups = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo subject groups
        const demoGroups: SubjectGroup[] = [
          {
            id: "group1",
            name: "Primary Level Core",
            code: "PLC",
            subjects: ["subject1", "subject2", "subject3", "subject6"],
            description: "Core subjects for primary level",
            forClass: "class1",
          },
          {
            id: "group2",
            name: "Middle School Core",
            code: "MSC",
            subjects: ["subject1", "subject2", "subject3", "subject4", "subject6"],
            description: "Core subjects for middle school",
            forClass: "class4",
          },
          {
            id: "group3",
            name: "Kindergarten Basics",
            code: "KGB",
            subjects: ["subject1", "subject2", "subject6"],
            description: "Basic subjects for kindergarten",
            forClass: "class6",
          },
        ]
        setSubjectGroups(demoGroups)
      } else {
        // Fetch real subject groups from Firestore
        const groupsSnapshot = await getDocs(collection(db, "subject_groups"))
        const groupsList: SubjectGroup[] = []
        groupsSnapshot.forEach((doc) => {
          groupsList.push({
            id: doc.id,
            ...(doc.data() as Omit<SubjectGroup, "id">),
          })
        })
        setSubjectGroups(groupsList)
      }
    } catch (error) {
      console.error("Error fetching subject groups:", error)
      throw error
    }
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      })
      return
    }

    if (!newGroupCode.trim()) {
      toast({
        title: "Error",
        description: "Group code is required",
        variant: "destructive",
      })
      return
    }

    if (selectedSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one subject",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Add to demo groups
        const newGroup: SubjectGroup = {
          id: `group${Date.now()}`,
          name: newGroupName,
          code: newGroupCode,
          subjects: selectedSubjects,
          description: newGroupDescription,
          forClass: selectedClass || undefined,
        }
        setSubjectGroups([...subjectGroups, newGroup])
        toast({
          title: "Success",
          description: "Subject group added successfully (Demo Mode)",
        })
      } else {
        // Add to Firestore
        const groupData: Omit<SubjectGroup, "id"> = {
          name: newGroupName,
          code: newGroupCode,
          subjects: selectedSubjects,
          description: newGroupDescription,
        }

        if (selectedClass && selectedClass !== "all") {
          groupData.forClass = selectedClass
        }

        const docRef = await addDoc(collection(db, "subject_groups"), groupData)

        const newGroup: SubjectGroup = {
          id: docRef.id,
          ...groupData,
        }

        setSubjectGroups([...subjectGroups, newGroup])
        toast({
          title: "Success",
          description: "Subject group added successfully",
        })
      }

      // Reset form
      setNewGroupName("")
      setNewGroupCode("")
      setNewGroupDescription("")
      setSelectedSubjects([])
      setSelectedClass("all")
    } catch (error) {
      console.error("Error adding subject group:", error)
      toast({
        title: "Error",
        description: "Failed to add subject group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (group: SubjectGroup) => {
    setGroupToEdit(group)
    setEditName(group.name)
    setEditCode(group.code)
    setEditDescription(group.description)
    setEditSubjects(group.subjects)
    setEditClass(group.forClass || "")
    setEditDialogOpen(true)
  }

  const handleEditGroup = async () => {
    if (!groupToEdit) return

    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      })
      return
    }

    if (!editCode.trim()) {
      toast({
        title: "Error",
        description: "Group code is required",
        variant: "destructive",
      })
      return
    }

    if (editSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one subject",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Update in demo groups
        const updatedGroups = subjectGroups.map((group) =>
          group.id === groupToEdit.id
            ? {
                ...group,
                name: editName,
                code: editCode,
                subjects: editSubjects,
                description: editDescription,
                forClass: editClass || undefined,
              }
            : group,
        )
        setSubjectGroups(updatedGroups)
        toast({
          title: "Success",
          description: "Subject group updated successfully (Demo Mode)",
        })
      } else {
        // Update in Firestore
        const groupRef = doc(db, "subject_groups", groupToEdit.id)
        const updateData: Partial<SubjectGroup> = {
          name: editName,
          code: editCode,
          subjects: editSubjects,
          description: editDescription,
        }

        if (editClass && editClass !== "all") {
          updateData.forClass = editClass
          await updateDoc(groupRef, updateData)
        } else if (groupToEdit.forClass) {
          // Remove forClass if it was previously set but now set to "all"
          await updateDoc(groupRef, {
            name: editName,
            code: editCode,
            subjects: editSubjects,
            description: editDescription,
            forClass: null,
          })
        } else {
          await updateDoc(groupRef, updateData)
        }

        // Update local state
        const updatedGroups = subjectGroups.map((group) =>
          group.id === groupToEdit.id
            ? {
                ...group,
                name: editName,
                code: editCode,
                subjects: editSubjects,
                description: editDescription,
                forClass: editClass || undefined,
              }
            : group,
        )
        setSubjectGroups(updatedGroups)
        toast({
          title: "Success",
          description: "Subject group updated successfully",
        })
      }

      // Close dialog
      setEditDialogOpen(false)
      setGroupToEdit(null)
    } catch (error) {
      console.error("Error updating subject group:", error)
      toast({
        title: "Error",
        description: "Failed to update subject group. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (group: SubjectGroup) => {
    setGroupToDelete(group)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!groupToDelete) return

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Remove from demo groups
        const filteredGroups = subjectGroups.filter((group) => group.id !== groupToDelete.id)
        setSubjectGroups(filteredGroups)
        toast({
          title: "Success",
          description: "Subject group deleted successfully (Demo Mode)",
        })
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "subject_groups", groupToDelete.id))

        // Update local state
        const filteredGroups = subjectGroups.filter((group) => group.id !== groupToDelete.id)
        setSubjectGroups(filteredGroups)
        toast({
          title: "Success",
          description: "Subject group deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting subject group:", error)
      toast({
        title: "Error",
        description: "Failed to delete subject group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setGroupToDelete(null)
    }
  }

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    )
  }

  const toggleEditSubjectSelection = (subjectId: string) => {
    setEditSubjects((prev) => (prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]))
  }

  const getSubjectNameById = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId)
    return subject ? subject.name : "Unknown"
  }

  const getClassNameById = (classId: string) => {
    const classItem = classes.find((c) => c.id === classId)
    return classItem ? classItem.displayName : "All Classes"
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-5xl">
      <Toaster />

      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Manage Subject Groups</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add New Subject Group</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Primary Level Core"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupCode">Group Code</Label>
                  <Input
                    id="groupCode"
                    placeholder="e.g., PLC"
                    value={newGroupCode}
                    onChange={(e) => setNewGroupCode(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forClass">For Class (Optional)</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger id="forClass">
                      <SelectValue placeholder="Select a class or leave empty for all" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Description (Optional)</Label>
                  <Input
                    id="groupDescription"
                    placeholder="Description of this subject group"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Subjects</Label>
                  {subjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${subject.id}`}
                            checked={selectedSubjects.includes(subject.id)}
                            onCheckedChange={() => toggleSubjectSelection(subject.id)}
                          />
                          <Label htmlFor={`subject-${subject.id}`} className="cursor-pointer">
                            {subject.name} ({subject.code})
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No subjects available. Please add subjects first.
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || subjects.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Subject Group
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Subject Groups</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectGroups.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.code}</TableCell>
                          <TableCell>
                            {group.forClass ? (
                              <Badge variant="outline">{getClassNameById(group.forClass)}</Badge>
                            ) : (
                              <span className="text-muted-foreground">All Classes</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {group.subjects.slice(0, 3).map((subjectId) => (
                                <Badge key={subjectId} variant="outline">
                                  {getSubjectNameById(subjectId)}
                                </Badge>
                              ))}
                              {group.subjects.length > 3 && (
                                <Badge variant="outline">+{group.subjects.length - 3} more</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(group)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => confirmDelete(group)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No subject groups found. Add your first subject group.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Subject Group Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subject Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editGroupName">Group Name</Label>
                <Input id="editGroupName" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editGroupCode">Group Code</Label>
                <Input id="editGroupCode" value={editCode} onChange={(e) => setEditCode(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editForClass">For Class (Optional)</Label>
              <Select value={editClass} onValueChange={setEditClass}>
                <SelectTrigger id="editForClass">
                  <SelectValue placeholder="Select a class or leave empty for all" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editGroupDescription">Description (Optional)</Label>
              <Input
                id="editGroupDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Subjects</Label>
              {subjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 mt-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-subject-${subject.id}`}
                        checked={editSubjects.includes(subject.id)}
                        onCheckedChange={() => toggleEditSubjectSelection(subject.id)}
                      />
                      <Label htmlFor={`edit-subject-${subject.id}`} className="cursor-pointer">
                        {subject.name} ({subject.code})
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No subjects available.</div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the subject group "{groupToDelete?.name}". This action cannot be undone.
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
