import { Octokit } from "@octokit/rest";
import { env } from "@lingo-dev/env/server";

export type ParsedGitHubRepository = {
  owner: string;
  repo: string;
  normalizedUrl: string;
};

export type GitHubRepositoryMetadata = {
  name: string;
  owner: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
};

const octokit = new Octokit({
  auth: env.GITHUB_TOKEN,
});

export function parseGitHubRepositoryUrl(input: string): ParsedGitHubRepository | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.hostname !== "github.com") {
    return null;
  }

  const segments = url.pathname
    .replace(/\.git$/, "")
    .split("/")
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    return null;
  }

  const [owner, repo] = segments;
  if (!owner || !repo) {
    return null;
  }

  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

export async function fetchGitHubRepositoryMetadata(
  input: ParsedGitHubRepository
): Promise<GitHubRepositoryMetadata> {
  const response = await octokit.repos.get({
    owner: input.owner,
    repo: input.repo,
  });

  return {
    name: response.data.name,
    owner: response.data.owner.login,
    url: response.data.html_url,
    description: response.data.description ?? null,
    stars: response.data.stargazers_count ?? 0,
    language: response.data.language ?? null,
  };
}
