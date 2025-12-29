import { Button } from "@/components/ui/button"
import { BadgeIcon as IdCard } from "lucide-react"
import Link from "next/link"

interface IdCardButtonProps {
  studentId: string
  className?: string
}

export default function IdCardButton({ studentId, className = "" }: IdCardButtonProps) {
  return (
    <Link href={`/teacher/id-card/${studentId}`}>
      <Button variant="outline" size="sm" className={className}>
        <IdCard className="h-4 w-4 mr-1" />
        ID Card
      </Button>
    </Link>
  )
}
