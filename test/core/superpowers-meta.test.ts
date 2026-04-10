import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeSuperpowersMeta, readSuperpowersMeta } from '../../src/core/superpowers-meta.js';

describe('superpowers meta', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'openspec-sp-meta-test-'));
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  describe('writeSuperpowersMeta', () => {
    it('writes .openspec-meta.yaml with correct fields', async () => {
      const installPath = '/Users/test/.claude/skills/superpowers:core';
      await writeSuperpowersMeta(projectDir, { installPath, configPatched: true });

      const content = await readFile(join(projectDir, '.openspec-meta.yaml'), 'utf8');
      expect(content).toContain('enhanced: true');
      expect(content).toContain('configPatched: true');
      expect(content).toContain(installPath);
      expect(content).toContain('detectedAt:');
    });

    it('writes configPatched: false when not patched', async () => {
      await writeSuperpowersMeta(projectDir, { installPath: '/some/path', configPatched: false });

      const content = await readFile(join(projectDir, '.openspec-meta.yaml'), 'utf8');
      expect(content).toContain('configPatched: false');
    });

    it('overwrites existing meta file on re-run', async () => {
      await writeSuperpowersMeta(projectDir, { installPath: '/path/v1', configPatched: false });
      await writeSuperpowersMeta(projectDir, { installPath: '/path/v2', configPatched: true });

      const content = await readFile(join(projectDir, '.openspec-meta.yaml'), 'utf8');
      expect(content).toContain('/path/v2');
      expect(content).not.toContain('/path/v1');
    });
  });

  describe('readSuperpowersMeta', () => {
    it('returns null when meta file does not exist', async () => {
      const result = await readSuperpowersMeta(projectDir);
      expect(result).toBeNull();
    });

    it('returns parsed meta when file exists', async () => {
      const installPath = '/Users/test/.claude/skills/superpowers:core';
      await writeSuperpowersMeta(projectDir, { installPath, configPatched: true });

      const result = await readSuperpowersMeta(projectDir);
      expect(result).not.toBeNull();
      expect(result?.superpowers.enhanced).toBe(true);
      expect(result?.superpowers.configPatched).toBe(true);
      expect(result?.superpowers.installPath).toBe(installPath);
      expect(result?.superpowers.detectedAt).toBeTruthy();
    });
  });
});
