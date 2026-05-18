/**
 * AI-powered code review for the branch CI pipeline.
 *
 * Diffs the current branch against origin/main, sends the changed files to
 * Claude for a multi-stage review (requirements, code quality, tests, docs),
 * applies any corrections it produces, and commits + pushes the result.
 *
 * Exits 1 if the review finds blocking issues that cannot be auto-fixed.
 *
 * Requires: ANTHROPIC_API_KEY env var, git configured with push access.
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const MAX_DIFF_CHARS = 30_000;
const MAX_FILE_CHARS = 10_000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY is not set.');
  console.error('Add it as a repository secret: Settings → Secrets and variables → Actions → New repository secret');
  process.exit(1);
}

const client = new Anthropic();

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}

function readFileSafe(path) {
  try {
    if (!existsSync(path)) return null;
    const content = readFileSync(path, 'utf8');
    return content.length > MAX_FILE_CHARS
      ? content.slice(0, MAX_FILE_CHARS) + `\n... (truncated at ${MAX_FILE_CHARS} chars)`
      : content;
  } catch {
    return null;
  }
}

const rawDiff = run('git diff origin/main...HEAD');

if (!rawDiff.trim()) {
  console.log('No changes detected vs origin/main — nothing to review.');
  process.exit(0);
}

const diff =
  rawDiff.length > MAX_DIFF_CHARS
    ? rawDiff.slice(0, MAX_DIFF_CHARS) + `\n... (diff truncated at ${MAX_DIFF_CHARS} chars)`
    : rawDiff;

const changedFiles = run('git diff origin/main...HEAD --name-only').split('\n').filter(Boolean);
console.log('Files changed:', changedFiles.join(', '));

// --- Collect files to include in the review context ---

const filesToInclude = new Set([...changedFiles, 'README.md', 'CLAUDE.md']);

for (const file of changedFiles) {
  // Composable → its unit test pair
  const composableMatch = file.match(/src\/composables\/use(\w+)\.js/);
  if (composableMatch) {
    const name = composableMatch[1].toLowerCase();
    filesToInclude.add(`tests/unit/${name}/composable.test.js`);
    filesToInclude.add(`tests/unit/${name}/components.test.js`);
  }
  // Component → its unit test pair
  const componentMatch = file.match(/src\/components\/(\w+)\.vue/);
  if (componentMatch) {
    const name = componentMatch[1].toLowerCase();
    filesToInclude.add(`tests/unit/${name}/composable.test.js`);
    filesToInclude.add(`tests/unit/${name}/components.test.js`);
  }
}

// All e2e specs for cross-cutting context
try {
  const e2eFiles = run('find tests/e2e -name "*.spec.js" 2>/dev/null || true')
    .split('\n')
    .filter(Boolean);
  e2eFiles.forEach((f) => filesToInclude.add(f));
} catch {}

const fileBlocks = [];
for (const file of filesToInclude) {
  const content = readFileSafe(file);
  if (content !== null) {
    fileBlocks.push(`### ${file}\n\`\`\`\n${content}\n\`\`\``);
  }
}

// --- Tool definitions ---

const tools = [
  {
    name: 'write_file',
    description:
      'Write or update a file. Use to fix code quality issues, add/update/remove tests, or update documentation.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        content: { type: 'string', description: 'Complete new content for the file' },
        reason: { type: 'string', description: 'One-line reason for this change' },
      },
      required: ['path', 'content', 'reason'],
    },
  },
  {
    name: 'finish_review',
    description: 'Call after completing all review stages to report the final results.',
    input_schema: {
      type: 'object',
      properties: {
        requirements_issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'Requirement conflicts or contradictions found (human decision needed)',
        },
        code_issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'Code quality issues found and auto-fixed',
        },
        test_changes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Test additions, modifications, or removals made',
        },
        doc_changes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documentation changes made',
        },
        blocking_issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'Issues that could not be auto-fixed and must block the PR',
        },
      },
      required: [
        'requirements_issues',
        'code_issues',
        'test_changes',
        'doc_changes',
        'blocking_issues',
      ],
    },
  },
];

// --- System prompt ---

const systemPrompt = `You are a senior software engineer reviewing a code change for Untangle, a Vue 3 task-management app.

Project conventions (from CLAUDE.md):
- All task/UI state lives in composables as module-level singletons (Vue reactive refs outside the function)
- Components are thin: they call composable functions and render results — business logic stays in composables
- Unit tests come in pairs: composable.test.js (uses vi.resetModules() for fresh state) and components.test.js (mocks the composable with vi.mock())
  - Never mix these two styles in the same file
- E2E tests clear localStorage and reload before every test
- No unnecessary comments; only add a comment when the WHY is non-obvious
- Never write multi-paragraph docstrings or multi-line comment blocks

Your review process (execute in order):
1. **Requirements review**: Does the change introduce conflicting or contradictory behaviors with the existing codebase? Report these in finish_review.requirements_issues — do not auto-fix (they need a human decision).
2. **Code QA**: Is the code clear, efficient, meeting project conventions, free of technical debt? Fix issues using write_file.
3. **Unit test review**: Are unit tests adequate for the change? Add, modify, or remove test files using write_file.
4. **E2E test review**: Same for e2e tests. Add, modify, or remove as needed.
5. **Documentation review**: Does README.md or CLAUDE.md need updating to reflect this change? Apply changes with write_file.

After completing all stages, call finish_review.`;

// --- Agentic review loop ---

const messages = [
  {
    role: 'user',
    content: `Review the following code change.\n\n## Git diff\n\`\`\`diff\n${diff}\n\`\`\`\n\n## File contents\n\n${fileBlocks.join('\n\n')}`,
  },
];

const writtenFiles = [];
let reviewResult = null;

while (true) {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools,
    messages,
  });

  messages.push({ role: 'assistant', content: response.content });

  const toolUses = response.content.filter((b) => b.type === 'tool_use');
  if (toolUses.length === 0) break;

  const toolResults = [];
  for (const toolUse of toolUses) {
    if (toolUse.name === 'write_file') {
      const { path, content, reason } = toolUse.input;
      const absPath = resolve(process.cwd(), path);
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, content, 'utf8');
      writtenFiles.push({ path, reason });
      console.log(`  [write] ${path}: ${reason}`);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: `Written: ${path}`,
      });
    } else if (toolUse.name === 'finish_review') {
      reviewResult = toolUse.input;
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'Review recorded.' });
    }
  }

  messages.push({ role: 'user', content: toolResults });
  if (reviewResult) break;
}

// --- Print summary ---

console.log('\n=== AI Review Results ===\n');
const r = reviewResult ?? {};

if (r.requirements_issues?.length) {
  console.log('Requirements issues (need human review):');
  r.requirements_issues.forEach((i) => console.log(`  - ${i}`));
}
if (r.code_issues?.length) {
  console.log('Code quality issues (auto-fixed):');
  r.code_issues.forEach((i) => console.log(`  - ${i}`));
}
if (r.test_changes?.length) {
  console.log('Test changes made:');
  r.test_changes.forEach((i) => console.log(`  - ${i}`));
}
if (r.doc_changes?.length) {
  console.log('Documentation changes made:');
  r.doc_changes.forEach((i) => console.log(`  - ${i}`));
}

// --- Commit any file changes ---

if (writtenFiles.length > 0) {
  console.log('\nCommitting AI review corrections...');
  const filePaths = writtenFiles.map((f) => `"${f.path}"`).join(' ');
  run(`git add ${filePaths}`);

  const commitMsg = [
    'ci: AI review corrections',
    '',
    'Changes:',
    ...writtenFiles.map((f) => `- ${f.path}: ${f.reason}`),
  ].join('\n');
  writeFileSync('/tmp/ai-review-commit-msg.txt', commitMsg, 'utf8');
  run('git commit -F /tmp/ai-review-commit-msg.txt');
  run('git push');
  console.log('Changes pushed.');
}

// --- Fail on blocking issues ---

if (r.blocking_issues?.length) {
  console.error('\nReview FAILED — blocking issues that must be fixed manually:');
  r.blocking_issues.forEach((i) => console.error(`  - ${i}`));
  process.exit(1);
}

const changesNote = writtenFiles.length > 0 ? ` (${writtenFiles.length} file(s) corrected)` : '';
console.log(`\nReview PASSED${changesNote}.`);
