"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import type { CardElement, CardSettings, Student } from "./types"

interface IdCardPreviewProps {
  orientation: "landscape" | "portrait"
  elements: CardElement[]
  settings: CardSettings
  student: Student
}

export const IdCardPreview: React.FC<IdCardPreviewProps> = ({ orientation, elements, settings, student }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

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

  // Calculate scale factor for responsive rendering
  useEffect(() => {
    if (containerRef.current) {
      const updateScale = () => {
        const containerWidth = containerRef.current?.clientWidth || 0
        const containerHeight = containerRef.current?.clientHeight || 0

        setContainerSize({
          width: containerWidth,
          height: containerHeight,
        })

        // Calculate scale based on container size
        const widthScale = containerWidth / cardWidth
        const heightScale = containerHeight / cardHeight

        // Use the smaller scale to ensure the card fits within the container
        setScale(Math.min(widthScale, heightScale, 1)) // Cap at 1 to prevent enlargement
      }

      updateScale()

      // Update scale on window resize
      window.addEventListener("resize", updateScale)
      return () => window.removeEventListener("resize", updateScale)
    }
  }, [orientation, cardWidth, cardHeight])

  // Sort elements by z-index for proper layering
  const sortedElements = [...elements].sort((a, b) => {
    // Background elements should be rendered first (lowest z-index)
    if (a.id.includes("bg") || a.id.includes("header-bg") || a.id.includes("banner")) return -1
    if (b.id.includes("bg") || b.id.includes("header-bg") || b.id.includes("banner")) return 1
    return 0
  })

  // Render different element types with proper scaling
  const renderElement = (element: CardElement) => {
    // Base styles for all elements
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      left: `${element.position.x}px`,
      top: `${element.position.y}px`,
      width: `${element.size.width}px`,
      height: `${element.size.height}px`,
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      boxSizing: "border-box",
    }

    switch (element.type) {
      case "text":
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              fontSize: `${(element.style as any).fontSize}px`,
              fontWeight: (element.style as any).fontWeight,
              color: (element.style as any).color,
              fontStyle: (element.style as any).fontStyle || "normal",
              display: "flex",
              alignItems: "center",
              justifyContent: element.id.includes("banner")
                ? "center"
                : (element.style as any).textAlign === "center"
                  ? "center"
                  : (element.style as any).textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              backgroundColor: (element.style as any).backgroundColor || "transparent",
              borderRadius: (element.style as any).borderRadius ? `${(element.style as any).borderRadius}px` : "0",
              border: (element.style as any).border || "none",
              textAlign: (element.style as any).textAlign || "left",
              whiteSpace: "pre-line", // Allow line breaks in text
              overflow: "hidden",
              zIndex: element.id.includes("header") || element.id.includes("banner") ? 0 : 1,
              padding: "2px",
            }}
          >
            {element.content}
          </div>
        )
      case "image":
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              zIndex: 1,
              overflow: "hidden",
              borderRadius: (element.style as any).borderRadius ? `${(element.style as any).borderRadius}px` : "0",
              border: (element.style as any).border || "none",
            }}
          >
            <img
              src={element.content || "/placeholder.svg"}
              alt="Element"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        )
      case "field":
        if (element.content === "profilePictureUrl") {
          return (
            <div
              key={element.id}
              style={{
                ...baseStyle,
                overflow: "hidden",
                borderRadius: (element.style as any).borderRadius ? `${(element.style as any).borderRadius}px` : "4px",
                border: (element.style as any).border || "none",
                zIndex: 1,
              }}
            >
              <img
                src={student.profilePictureUrl || "/placeholder.svg?height=300&width=300&query=student"}
                alt="Student"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )
        } else {
          const fieldValue = student[element.content as keyof Student] || `{${element.content}}`
          return (
            <div
              key={element.id}
              style={{
                ...baseStyle,
                fontSize: `${(element.style as any).fontSize}px`,
                fontWeight: (element.style as any).fontWeight,
                color: (element.style as any).color,
                display: "flex",
                alignItems: "center",
                justifyContent:
                  (element.style as any).textAlign === "center"
                    ? "center"
                    : (element.style as any).textAlign === "right"
                      ? "flex-end"
                      : "flex-start",
                overflow: "hidden",
                zIndex: 1,
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
            key={element.id}
            style={{
              ...baseStyle,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1,
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
        return null
    }
  }

  return (
    <div className="flex justify-center items-center w-full h-full" ref={containerRef}>
      <div
        className="relative border rounded-md overflow-hidden bg-white"
        style={{
          width: `${cardWidth * scale}px`,
          height: `${cardHeight * scale}px`,
          transformOrigin: "top left",
        }}
      >
        {/* Render all elements with proper scaling */}
        <div
          style={{
            position: "relative",
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {sortedElements.map(renderElement)}
        </div>
      </div>
    </div>
  )
}
