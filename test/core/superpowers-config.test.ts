import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { injectSuperpowersTddRules } from '../../src/core/superpowers-config.js';

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

  it('injects TDD rules when marker is absent', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'name: my-project\n');

    const result = await injectSuperpowersTddRules(projectDir);

    expect(result).toBe('injected');
    const content = await readFile(configPath, 'utf8');
    expect(content).toContain('# superpowers-tdd-rules');
    expect(content).toContain('name: my-project');
  });

  it('preserves all existing content character-for-character', async () => {
    const configPath = join(projectDir, 'config.yaml');
    const original = 'name: my-project\nversion: 1.0\ncustom: value\n';
    await writeFile(configPath, original);

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    expect(content).toContain(original);
  });

  it('is idempotent: returns already-present if marker exists', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'name: test\n# superpowers-tdd-rules\nrules:\n  tasks:\n    - tdd\n');

    const result = await injectSuperpowersTddRules(projectDir);

    expect(result).toBe('already-present');
  });

  it('does not write when already-present', async () => {
    const configPath = join(projectDir, 'config.yaml');
    const original = 'name: test\n# superpowers-tdd-rules\nrules:\n  tasks:\n    - tdd\n';
    await writeFile(configPath, original);

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    expect(content).toBe(original);
  });

  it('post-inject file parses as valid YAML', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'name: my-project\n');

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    const { parse } = await import('yaml');
    expect(() => parse(content)).not.toThrow();
  });

  it('appends rules block when rules key is absent', async () => {
    const configPath = join(projectDir, 'config.yaml');
    await writeFile(configPath, 'name: my-project\n');

    await injectSuperpowersTddRules(projectDir);

    const content = await readFile(configPath, 'utf8');
    expect(content).toContain('rules:');
    expect(content).toContain('tasks:');
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
