export interface BuildMetadata {
  version: string;
  gitCommitSha: string;
}

export function createBuildMetadata(version: string, gitCommitSha?: string): BuildMetadata {
  return { version, gitCommitSha: gitCommitSha?.trim() || "local" };
}
