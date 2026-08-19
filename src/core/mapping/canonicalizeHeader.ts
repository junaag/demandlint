export function canonicalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function headerTokens(value: string): string[] {
  const canonical = canonicalizeHeader(value);
  return canonical.length === 0 ? [] : canonical.split(" ");
}
