// Enhanced JSON validation function with detailed analysis
export function validateJsonString(jsonString: string): { isValid: boolean; issues: string[]; canAttemptFix: boolean } {
  const issues: string[] = [];
  const trimmed = jsonString.trim();
  
  // Check for empty or minimal responses
  if (trimmed === '' || trimmed === '{' || trimmed === '[') {
    issues.push(`Response is incomplete: "${trimmed}"`);
    return { isValid: false, issues, canAttemptFix: false };
  }
  
  // Check for unmatched brackets
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;
  
  if (openBraces !== closeBraces) {
    issues.push(`Unmatched braces: ${openBraces} opening, ${closeBraces} closing`);
  }
  
  if (openBrackets !== closeBrackets) {
    issues.push(`Unmatched brackets: ${openBrackets} opening, ${closeBrackets} closing`);
  }
  
  // Check for truncated JSON (common with streaming responses)
  if (trimmed.endsWith(',') || trimmed.endsWith(':') || trimmed.match(/[{,]\s*$/)) {
    issues.push('Response appears to be truncated');
  }
  
  // Check for common incomplete patterns
  if (trimmed.includes('"processed_words":') && !trimmed.includes(']')) {
    issues.push('processed_words array appears incomplete');
  }
  
  // Try to parse
  try {
    JSON.parse(trimmed);
    return { isValid: true, issues: [], canAttemptFix: false };
  } catch (parseError) {
    issues.push(`JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    
    // Determine if we can attempt to fix simple issues
    const canAttemptFix = (
      openBraces > closeBraces && openBraces - closeBraces <= 2
    ) || (
      openBrackets > closeBrackets && openBrackets - closeBrackets <= 2
    );
    
    return { isValid: false, issues, canAttemptFix };
  }
}

// Attempt to fix common JSON issues
export function attemptJsonFix(jsonString: string): string {
  let fixed = jsonString.trim();
  
  // Count brackets and braces
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  
  // Add missing closing braces
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    fixed += '}' .repeat(missingBraces);
  }
  
  // Add missing closing brackets
  if (openBrackets > closeBrackets) {
    const missingBrackets = openBrackets - closeBrackets;
    fixed += ']' .repeat(missingBrackets);
  }
  
  // Remove trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  return fixed;
}