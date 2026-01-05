"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
}

export function FileUploadArea({ onFileSelect, isLoading = false }: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file")
      return false
    }

    // Check file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setError("File size must be less than 50MB")
      return false
    }

    setError(null)
    return true
  }

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-primary/30 hover:border-primary/50"
      } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="space-y-4">
        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-foreground text-lg">
            {isLoading ? "Uploading and profiling..." : "Drag and drop your CSV here"}
          </h3>
          <p className="text-sm text-muted-foreground">or click below to browse</p>
        </div>

        <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="mx-auto">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Select CSV File"
          )}
        </Button>

        <p className="text-xs text-muted-foreground">.csv up to 50 MB</p>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg p-3 mt-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
        disabled={isLoading}
      />
    </div>
  )
}
