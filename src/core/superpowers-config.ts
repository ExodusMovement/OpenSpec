import { readFile, writeFile, rename } from 'fs/promises';
import { join } from 'path';
import { parse } from 'yaml';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export type InjectionResult = 'injected' | 'already-present' | 'no-config' | 'error';

const MARKER = '# superpowers-tdd-rules';

const TDD_RULES_BLOCK = `
${MARKER}
rules:
  tasks:
    - description: "Write failing test before any production code (TDD red-green-refactor)"
      enforce: always
`;

export async function injectSuperpowersTddRules(projectPath: string): Promise<InjectionResult> {
  const configPath = join(projectPath, 'config.yaml');

  let existing: string;
  try {
    existing = await readFile(configPath, 'utf8');
  } catch {
    return 'no-config';
  }

  if (existing.includes(MARKER)) {
    return 'already-present';
  }

  try {
    parse(existing);
  } catch {
    return 'error';
  }

  const injected = existing.endsWith('\n') ? existing + TDD_RULES_BLOCK : existing + '\n' + TDD_RULES_BLOCK;

  try {
    parse(injected);
  } catch {
    return 'error';
  }

  const tmpPath = join(tmpdir(), `openspec-config-${randomUUID()}.yaml`);
  await writeFile(tmpPath, injected, 'utf8');
  await rename(tmpPath, configPath);

  return 'injected';
}
