import { readFile, writeFile, rename } from 'fs/promises';
import { join } from 'path';
import { parse, stringify } from 'yaml';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export type InjectionResult = 'injected' | 'already-present' | 'no-config' | 'error';

const TDD_TASK_RULE = 'Write failing test before any production code (TDD red-green-refactor)';

export async function injectSuperpowersTddRules(projectPath: string): Promise<InjectionResult> {
  const configPath = join(projectPath, 'config.yaml');

  let existing: string;
  try {
    existing = await readFile(configPath, 'utf8');
  } catch {
    return 'no-config';
  }

  let config: Record<string, unknown>;
  try {
    config = parse(existing) as Record<string, unknown>;
  } catch {
    return 'error';
  }

  const rules = (config.rules ?? {}) as Record<string, unknown>;
  const rawTasks = Array.isArray(rules.tasks) ? rules.tasks : [];
  const stringTasks = rawTasks.filter((t): t is string => typeof t === 'string');

  if (stringTasks.includes(TDD_TASK_RULE)) {
    return 'already-present';
  }

  config.rules = { ...rules, tasks: [...stringTasks, TDD_TASK_RULE] };

  let injected: string;
  try {
    injected = stringify(config);
  } catch {
    return 'error';
  }

  const tmpPath = join(tmpdir(), `openspec-config-${randomUUID()}.yaml`);
  await writeFile(tmpPath, injected, 'utf8');
  await rename(tmpPath, configPath);

  return 'injected';
}
