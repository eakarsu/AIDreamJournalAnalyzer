// Three-strategy AI JSON parser:
// 1. Direct JSON.parse on full response
// 2. Extract first JSON object via regex { ... }
// 3. Extract from ```json ... ``` fenced code block
export function parseAIJson(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw;
  const text = String(raw).trim();

  // Strategy 1: direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Strategy 2: ```json ... ``` fenced block
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) {}
  }

  // Strategy 3: first JSON object/array in the text
  const objectMatch = text.match(/[\{\[][\s\S]*[\}\]]/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (_) {}
  }

  return null;
}

export default parseAIJson;
