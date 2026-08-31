export function evaluateMath(input: string): { isMath: boolean; result: string; expression: string } {
  let clean = input.trim()
  if (clean.startsWith("=")) {
    clean = clean.slice(1).trim()
  }

  // Check if string contains math characters
  if (!/^[\d\s\+\-\*\/\%\^\(\)\.\,eE|sqrt|sin|cos|tan|abs|log|pi|PI|exp]+$/.test(clean)) {
    return { isMath: false, result: "", expression: "" }
  }

  // Must contain at least one operator or function or number
  if (!/[\+\-\*\/\%\^]|sqrt|sin|cos|tan|log/.test(clean)) {
    return { isMath: false, result: "", expression: "" }
  }

  try {
    let sanitized = clean
      .replace(/sqrt\(/g, "Math.sqrt(")
      .replace(/sin\(/g, "Math.sin(")
      .replace(/cos\(/g, "Math.cos(")
      .replace(/tan\(/g, "Math.tan(")
      .replace(/abs\(/g, "Math.abs(")
      .replace(/log\(/g, "Math.log10(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/\^/g, "**")
      .replace(/\bpi\b|\bPI\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E")

    // Evaluate in safe function context
    const fn = new Function(`return (${sanitized});`)
    const val = fn()

    if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
      const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(4).replace(/\.?0+$/, "")
      return { isMath: true, result: formatted, expression: clean }
    }
  } catch {
    // Not valid math
  }

  return { isMath: false, result: "", expression: "" }
}

export default evaluateMath
