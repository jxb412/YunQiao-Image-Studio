export type PromptTemplate = {
  id: string;
  industry: string;
  scene: string;
  size: string;
  quality: string;
  format: string;
  prompt: string;
  avoid: string;
};

export type PromptVariables = Record<string, string | number | undefined>;

const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

function fillTemplate(text: string, variables: PromptVariables) {
  return text.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === "" ? `{${key}}` : String(value);
  });
}

export function composePrompt(
  template: PromptTemplate,
  variables: PromptVariables,
  userPrompt?: string,
  userAvoid?: string
) {
  const promptParts = [fillTemplate(template.prompt, variables)];
  if (userPrompt?.trim()) {
    promptParts.push(userPrompt.trim());
  }

  const avoidParts = [fillTemplate(template.avoid, variables)];
  if (userAvoid?.trim()) {
    avoidParts.push(userAvoid.trim());
  }

  return `${promptParts.join("\n")}\n避免内容: ${avoidParts.join("；")}`;
}
