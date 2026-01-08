/**
 * Code Sanitizer for LLM-generated Python code
 * Validates and sanitizes code before execution in the sandbox
 */

export interface SanitizationResult {
  isValid: boolean;
  sanitizedCode: string;
  errors: string[];
  warnings: string[];
}

// Blocked patterns that should never appear in generated code
const BLOCKED_PATTERNS = [
  // System access
  /\bos\./gi,
  /\bsys\./gi,
  /\bsubprocess\b/gi,
  /\b__import__\b/gi,
  /\beval\s*\(/gi,
  /\bexec\s*\(/gi,
  /\bcompile\s*\(/gi,
  /\bglobals\s*\(/gi,
  /\blocals\s*\(/gi,
  /\bgetattr\s*\(/gi,
  /\bsetattr\s*\(/gi,
  /\bdelattr\s*\(/gi,
  /\b__builtins__\b/gi,
  // File operations
  /\bopen\s*\(/gi,
  /\.read\s*\(/gi,
  /\.write\s*\(/gi,
  /\bpathlib\b/gi,
  /\bshutil\b/gi,
  // Network
  /\brequests\b/gi,
  /\burllib\b/gi,
  /\bsocket\b/gi,
  /\bhttp\b/gi,
  // Dangerous imports
  /import\s+os\b/gi,
  /import\s+sys\b/gi,
  /import\s+subprocess\b/gi,
  /from\s+os\b/gi,
  /from\s+sys\b/gi,
  /import\s+pickle\b/gi,
  /import\s+marshal\b/gi,
  // Visualization (not allowed)
  /\bmatplotlib\b/gi,
  /\bseaborn\b/gi,
  /\bplotly\b/gi,
  /\.plot\s*\(/gi,
  /\.show\s*\(/gi,
  /\bplt\./gi,
  /\bsns\./gi,
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
      errors.push(`Blocked pattern detected: ${pattern.source}`);
    }
  }

  // Validate imports
  const importMatches = sanitizedCode.match(
    /(?:from\s+(\w+)|import\s+(\w+))/gi
  );
  if (importMatches) {
    for (const match of importMatches) {
      const moduleName = match.replace(/^(from|import)\s+/i, '').split(/\s/)[0];
      if (!ALLOWED_IMPORTS.includes(moduleName.toLowerCase())) {
        errors.push(`Disallowed import: ${moduleName}`);
      }
    }
  }

  // Check for print(json.dumps(...))
  if (!/print\s*\(\s*json\.dumps\s*\(/i.test(sanitizedCode)) {
    warnings.push('Code should output results using print(json.dumps(...))');
  }

  // Check balanced parentheses/brackets/braces
  const checks = [
    { open: /\(/g, close: /\)/g, name: 'parentheses' },
    { open: /\[/g, close: /\]/g, name: 'brackets' },
    { open: /\{/g, close: /\}/g, name: 'braces' },
  ];
  for (const { open, close, name } of checks) {
    const o = (sanitizedCode.match(open) || []).length;
    const c = (sanitizedCode.match(close) || []).length;
    if (o !== c) errors.push(`Unbalanced ${name}: ${o} open, ${c} close`);
  }

  return { isValid: errors.length === 0, sanitizedCode, errors, warnings };
}

export function wrapCodeWithSafetyChecks(
  code: string,
  availableColumns: string[]
): string {
  const columnsJson = JSON.stringify(availableColumns);

  // Indent user code
  const indentedCode = code
    .split('\n')
    .map((line) => '    ' + line)
    .join('\n');

  return `
# === Safety Wrapper ===
_AVAILABLE_COLUMNS = ${columnsJson}

def _safe_to_json(obj):
    """Safely convert pandas objects to JSON-serializable format"""
    import pandas as pd
    import numpy as np
    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient='records')
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
    print(json.dumps({"error": f"Column not found: {e}. Available columns: {_AVAILABLE_COLUMNS}"}))
except TypeError as e:
    print(json.dumps({"error": f"Type error: {e}"}))
except ValueError as e:
    print(json.dumps({"error": f"Value error: {e}"}))
except Exception as e:
    print(json.dumps({"error": f"Execution error: {type(e).__name__}: {e}"}))
`;
}
