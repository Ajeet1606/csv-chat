/**
 * Robust Code Sanitizer with improved JSON parsing
 */

export interface SanitizationResult {
  isValid: boolean;
  sanitizedCode: string;
  errors: string[];
  warnings: string[];
}

export interface CodeExtractionResult {
  code: string;
  summary: string;
  intent?: string;
  explanation?: string;
  columns?: string[];
  aggregations?: string[];
  success: boolean;
}

/**
 * Multi-step JSON sanitization with aggressive cleaning
 */
export function sanitizeJsonString(raw: string): string {
  let result = raw.trim();

  // Step 1: Remove markdown code fences
  const fenceMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    result = fenceMatch[1].trim();
  }

  // Step 2: Remove any leading/trailing text that's not part of JSON
  // Find the first { and last }
  const firstBrace = result.indexOf('{');
  const lastBrace = result.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    result = result.substring(firstBrace, lastBrace + 1);
  }

  // Step 3: Fix common JSON issues
  result = result
    // Replace Python True/False/None with JSON equivalents
    .replace(/:\s*True\b/g, ': true')
    .replace(/:\s*False\b/g, ': false')
    .replace(/:\s*None\b/g, ': null')
    // Remove trailing commas before closing braces/brackets
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix single quotes around property names and values
    .replace(/'([^']*?)'(\s*):/g, '"$1"$2:')
    .replace(/:\s*'([^']*?)'/g, ': "$1"')
    .replace(/,\s*'([^']*?)'/g, ', "$1"')
    .replace(/\[\s*'([^']*?)'/g, '["$1"')
    // Fix unescaped newlines in strings (replace \n inside strings)
    .replace(/"code":\s*"([^"]*?)"/g, (match, codeContent) => {
      // This is a simple heuristic - won't work for all cases
      return match; // Keep as-is, we'll handle in next step
    });

  return result;
}

// Blocked patterns
const BLOCKED_PATTERNS = [
  /\bos\./gi,
  /\bsys\./gi,
  /\bsubprocess\b/gi,
  /\b__import__\b/gi,
  /\beval\s*\(/gi,
  /\bexec\s*\(/gi,
  /\bcompile\s*\(/gi,
  /\bglobals\s*\(/gi,
  /\blocals\s*\(/gi,
  /\b__builtins__\b/gi,
  /\bopen\s*\(/gi,
  /\bpathlib\b/gi,
  /\bshutil\b/gi,
  /\brequests\b/gi,
  /\burllib\b/gi,
  /\bsocket\b/gi,
  /import\s+os\b/gi,
  /import\s+sys\b/gi,
  /import\s+subprocess\b/gi,
  /from\s+os\b/gi,
  /from\s+sys\b/gi,
  /import\s+pickle\b/gi,
  /\bmatplotlib\b/gi,
  /\bseaborn\b/gi,
  /\.plot\s*\(/gi,
  /\.show\s*\(/gi,
  /\bplt\./gi,
];

const ALLOWED_IMPORTS = ['pandas', 'numpy', 'json', 'pd', 'np', 'math'];

export function sanitizeCode(
  code: string,
  availableColumns: string[]
): SanitizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitizedCode = code.trim();

  if (!sanitizedCode) {
    return {
      isValid: false,
      sanitizedCode: '',
      errors: ['Empty code provided'],
      warnings: [],
    };
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sanitizedCode)) {
      errors.push(`Blocked pattern detected: ${pattern.source.substring(0, 50)}`);
    }
  }

  // Validate imports
  const importMatches = sanitizedCode.match(/(?:from\s+(\w+)|import\s+(\w+))/gi);
  if (importMatches) {
    for (const match of importMatches) {
      const moduleName = match.replace(/^(from|import)\s+/i, '').split(/\s/)[0];
      if (!ALLOWED_IMPORTS.includes(moduleName.toLowerCase())) {
        errors.push(`Disallowed import: ${moduleName}`);
      }
    }
  }

  // Validate output format
  if (!/print\s*\(\s*json\.dumps\s*\(/i.test(sanitizedCode)) {
    warnings.push('Code should output results using print(json.dumps(...))');
  }

  // Check for basic Python syntax issues
  const balanceChecks = [
    { open: /\(/g, close: /\)/g, name: 'parentheses' },
    { open: /\[/g, close: /\]/g, name: 'brackets' },
    { open: /\{/g, close: /\}/g, name: 'braces' },
  ];

  for (const { open, close, name } of balanceChecks) {
    const openCount = (sanitizedCode.match(open) || []).length;
    const closeCount = (sanitizedCode.match(close) || []).length;
    if (openCount !== closeCount) {
      warnings.push(`Unbalanced ${name}: ${openCount} open, ${closeCount} close`);
    }
  }

  // Check for common Python errors
  if (/df\s*\[\s*\[/.test(sanitizedCode)) {
    // Double bracket access - common mistake
    warnings.push('Detected double bracket access - ensure proper column selection');
  }

  return {
    isValid: errors.length === 0,
    sanitizedCode,
    errors,
    warnings,
  };
}

export function wrapCodeWithSafetyChecks(
  code: string,
  availableColumns: string[]
): string {
  const columnsJson = JSON.stringify(availableColumns);
  const indentedCode = code.split('\n').map(line => '    ' + line).join('\n');

  return `# === Safety Wrapper ===
import json
import pandas as pd
import numpy as np

_AVAILABLE_COLUMNS = ${columnsJson}

def _safe_to_json(obj):
    """Convert pandas objects to JSON-serializable format"""
    if isinstance(obj, pd.DataFrame):
        df_copy = obj.copy()
        for col in df_copy.columns:
            # Handle datetime columns
            if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
                df_copy[col] = df_copy[col].dt.strftime('%Y-%m-%d')
            # Handle period columns (Q1, Q2, etc.)
            elif isinstance(df_copy[col].dtype, pd.PeriodDtype):
                df_copy[col] = df_copy[col].astype(str)
        return df_copy.to_dict(orient='records')
    elif isinstance(obj, (pd.Period, pd.Timestamp)):
        return str(obj)
    elif isinstance(obj, pd.Series):
        try:
            return obj.to_dict()
        except:
            return obj.reset_index().to_dict(orient='records')
    elif isinstance(obj, (np.integer, np.floating)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {str(k): _safe_to_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_safe_to_json(item) for item in obj]
    return obj

try:
${indentedCode}
except KeyError as e:
    result = {"error": f"Column not found: {e}. Available: {_AVAILABLE_COLUMNS}"}
    print(json.dumps(result))
except TypeError as e:
    result = {"error": f"Type error: {e}"}
    print(json.dumps(result))
except ValueError as e:
    result = {"error": f"Value error: {e}"}
    print(json.dumps(result))
except Exception as e:
    result = {"error": f"{type(e).__name__}: {str(e)}"}
    print(json.dumps(result))
`;
}