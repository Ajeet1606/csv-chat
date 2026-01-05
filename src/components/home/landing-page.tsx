'use client';

import { useState } from 'react';
import { ChartSpline, CircleEllipsis, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { FileUploadArea } from '@/components/home/file-upload-area';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      // Simulate file upload and validation
      const formData = new FormData();
      formData.append('file', file);

      // Store file info in sessionStorage for the next page
      const fileInfo = {
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      sessionStorage.setItem('csvFile', JSON.stringify(fileInfo));

      // Simulate profiling delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to chat page
      router.push('/chat');
    } catch (error) {
      console.error('Upload failed:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="from-background via-background to-secondary flex min-h-screen flex-col bg-linear-to-br">
      {/* Header */}
      <header className="bg-background/80 border-border sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
              CSV
            </div>
            <h1 className="text-foreground text-xl font-bold">Data Analyzer</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="space-y-4 text-center">
              <h2 className="text-foreground text-4xl font-bold text-balance sm:text-5xl">
                Chat with Your Data
              </h2>
              <p className="text-muted-foreground text-lg">
                Upload a CSV file and analyze it using natural language. Ask
                questions and get instant insights.
              </p>
            </div>

            {/* Upload Card */}
            <Card className="bg-card border-primary/30 hover:border-primary/50 border-2 border-dashed p-8 transition-colors sm:p-12">
              <FileUploadArea
                onFileSelect={handleFileUpload}
                isLoading={isLoading}
              />
            </Card>

            {/* Info Section */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 text-center">
                <div className="bg-primary/10 mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
                  <Upload className="text-primary h-5 w-5" />
                </div>
                <h3 className="text-foreground font-semibold">Easy Upload</h3>
                <p className="text-muted-foreground text-sm">
                  Drag and drop or click to upload CSV files up to 50MB
                </p>
              </div>
              <div className="space-y-2 text-center">
                <div className="bg-chart-2/10 mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
                  <CircleEllipsis className="text-chart-2 h-5 w-5" />
                </div>
                <h3 className="text-foreground font-semibold">Natural Chat</h3>
                <p className="text-muted-foreground text-sm">
                  Ask questions in plain English, get instant analysis
                </p>
              </div>
              <div className="space-y-2 text-center">
                <div className="bg-chart-1/10 mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
                  <ChartSpline className="text-chart-1 h-5 w-5" />
                </div>
                <h3 className="text-foreground font-semibold">
                  Visualize Data
                </h3>
                <p className="text-muted-foreground text-sm">
                  See charts, tables, and detailed analysis results
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-border bg-background/50 border-t py-6">
        <div className="text-muted-foreground mx-auto max-w-7xl px-4 text-center text-sm sm:px-6 lg:px-8">
          <p>© 2025 Data Analyzer. Privacy and security built in.</p>
        </div>
      </footer>
    </div>
  );
}
