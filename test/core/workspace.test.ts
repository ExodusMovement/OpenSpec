import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  readWorkspaceConfig,
  writeWorkspaceConfig,
  detectMonorepoScopes,
  isWorkspace,
} from '../../src/core/workspace.js';

describe('workspace', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-workspace-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('readWorkspaceConfig', () => {
    it('returns null when file missing', () => {
      const result = readWorkspaceConfig(testDir);
      expect(result).toBeNull();
    });

    it('parses a valid workspace.yaml correctly', async () => {
      const openspecDir = path.join(testDir, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      await fs.writeFile(
        path.join(openspecDir, 'workspace.yaml'),
        `scopes:
  - name: web
    path: apps/web
    description: Web application
  - name: api
    path: apps/api
umbrella:
  path: openspec/changes
  description: Cross-cutting changes
`,
        'utf-8'
      );

      const result = readWorkspaceConfig(testDir);
      expect(result).not.toBeNull();
      expect(result!.scopes).toHaveLength(2);
      expect(result!.scopes[0]).toEqual({
        name: 'web',
        path: 'apps/web',
        description: 'Web application',
      });
      expect(result!.scopes[1]).toEqual({
        name: 'api',
        path: 'apps/api',
      });
      expect(result!.umbrella).toEqual({
        path: 'openspec/changes',
        description: 'Cross-cutting changes',
      });
    });

    it('returns null for invalid YAML structure', async () => {
      const openspecDir = path.join(testDir, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      await fs.writeFile(
        path.join(openspecDir, 'workspace.yaml'),
        'just a string',
        'utf-8'
      );

      const result = readWorkspaceConfig(testDir);
      expect(result).toBeNull();
    });
  });

  describe('writeWorkspaceConfig', () => {
    it('creates the file with correct YAML', () => {
      writeWorkspaceConfig(testDir, {
        scopes: [
          { name: 'web', path: 'apps/web' },
          { name: 'api', path: 'packages/api', description: 'API server' },
        ],
      });

      const configPath = path.join(testDir, 'openspec', 'workspace.yaml');
      const content = require('fs').readFileSync(configPath, 'utf-8');
      expect(content).toContain('name: web');
      expect(content).toContain('path: apps/web');
      expect(content).toContain('name: api');
      expect(content).toContain('description: API server');
    });

    it('creates openspec directory if it does not exist', () => {
      writeWorkspaceConfig(testDir, { scopes: [{ name: 'a', path: 'a' }] });
      const dirExists = require('fs').existsSync(path.join(testDir, 'openspec'));
      expect(dirExists).toBe(true);
    });
  });

  describe('detectMonorepoScopes', () => {
    it('discovers scopes from pnpm-workspace.yaml', async () => {
      await fs.writeFile(
        path.join(testDir, 'pnpm-workspace.yaml'),
        'packages:\n  - "apps/*"\n  - "packages/*"\n',
        'utf-8'
      );

      const webDir = path.join(testDir, 'apps', 'web');
      const apiDir = path.join(testDir, 'packages', 'api');
      await fs.mkdir(webDir, { recursive: true });
      await fs.mkdir(apiDir, { recursive: true });
      await fs.writeFile(path.join(webDir, 'package.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(apiDir, 'package.json'), '{}', 'utf-8');

      const scopes = detectMonorepoScopes(testDir);
      expect(scopes).toHaveLength(2);
      expect(scopes.map((s) => s.name).sort()).toEqual(['api', 'web']);
    });

    it('discovers scopes from turbo.json + package.json workspaces', async () => {
      await fs.writeFile(
        path.join(testDir, 'turbo.json'),
        '{"pipeline":{}}',
        'utf-8'
      );
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ workspaces: ['apps/*'] }),
        'utf-8'
      );

      const webDir = path.join(testDir, 'apps', 'web');
      await fs.mkdir(webDir, { recursive: true });
      await fs.writeFile(path.join(webDir, 'package.json'), '{}', 'utf-8');

      const scopes = detectMonorepoScopes(testDir);
      expect(scopes).toHaveLength(1);
      expect(scopes[0].name).toBe('web');
      expect(scopes[0].path).toBe('apps/web');
    });

    it('returns empty array when no monorepo markers found', () => {
      const scopes = detectMonorepoScopes(testDir);
      expect(scopes).toEqual([]);
    });

    it('ignores directories without package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'pnpm-workspace.yaml'),
        'packages:\n  - "apps/*"\n',
        'utf-8'
      );

      const webDir = path.join(testDir, 'apps', 'web');
      await fs.mkdir(webDir, { recursive: true });

      const scopes = detectMonorepoScopes(testDir);
      expect(scopes).toEqual([]);
    });
  });

  describe('isWorkspace', () => {
    it('returns true when workspace.yaml exists', async () => {
      const openspecDir = path.join(testDir, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      await fs.writeFile(
        path.join(openspecDir, 'workspace.yaml'),
        'scopes: []\n',
        'utf-8'
      );

      expect(isWorkspace(testDir)).toBe(true);
    });

    it('returns false when workspace.yaml does not exist', () => {
      expect(isWorkspace(testDir)).toBe(false);
    });
  });
});
