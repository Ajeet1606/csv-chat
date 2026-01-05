'use client';

import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const DEFAULT_QUESTIONS = [
  'Show summary statistics',
  'Top 5 categories by revenue',
  'Trend over time',
  'Distribution analysis',
  'Correlation analysis',
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="w-full space-y-2">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <Lightbulb className="h-3 w-3" />
        Try asking
      </div>
      <div className="grid grid-cols-1 gap-2">
        {DEFAULT_QUESTIONS.map((question) => (
          <Button
            key={question}
            variant="outline"
            size="sm"
            onClick={() => onSelect(question)}
            className="justify-start text-left text-xs"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}
