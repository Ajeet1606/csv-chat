import { NextResponse } from 'next/server';
import { parseCSVPreview } from '@/lib/csv-service';
import { generateQuestions } from '@/lib/llm-service';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file received' },
                { status: 400 }
            );
        }

        // Parse CSV to get headers and sample data
        const { headers, data } = await parseCSVPreview(file);

        let questions: string[] = [];
        let processingError: string | undefined;

        try {
            // Generate questions using Local LLM
            questions = await generateQuestions(headers, data);
        } catch (error) {
            console.error('LLM analysis failed:', error);
            processingError = 'No LLM found to analyse';
        }

        return NextResponse.json({
            success: true,
            fileInfo: {
                name: file.name,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                headers, // Return headers as well
                questions,
                processingError,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
