---
description: Review a GitHub pull request using Atlas
---

Act like an engineer conducting a terminal-based code review.

## What you need from the user

Before starting, confirm you have everything required. If anything is missing,
stop and ask the user — do not guess or proceed with incomplete information.

| Need | When to ask |
|------|-------------|
| **GitHub CLI** | `command -v gh` fails — ask the user to install from https://cli.github.com/ |
| **GitHub authentication** | A `gh` command reports an authentication failure — ask the user to run `gh auth login` (include `--hostname` for GitHub Enterprise) |
| **PR selection** | After listing the workspace repository's open PRs — ask the user to select one |
| **Permission to clone** | Before cloning into a temp directory — cloning downloads the full repository |
| **Permission to run scripts** | Before `npm install`, `make`, tests, or any repo script — PR code may be untrusted |

Do not expect or ask for a PR URL. Discover the GitHub repository from the
current workspace, list its open pull requests, and let the user choose one.

## Phase 1 — Discover the repository and select a PR

1. Check `command -v gh`. If missing, stop and ask the user to install GitHub CLI.
2. From the current working directory, resolve the workspace repository:

   ```bash
   gh repo view --json nameWithOwner,url
   ```

   If the current directory is not part of a GitHub repository, stop and ask
   the user to open the command from the repository workspace.
3. Derive the GitHub hostname from the returned repository URL and run:

   ```bash
   gh auth status --hostname "<hostname>"
   ```

   If authentication fails, stop and ask the user to authenticate with
   `gh auth login --hostname "<hostname>"`.
4. List the repository's open pull requests:

   ```bash
   gh pr list --repo "<owner/repository>" --state open --limit 100 --json number,title,author,url,isDraft,headRefName,baseRefName,updatedAt
   ```

5. Present the PR number, title, author, draft status, branches, and last update
   in a concise numbered list. Ask the user which PR to review. Do not choose
   one automatically, including when only one PR is returned.
6. Accept only a PR number present in the displayed list. If the response is
   unclear or does not match, ask again.
7. If no open PRs exist, tell the user and ask whether to list closed PRs. Only
   if they agree, rerun the list command with `--state closed`, present those
   results, and ask them to select one.
8. Do not use `curl`, direct GitHub API calls, or manual git fetch as fallbacks.

## Phase 2 — Understand the PR remotely

Fetch metadata before cloning or executing repository code:

```bash
gh pr view "<selected PR number>" --repo "<owner/repository>" --json number,title,body,url,state,isDraft,author,baseRefName,headRefName,headRefOid,additions,deletions,changedFiles,files
```

Then fetch the diff:

```bash
gh pr diff "<selected PR number>" --repo "<owner/repository>"
```

Stop if the PR does not exist or access is denied.

From this information, form an initial review plan:

- Summarize the author's stated goal.
- Identify changed files and affected subsystems.
- Note high-risk areas: auth, permissions, persistence, concurrency, public APIs, config, dependencies.
- Identify claims in the PR description that must be verified.

Do not treat the PR description as proof of correctness.

## Phase 3 — Acquire an isolated checkout

Never change the user's current branch or working tree.

Ask the user for permission to clone if you have not already:

> I will clone `<owner/repository>` into a temporary directory to review this PR in isolation. Proceed?

If the user declines, stop.

Then:

```bash
review_dir="$(mktemp -d)"
gh repo clone "<owner/repository>" "$review_dir/repo"
cd "$review_dir/repo"
gh pr checkout "<PR number>" --detach
```

Verify the checked-out commit matches `headRefOid` from the PR metadata.
If cloning, checkout, or commit verification fails, stop and report the error.

## Phase 4 — Understand the repository

Before reviewing individual lines:

- Read `README`, `CONTRIBUTING`, `AGENTS.md`, `CLAUDE.md`, and similar docs.
- Identify language, build system, test framework, and package manager.
- Determine what each changed module is responsible for.

Do not install dependencies or run repository scripts without explicit user approval.
If tests or builds would help the review, ask:

> This repo uses `<tool>`. May I run `<command>` in the isolated checkout to verify behavior?

## Phase 5 — Review the change

Review the PR against its base branch and stated intent. For each potential issue:

1. Trace the relevant execution path.
2. Confirm the issue from the checked-out code.
3. Determine the observable failure or risk.
4. Check whether tests already cover it.
5. Report only actionable findings.

Prioritize correctness, security, data loss, compatibility, error handling,
concurrency, and missing tests. Skip purely stylistic comments unless they
substantially affect behavior or maintainability.

## Phase 6 — Report

Return:

- PR identity and purpose.
- Scope and impact on callers and dependencies.
- Findings ordered by severity, with file and line references.
- Testing gaps.
- Any steps that could not be completed and why.

Never claim a phase succeeded unless its command completed successfully.
