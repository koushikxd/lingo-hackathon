import fs from "node:fs/promises";
import path from "node:path";

import { nanoid } from "nanoid";
import simpleGit from "simple-git";

type CloneRepositoryInput = {
  repoUrl: string;
  branch?: string;
};

export async function cloneRepository(input: CloneRepositoryInput) {
  const { repoUrl, branch } = input;
  const repoId = nanoid();
  const rootPath = path.resolve(process.cwd(), ".tmp", "repos");
  const repoPath = path.join(rootPath, repoId);

  await fs.mkdir(rootPath, { recursive: true });

  const git = simpleGit();
  const args = ["--depth", "1", "--single-branch", "--no-tags"];
  if (branch) {
    args.push("--branch", branch);
  }

  await git.clone(repoUrl, repoPath, args);
  return repoPath;
}
