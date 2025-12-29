"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

export interface MonthlyFee {
  id: string
  grade: string
  gradeId?: string
  gradeDisplayName: string
  section?: string
  sectionId?: string
  sectionDisplayName?: string
  monthlyAmount: number
  createdAt: Date
  updatedAt: Date
}

export function useMonthlyFees() {
  const [fees, setFees] = useState<MonthlyFee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFees = async () => {
    setLoading(true)
    setError(null)

    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load from localStorage
        const demoFees = localStorage.getItem("demoMonthlyFees")
        if (demoFees) {
          const parsedFees = JSON.parse(demoFees).map((fee: any) => ({
            ...fee,
            createdAt: new Date(fee.createdAt),
            updatedAt: new Date(fee.updatedAt),
          }))
          setFees(parsedFees)
        } else {
          // Set default demo fees if none exist
          const defaultFees: MonthlyFee[] = [
            {
              id: "pg-a",
              grade: "P.G",
              gradeId: "pg",
              gradeDisplayName: "P.G",
              section: "A",
              sectionId: "A",
              sectionDisplayName: "Section A",
              monthlyAmount: 1200,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "nursery-a",
              grade: "Nursery",
              gradeId: "nursery",
              gradeDisplayName: "Nursery",
              section: "A",
              sectionId: "A",
              sectionDisplayName: "Section A",
              monthlyAmount: 1300,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "lkg-a",
              grade: "LKG",
              gradeId: "lkg",
              gradeDisplayName: "LKG",
              section: "A",
              sectionId: "A",
              sectionDisplayName: "Section A",
              monthlyAmount: 1400,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]
          setFees(defaultFees)
          localStorage.setItem("demoMonthlyFees", JSON.stringify(defaultFees))
        }
      } else {
        // Load from Firestore
        const feesRef = collection(db, "monthly_fees")
        const querySnapshot = await getDocs(feesRef)

        const feesData: MonthlyFee[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          feesData.push({
            id: doc.id,
            grade: data.grade,
            gradeId: data.gradeId,
            gradeDisplayName: data.gradeDisplayName,
            section: data.section,
            sectionId: data.sectionId,
            sectionDisplayName: data.sectionDisplayName,
            monthlyAmount: data.monthlyAmount,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          })
        })

        setFees(feesData)
      }
    } catch (err) {
      console.error("Error loading fees:", err)
      setError("Failed to load monthly fees")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFees()
  }, [])

  const getMonthlyFeeForGrade = (grade: string, section?: string): number => {
    // First try to find exact match with grade and section
    if (section) {
      const exactMatch = fees.find((f) => f.grade === grade && f.section === section)
      if (exactMatch) {
        return exactMatch.monthlyAmount
      }
    }

    // Fallback to grade-only match
    const gradeMatch = fees.find((f) => f.grade === grade && !f.section)
    if (gradeMatch) {
      return gradeMatch.monthlyAmount
    }

    // If no exact match, try to find any fee for this grade
    const anyGradeMatch = fees.find((f) => f.grade === grade)
    if (anyGradeMatch) {
      return anyGradeMatch.monthlyAmount
    }

    // Return 0 if no fee is configured (instead of hardcoded fallback)
    return 0
  }

  const refreshFees = () => {
    loadFees()
  }

  return {
    fees,
    loading,
    error,
    getMonthlyFeeForGrade,
    refreshFees,
  }
}
