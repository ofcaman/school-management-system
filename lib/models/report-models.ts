export interface GeneratedReport {
  id: string
  grade: string
  examTerm: string
  generatedBy: string
  generatedAt: Date
  batchId: string
  totalStudents: number
  successfulReports: number
  failedReports: number
  reportPath: string
}
