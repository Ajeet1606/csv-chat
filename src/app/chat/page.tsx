'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Upload, RotateCcw, Menu, X } from 'lucide-react';
import { ChatMessage } from '@/components/chat/chat-message';
import { AssistantMessage } from '@/components/chat/assistant-message';
import { SuggestedQuestions } from '@/components/chat/suggested-questions';
import { ThemeToggle } from '@/components/theme/theme-toggle';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis?: AnalysisResult;
}

interface AnalysisResult {
  summary: string;
  pythonCode: string;
  codeOutput: string;
  chartType?: string;
  chartData?: any;
  explanation?: string;
  columns?: string[];
  aggregations?: string[];
  intent?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfiling, setShowProfiling] = useState(true);
  const [datasetName, setDatasetName] = useState('Untitled Dataset');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowCount = 10;

  useEffect(() => {
    const csvFile = sessionStorage.getItem('csvFile');
    if (csvFile) {
      const { name } = JSON.parse(csvFile);
      setDatasetName(name.replace('.csv', ''));
    }
  }, []);

  useEffect(() => {
    // Simulate profiling
    const timer = setTimeout(() => {
      setShowProfiling(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const mockAnalyses = [
        {
          summary: `Analyzed "${text}" across your dataset. Found significant patterns in the data with ${Math.floor(Math.random() * 5000)} matching records.`,
          pythonCode: `import pandas as pd
import numpy as np

# Load dataset
df = pd.read_csv('dataset.csv')

# Analyze by category
result = df.groupby('category')['value'].sum()
print(result)`,
          codeOutput: `category
Category A    450.75
Category B    380.50
Category C    520.25
Category D    275.00
Category E    610.00
Name: value, dtype: float64`,
          chartType: 'bar',
          chartData: {
            labels: [
              'Category A',
              'Category B',
              'Category C',
              'Category D',
              'Category E',
            ],
            datasets: [
              {
                label: 'Value',
                data: [450.75, 380.5, 520.25, 275.0, 610.0],
                backgroundColor: [
                  'hsl(var(--color-chart-1))',
                  'hsl(var(--color-chart-2))',
                  'hsl(var(--color-chart-3))',
                  'hsl(var(--color-chart-4))',
                  'hsl(var(--color-chart-5))',
                ],
              },
            ],
          },
          explanation:
            'Grouped by category and calculated total values, then visualized using a bar chart.',
          columns: ['category', 'value'],
          aggregations: ['SUM', 'GROUP BY'],
          intent: 'Aggregation & Comparison',
        },
        {
          summary: `Analyzed trend over time for "${text}". Data shows a clear pattern across ${Math.floor(Math.random() * 12)} months.`,
          pythonCode: `import pandas as pd
import matplotlib.pyplot as plt

# Load and prepare data
df = pd.read_csv('dataset.csv')
df['date'] = pd.to_datetime(df['date'])
trend = df.groupby(df['date'].dt.to_period('M'))['metric'].sum()

print(trend)`,
          codeOutput: `date
2024-01    450
2024-02    480
2024-03    420
2024-04    550
2024-05    590
2024-06    720
2024-07    750
2024-08    820
2024-09    890
2024-10    920
2024-11    1050
2024-12    1150`,
          chartType: 'line',
          chartData: {
            labels: [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ],
            datasets: [
              {
                label: 'Trend',
                data: [30, 40, 35, 50, 49, 60, 70, 75, 80, 85, 90, 95],
                borderColor: 'hsl(var(--color-chart-1))',
                backgroundColor: 'hsl(var(--color-chart-1) / 0.1)',
                tension: 0.4,
              },
            ],
          },
          explanation:
            'Extracted time series data and plotted trends across the year.',
          columns: ['date', 'metric'],
          aggregations: ['TIME_SERIES', 'SUM'],
          intent: 'Trend Analysis',
        },
      ];

      const result =
        mockAnalyses[Math.floor(Math.random() * mockAnalyses.length)];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.summary,
        timestamp: new Date(),
        analysis: result,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleReset = () => {
    if (window.confirm('Reset the chat? You can upload a new CSV file.')) {
      sessionStorage.removeItem('csvFile');
      router.push('/');
    }
  };

  const handleUploadNew = () => {
    if (
      window.confirm(
        'Upload a new CSV file? Your current chat will be cleared.'
      )
    ) {
      sessionStorage.removeItem('csvFile');
      router.push('/');
    }
  };

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
              CSV
            </div>
            <div className="flex-1">
              <h1 className="text-foreground text-sm font-semibold">
                {datasetName}
              </h1>
              <p className="text-muted-foreground text-xs">
                {rowCount.toLocaleString()} rows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUploadNew}
              className="hidden gap-2 sm:flex"
            >
              <Upload className="h-4 w-4" />
              New CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="hidden gap-2 sm:flex"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="sm:hidden"
            >
              {isMobileOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Single Column Chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Messages Container */}
        <div className="scrollbar-hidden mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {showProfiling && (
            <div className="text-muted-foreground bg-secondary/50 flex w-fit items-center gap-2 rounded-lg p-3 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              Profiling dataset...
            </div>
          )}

          {messages.length === 0 && !showProfiling && (
            <div className="flex flex-col items-center justify-start space-y-6 text-center">
              <div className="space-y-3 pt-4">
                <div className="bg-primary/10 mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
                  <svg
                    className="text-primary h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-semibold">
                    Ready to analyze
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Ask questions about your data
                  </p>
                </div>
              </div>

              <SuggestedQuestions onSelect={handleSendMessage} />
            </div>
          )}

          {messages.map((message) =>
            message.type === 'user' ? (
              <ChatMessage key={message.id} message={message} />
            ) : (
              <AssistantMessage key={message.id} message={message} />
            )
          )}

          {isLoading && (
            <div className="flex gap-3">
              <div className="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
                <Loader2 className="text-primary h-4 w-4 animate-spin" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="bg-muted h-2 w-3/4 animate-pulse rounded-full" />
                <div className="bg-muted h-2 w-1/2 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-border bg-background/95 border-t p-4 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-4xl space-y-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask a question... (Shift+Enter for newline)"
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="px-2 sm:px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Enter to send • Shift+Enter for newline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
