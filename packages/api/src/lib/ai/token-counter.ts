const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4.1": 1047576,
  "gpt-4.1-mini": 1047576,
  "gpt-4.1-nano": 1047576,
};

export function countTokens(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  const charEstimate = Math.ceil(trimmed.length / 4);
  const wordEstimate = Math.ceil(trimmed.split(/\s+/).length * 1.3);
  return Math.max(charEstimate, wordEstimate);
}

export function getModelContextLimit(model: string) {
  return MODEL_CONTEXT_LIMITS[model] ?? 128000;
}

export function calculateAvailableTokens(
  model: string,
  promptTokens: number,
  completionReserve = 2048,
  buffer = 512,
) {
  const contextLimit = getModelContextLimit(model);
  return Math.max(0, contextLimit - promptTokens - completionReserve - buffer);
}
