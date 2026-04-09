import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Command } from 'commander';

vi.mock('../../../src/core/superpowers-detection.js', () => ({
  detectSuperpowers: vi.fn(),
  shouldEnhanceWithSuperpowers: vi.fn(),
}));
vi.mock('../../../src/core/global-config.js', () => ({
  getGlobalConfig: vi.fn(),
  saveGlobalConfig: vi.fn(),
  getGlobalConfigPath: vi.fn(() => '/mock/config-path'),
}));

import { detectSuperpowers } from '../../../src/core/superpowers-detection.js';
import { getGlobalConfig, saveGlobalConfig } from '../../../src/core/global-config.js';
import { registerSuperpowersCommand } from '../../../src/commands/superpowers.js';

describe('superpowers command', () => {
  let program: Command;
  let output: string[];
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'openspec-sp-cmd-test-'));
    program = new Command();
    program.exitOverride();
    output = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    });
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      output.push(args.join(' '));
    });

    vi.mocked(getGlobalConfig).mockReturnValue({});
    vi.mocked(saveGlobalConfig).mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('setup subcommand', () => {
    it('prints not-found message and exits cleanly when Superpowers not detected', async () => {
      vi.mocked(detectSuperpowers).mockReturnValue({ installed: false });

      registerSuperpowersCommand(program);
      await program.parseAsync(['node', 'openspec', 'superpowers', 'setup']);

      const combined = output.join('\n');
      expect(combined).toContain('not found');
    });
  });

  describe('enable subcommand', () => {
    it('removes superpowers.enabled: false from config', async () => {
      vi.mocked(getGlobalConfig).mockReturnValue({ superpowers: { enabled: false } });

      registerSuperpowersCommand(program);
      await program.parseAsync(['node', 'openspec', 'superpowers', 'enable']);

      expect(saveGlobalConfig).toHaveBeenCalledWith(
        expect.objectContaining({ superpowers: expect.objectContaining({ enabled: true }) })
      );
    });
  });

  describe('disable subcommand', () => {
    it('writes superpowers.enabled: false to config', async () => {
      registerSuperpowersCommand(program);
      await program.parseAsync(['node', 'openspec', 'superpowers', 'disable']);

      expect(saveGlobalConfig).toHaveBeenCalledWith(
        expect.objectContaining({ superpowers: expect.objectContaining({ enabled: false }) })
      );
    });
  });

  describe('status subcommand', () => {
    it('reports not installed when Superpowers not detected', async () => {
      vi.mocked(detectSuperpowers).mockReturnValue({ installed: false });

      registerSuperpowersCommand(program);
      await program.parseAsync(['node', 'openspec', 'superpowers', 'status']);

      const combined = output.join('\n');
      expect(combined).toMatch(/not installed|not found|not detected/i);
    });

    it('reports detected path when Superpowers is installed', async () => {
      const installPath = '/Users/test/.claude/skills/superpowers:core';
      vi.mocked(detectSuperpowers).mockReturnValue({ installed: true, installPath });

      registerSuperpowersCommand(program);
      await program.parseAsync(['node', 'openspec', 'superpowers', 'status']);

      const combined = output.join('\n');
      expect(combined).toContain(installPath);
    });
  });
});
