import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse } from 'yaml';
import { injectSuperpowersTddRules } from '../../src/core/superpowers-config.js';

const TDD_RULE = 'Write failing test before any production code (TDD red-green-refactor)';

describe('injectSuperpowersTddRules', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'openspec-sp-config-test-'));
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('returns no-config when config.yaml does not exist', async () => {
    const result = await injectSuperpowersTddRules(projectDir);
    expect(result).toBe('no-config');
  });

  it('injects TDD rule into rules.tasks when absent', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'name: my-project\n');

    const result = await injectSuperpowersTddRules(projectDir);

    expect(result).toBe('injected');
    const content = await readFile(configPath, 'utf8');
    const parsed = parse(content) as Record<string, unknown>;
    const tasks = (parsed.rules as Record<string, unknown>)?.tasks as string[];
    expect(tasks).toContain(TDD_RULE);
  });

  it('preserves existing rules.tasks entries', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'rules:\n  tasks:\n    - Existing rule\n');

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    const parsed = parse(content) as Record<string, unknown>;
    const tasks = (parsed.rules as Record<string, unknown>)?.tasks as string[];
    expect(tasks).toContain('Existing rule');
    expect(tasks).toContain(TDD_RULE);
  });

  it('is idempotent: returns already-present if TDD rule exists', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, `rules:\n  tasks:\n    - "${TDD_RULE}"\n`);

    const result = await injectSuperpowersTddRules(projectDir);

    expect(result).toBe('already-present');
  });

  it('does not modify file when already-present', async () => {
    const configPath = join(projectDir, 'config.yaml');
    const original = `rules:\n  tasks:\n    - "${TDD_RULE}"\n`;
    await writeFile(configPath, original);

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    expect(content).toBe(original);
  });

  it('strips non-string tasks entries (old bad injection format) and adds TDD rule', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'rules:\n  tasks:\n    - description: old bad format\n      enforce: always\n');

    const result = await injectSuperpowersTddRules(projectDir);

    expect(result).toBe('injected');
    const content = await readFile(configPath, 'utf8');
    const parsed = parse(content) as Record<string, unknown>;
    const tasks = (parsed.rules as Record<string, unknown>)?.tasks as string[];
    expect(tasks).toEqual([TDD_RULE]);
  });

  it('post-inject file parses as valid YAML', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'name: my-project\n');

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    expect(() => parse(content)).not.toThrow();
  });

  it('preserves existing non-rules config keys', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'schema: spec-driven\nname: test\n');

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    const parsed = parse(content) as Record<string, unknown>;
    expect(parsed.schema).toBe('spec-driven');
    expect(parsed.name).toBe('test');
  });

  it('returns error and does not write for malformed YAML', async () => {
    const configPath = join(projectDir, 'config.yaml');
    const malformed = 'name: [unclosed bracket\n  bad: yaml: :\n';
    await writeFile(configPath, malformed);

    const result = await injectSuperpowersTddRules(projectDir);

    expect(result).toBe('error');
    const content = await readFile(configPath, 'utf8');
    expect(content).toBe(malformed);
  });
});
