'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  success?: boolean;
  chartType?: string;
  chartData?: any;
  chartConfig?: { xKey?: string; yKey?: string; seriesKeys?: string[] };
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rowCount = 10;

  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    const csvFile = sessionStorage.getItem('csvFile');
    if (csvFile) {
      const parsed = JSON.parse(csvFile);
      setDatasetName(parsed.name.replace('.csv', ''));
      if (parsed.questions && parsed.questions.length > 0) {
        setSuggestedQuestions(parsed.questions);
      }
      if (parsed.processingError) {
        setProcessingError(parsed.processingError);
      }
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

    // Get datasetId from sessionStorage
    const csvFile = sessionStorage.getItem('csvFile');
    let datasetId = '';
    
    if (csvFile) {
      const parsed = JSON.parse(csvFile);
      if (parsed.metadata && parsed.metadata.datasetId) {
        datasetId = parsed.metadata.datasetId;
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          datasetId,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      // Render assistant message for both success and failure, when analysis is present
      if (data.analysis) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content:
            data.analysis.summary ||
            (data.success ? 'Analysis completed' : 'Analysis failed'),
          timestamp: new Date(),
          analysis: { ...data.analysis, success: data.success },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (!data.success) {
        // Fallback in case API returns an error structure without analysis
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content:
            'The analysis failed. Please try refining your question or verifying column names.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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

              {processingError && (
                <div className="mb-4 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-600 dark:text-yellow-400">
                  <span className="font-semibold">Note:</span> {processingError}
                  <br />
                  <span className="opacity-80">
                    Using default questions instead.
                  </span>
                </div>
              )}

              <SuggestedQuestions
                onSelect={handleSendMessage}
                questions={suggestedQuestions}
              />
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
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
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
            <div className="flex items-end gap-2">
              <Textarea
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
                className="max-h-50 min-h-11 text-sm"
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
