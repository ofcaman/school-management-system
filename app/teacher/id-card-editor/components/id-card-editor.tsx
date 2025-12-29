"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useDrag, useDrop } from "react-dnd"
import { QRCodeSVG } from "qrcode.react"
import type { CardElement, CardSettings, Student } from "./types"

interface DraggableElementProps {
  element: CardElement
  onMove: (id: string, position: { x: number; y: number }) => void
  onResize: (id: string, size: { width: number; height: number }) => void
  onSelect: (id: string) => void
  isSelected: boolean
  student: Student
  zIndex: number
  cardDimensions: { width: number; height: number }
}

const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  onMove,
  onResize,
  onSelect,
  isSelected,
  student,
  zIndex,
  cardDimensions,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const [resizing, setResizing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startSize, setStartSize] = useState({ width: 0, height: 0 })

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "card-element",
    item: { id: element.id, type: element.type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizing && ref.current) {
        const dx = e.clientX - startPos.x
        const dy = e.clientY - startPos.y

        // Ensure element stays within card boundaries
        const newWidth = Math.max(20, Math.min(startSize.width + dx, cardDimensions.width - element.position.x))
        const newHeight = Math.max(20, Math.min(startSize.height + dy, cardDimensions.height - element.position.y))

        onResize(element.id, {
          width: newWidth,
          height: newHeight,
        })
      }
    }

    const handleMouseUp = () => {
      setResizing(false)
    }

    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizing, startPos, startSize, element.id, element.position.x, element.position.y, onResize, cardDimensions])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setResizing(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setStartSize({ width: element.size.width, height: element.size.height })
  }

  const handleElementClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(element.id)
  }

  // Initialize drag
  drag(ref)

  // Render different element types
  const renderElementContent = () => {
    switch (element.type) {
      case "text":
        return (
          <div
            style={{
              fontSize: `${(element.style as any).fontSize}px`,
              fontWeight: (element.style as any).fontWeight,
              color: (element.style as any).color,
              fontStyle: (element.style as any).fontStyle || "normal",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: element.id.includes("banner")
                ? "center"
                : (element.style as any).textAlign === "center"
                  ? "center"
                  : (element.style as any).textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              userSelect: "none",
              backgroundColor: (element.style as any).backgroundColor || "transparent",
              borderRadius: (element.style as any).borderRadius ? `${(element.style as any).borderRadius}px` : "0",
              border: (element.style as any).border || "none",
              textAlign: (element.style as any).textAlign || "left",
              whiteSpace: "pre-line", // Allow line breaks in text
              overflow: "hidden",
              padding: "2px",
            }}
          >
            {element.content}
          </div>
        )
      case "image":
        return (
          <img
            src={element.content || "/placeholder.svg"}
            alt="Element"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: `${(element.style as any).borderRadius}px`,
              userSelect: "none",
              border: (element.style as any).border || "none",
            }}
            draggable={false}
          />
        )
      case "field":
        if (element.content === "profilePictureUrl") {
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                borderRadius: (element.style as any).borderRadius ? `${(element.style as any).borderRadius}px` : "4px",
                border: (element.style as any).border || "none",
              }}
            >
              <img
                src={student.profilePictureUrl || "/placeholder.svg?height=300&width=300&query=student"}
                alt="Student"
                style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }}
                draggable={false}
              />
            </div>
          )
        } else {
          const fieldValue = student[element.content as keyof Student] || `{${element.content}}`
          return (
            <div
              style={{
                fontSize: `${(element.style as any).fontSize}px`,
                fontWeight: (element.style as any).fontWeight,
                color: (element.style as any).color,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  (element.style as any).textAlign === "center"
                    ? "center"
                    : (element.style as any).textAlign === "right"
                      ? "flex-end"
                      : "flex-start",
                userSelect: "none",
                overflow: "hidden",
                padding: "2px",
              }}
            >
              {fieldValue}
            </div>
          )
        }
      case "qrcode":
        const fields = element.content.split(",")
        const qrData: Record<string, any> = {}
        fields.forEach((field) => {
          qrData[field] = student[field as keyof Student] || ""
        })
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              userSelect: "none",
              backgroundColor: "white",
              padding: "2px",
            }}
          >
            <QRCodeSVG
              value={JSON.stringify(qrData)}
              size={Math.min(element.size.width, element.size.height)}
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          </div>
        )
      default:
        return <div>Unknown element type</div>
    }
  }

  return (
    <div
      ref={ref}
      className={`absolute cursor-move ${isSelected ? "ring-2 ring-blue-500" : ""}`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isSelected ? 100 : zIndex,
        backgroundColor: isSelected ? "rgba(59, 130, 246, 0.05)" : "transparent",
      }}
      onClick={handleElementClick}
    >
      {renderElementContent()}

      {isSelected && (
        <>
          {/* Resize handle - bottom right */}
          <div
            ref={resizeRef}
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
            onMouseDown={handleResizeStart}
          />

          {/* Position indicators */}
          <div className="absolute -top-5 left-0 text-xs bg-blue-500 text-white px-1 rounded">
            {Math.round(element.position.x)},{Math.round(element.position.y)}
          </div>

          {/* Size indicators */}
          <div className="absolute -bottom-5 right-0 text-xs bg-blue-500 text-white px-1 rounded">
            {Math.round(element.size.width)}×{Math.round(element.size.height)}
          </div>
        </>
      )}
    </div>
  )
}

interface IdCardEditorProps {
  orientation: "landscape" | "portrait"
  elements: CardElement[]
  settings: CardSettings
  onElementsChange: (elements: CardElement[]) => void
  onElementSelect: (id: string | null) => void
  selectedElementId: string | null
  student: Student
  onElementUpdate: (id: string, updates: Partial<CardElement>) => void
}

export const IdCardEditor: React.FC<IdCardEditorProps> = ({
  orientation,
  elements,
  settings,
  onElementsChange,
  onElementSelect,
  selectedElementId,
  student,
  onElementUpdate,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)

  // Standard card dimensions in inches
  const LANDSCAPE_WIDTH = 3.375
  const LANDSCAPE_HEIGHT = 2.125
  const PORTRAIT_WIDTH = 2.125
  const PORTRAIT_HEIGHT = 3.375

  // Convert to pixels (assuming 96 DPI)
  const DPI = 96
  const landscapeWidthPx = LANDSCAPE_WIDTH * DPI
  const landscapeHeightPx = LANDSCAPE_HEIGHT * DPI
  const portraitWidthPx = PORTRAIT_WIDTH * DPI
  const portraitHeightPx = PORTRAIT_HEIGHT * DPI

  // Get actual dimensions based on orientation
  const cardWidth = orientation === "landscape" ? landscapeWidthPx : portraitWidthPx
  const cardHeight = orientation === "landscape" ? landscapeHeightPx : portraitHeightPx

  const [, drop] = useDrop(() => ({
    accept: "card-element",
    drop: (item: { id: string; type: string }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset()
      if (delta && editorRef.current) {
        const element = elements.find((el) => el.id === item.id)
        if (element) {
          const rect = editorRef.current.getBoundingClientRect()
          const x = Math.max(0, Math.min(element.position.x + delta.x, cardWidth - element.size.width))
          const y = Math.max(0, Math.min(element.position.y + delta.y, cardHeight - element.size.height))

          moveElement(item.id, { x, y })
        }
      }
    },
  }))

  const moveElement = (id: string, position: { x: number; y: number }) => {
    const updatedElements = elements.map((el) => (el.id === id ? { ...el, position } : el))
    onElementsChange(updatedElements)
  }

  const resizeElement = (id: string, size: { width: number; height: number }) => {
    const updatedElements = elements.map((el) => (el.id === id ? { ...el, size } : el))
    onElementsChange(updatedElements)
  }

  const handleEditorClick = () => {
    onElementSelect(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" && selectedElementId) {
      const updatedElements = elements.filter((el) => el.id !== selectedElementId)
      onElementsChange(updatedElements)
      onElementSelect(null)
    }
  }

  // Sort elements by z-index for proper layering
  const sortedElements = [...elements].sort((a, b) => {
    // Background elements should be rendered first (lowest z-index)
    if (a.id.includes("bg") || a.id.includes("header-bg") || a.id.includes("banner")) return -1
    if (b.id.includes("bg") || b.id.includes("header-bg") || b.id.includes("banner")) return 1
    return 0
  })

  // Initialize drop target
  drop(editorRef)

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div
        className="relative border rounded-md overflow-hidden bg-white"
        style={{
          width: orientation === "landscape" ? "3.375in" : "2.125in",
          height: orientation === "landscape" ? "2.125in" : "3.375in",
          margin: "0 auto",
        }}
        ref={editorRef}
        onClick={handleEditorClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Grid lines for precise positioning */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full grid grid-cols-8 opacity-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`col-${i}`} className="border-r border-gray-400 h-full" />
            ))}
          </div>
          <div className="w-full h-full grid grid-rows-8 opacity-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`row-${i}`} className="border-b border-gray-400 w-full" />
            ))}
          </div>
        </div>

        {/* Elements */}
        {sortedElements.map((element, index) => (
          <DraggableElement
            key={element.id}
            element={element}
            onMove={moveElement}
            onResize={resizeElement}
            onSelect={onElementSelect}
            isSelected={selectedElementId === element.id}
            student={student}
            zIndex={index + 1}
            cardDimensions={{ width: cardWidth, height: cardHeight }}
          />
        ))}
      </div>
    </div>
  )
}
