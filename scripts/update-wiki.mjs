/**
 * Compares recent changes to main against the wiki and updates any pages
 * that are out of date. Invoked by the wiki-update GitHub Actions workflow
 * and the /wiki-update Claude Code skill.
 *
 * Requires: ANTHROPIC_API_KEY env var, and a `wiki/` directory cloned from
 * the wiki repo at the project root.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const client = new Anthropic();

const WIKI_DIR = join(process.cwd(), 'wiki');
const WIKI_PAGES = [
  'Home.md',
  'Getting-Started.md',
  'Features.md',
  'Architecture.md',
  'Data-Model.md',
  'Testing.md',
  '_Sidebar.md',
];
const MAX_DIFF_CHARS = 24_000;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}

const diff = run('git diff HEAD~1..HEAD');
const commitMessage = run('git log -1 --format=%B');
const truncatedDiff =
  diff.length > MAX_DIFF_CHARS
    ? diff.slice(0, MAX_DIFF_CHARS) + `\n... (diff truncated at ${MAX_DIFF_CHARS} chars)`
    : diff;

const wikiPages = WIKI_PAGES.flatMap((name) => {
  const path = join(WIKI_DIR, name);
  return existsSync(path) ? [{ name, content: readFileSync(path, 'utf8') }] : [];
});

if (wikiPages.length === 0) {
  console.error('No wiki pages found. Is the wiki cloned at ./wiki/?');
  process.exit(1);
}

const tools = [
  {
    name: 'update_wiki_page',
    description:
      'Write the complete updated content for one wiki page. Call once per page that needs changing.',
    input_schema: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          description: 'Filename of the wiki page to update (e.g. Features.md)',
          enum: WIKI_PAGES,
        },
        content: {
          type: 'string',
          description: 'Complete new markdown content for the page',
        },
        reason: {
          type: 'string',
          description: 'One sentence explaining what changed and why this page needed updating',
        },
      },
      required: ['page', 'content', 'reason'],
    },
  },
  {
    name: 'no_updates_needed',
    description: 'Call this when none of the wiki pages need to change.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why no updates are needed' },
      },
      required: ['reason'],
    },
  },
];

const systemPrompt = `You are a technical writer keeping the GitHub wiki for Untangle (a Vue 3 task-management app) accurate and up to date.

When a change lands on main, your job is to:
1. Read the diff carefully and understand what actually changed.
2. Identify which wiki pages (if any) describe something that is now different.
3. Update ONLY those pages, and ONLY the parts that are wrong or missing — preserve all other content exactly.
4. Match the existing style and heading structure of each page.

Guidelines for when to update:
- New user-facing features or changed UX behaviour → update Features.md
- New commands, setup steps, or changed developer workflow → update Getting-Started.md
- Changed composable patterns, new architectural concepts → update Architecture.md
- Changed task schema, localStorage format, or energy model → update Data-Model.md
- New test files, changed test approach, changed CI → update Testing.md
- Home.md and _Sidebar.md only if a new top-level page is added

Do NOT update for: internal refactors with no visible change, test additions that don't change the testing strategy, dependency bumps, CI tweaks, comment-only changes, or the QA/wiki automation itself.`;

const userContent = `A change was just merged to main.

**Commit message:**
${commitMessage}

**Diff:**
\`\`\`diff
${truncatedDiff}
\`\`\`

**Current wiki pages:**

${wikiPages.map((p) => `### ${p.name}\n\`\`\`markdown\n${p.content}\n\`\`\``).join('\n\n')}

Review the diff and call update_wiki_page for each page that needs updating, or call no_updates_needed if nothing needs to change.`;

const updatedPages = [];
let messages = [{ role: 'user', content: userContent }];

while (true) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools,
    messages,
  });

  const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

  if (toolUseBlocks.length === 0) break;

  const toolResults = [];

  for (const block of toolUseBlocks) {
    if (block.name === 'no_updates_needed') {
      console.log('No wiki updates needed:', block.input.reason);
      process.exit(0);
    }

    if (block.name === 'update_wiki_page') {
      const { page, content, reason } = block.input;
      const pagePath = join(WIKI_DIR, page);
      writeFileSync(pagePath, content, 'utf8');
      updatedPages.push(page);
      console.log(`Updated ${page}: ${reason}`);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Done.' });
    }
  }

  if (response.stop_reason === 'end_turn') break;

  messages = [
    ...messages,
    { role: 'assistant', content: response.content },
    { role: 'user', content: toolResults },
  ];
}

if (updatedPages.length > 0) {
  console.log(`\nWiki update complete. Pages updated: ${updatedPages.join(', ')}`);
} else {
  console.log('No wiki pages were updated.');
}
