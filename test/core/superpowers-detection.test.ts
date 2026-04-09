import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { detectSuperpowers, shouldEnhanceWithSuperpowers } from '../../src/core/superpowers-detection.js';

const FAKE_PLUGINS_FILE = (installPath: string) => JSON.stringify({
  version: 2,
  plugins: {
    'superpowers@claude-plugins-official': [
      { scope: 'user', installPath, version: '5.0.0', installedAt: '', lastUpdated: '', gitCommitSha: '' }
    ]
  }
});

describe('superpowers-detection', () => {
  let fakeHome: string;
  let fakeProject: string;

  beforeEach(async () => {
    fakeHome = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    fakeProject = path.join(os.tmpdir(), `openspec-project-${randomUUID()}`);
    await fs.mkdir(fakeHome, { recursive: true });
    await fs.mkdir(fakeProject, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(fakeHome, { recursive: true, force: true });
    await fs.rm(fakeProject, { recursive: true, force: true });
  });

  describe('detectSuperpowers — plugin-based (installed_plugins.json)', () => {
    it('returns installed=true when superpowers@ entry exists in global plugins', async () => {
      const installPath = path.join(fakeHome, 'sp-install');
      await fs.mkdir(installPath, { recursive: true });
      const pluginsDir = path.join(fakeHome, '.claude', 'plugins');
      await fs.mkdir(pluginsDir, { recursive: true });
      await fs.writeFile(path.join(pluginsDir, 'installed_plugins.json'), FAKE_PLUGINS_FILE(installPath));

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(true);
      expect(result.installPath).toBe(path.resolve(installPath));
    });

    it('returns installed=true when superpowers@ entry exists in project-local plugins', async () => {
      const installPath = path.join(fakeProject, 'sp-install');
      await fs.mkdir(installPath, { recursive: true });
      const pluginsDir = path.join(fakeProject, '.claude', 'plugins');
      await fs.mkdir(pluginsDir, { recursive: true });
      await fs.writeFile(path.join(pluginsDir, 'installed_plugins.json'), FAKE_PLUGINS_FILE(installPath));

      const result = detectSuperpowers(fakeHome, fakeProject);
      expect(result.installed).toBe(true);
      expect(result.installPath).toBe(path.resolve(installPath));
    });

    it('prefers project-local over global when both exist', async () => {
      const globalInstallPath = path.join(fakeHome, 'sp-global');
      const projectInstallPath = path.join(fakeProject, 'sp-project');
      await fs.mkdir(globalInstallPath, { recursive: true });
      await fs.mkdir(projectInstallPath, { recursive: true });

      const globalPluginsDir = path.join(fakeHome, '.claude', 'plugins');
      await fs.mkdir(globalPluginsDir, { recursive: true });
      await fs.writeFile(path.join(globalPluginsDir, 'installed_plugins.json'), FAKE_PLUGINS_FILE(globalInstallPath));

      const projectPluginsDir = path.join(fakeProject, '.claude', 'plugins');
      await fs.mkdir(projectPluginsDir, { recursive: true });
      await fs.writeFile(path.join(projectPluginsDir, 'installed_plugins.json'), FAKE_PLUGINS_FILE(projectInstallPath));

      const result = detectSuperpowers(fakeHome, fakeProject);
      expect(result.installPath).toBe(path.resolve(projectInstallPath));
    });

    it('returns installed=false when installed_plugins.json has no superpowers entry', async () => {
      const pluginsDir = path.join(fakeHome, '.claude', 'plugins');
      await fs.mkdir(pluginsDir, { recursive: true });
      await fs.writeFile(path.join(pluginsDir, 'installed_plugins.json'), JSON.stringify({
        version: 2,
        plugins: { 'other-plugin@marketplace': [{ scope: 'user', installPath: '/some/path', version: '1.0.0' }] }
      }));

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(false);
    });

    it('returns installed=false when installed_plugins.json is malformed', async () => {
      const pluginsDir = path.join(fakeHome, '.claude', 'plugins');
      await fs.mkdir(pluginsDir, { recursive: true });
      await fs.writeFile(path.join(pluginsDir, 'installed_plugins.json'), 'not json {{{');

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(false);
    });
  });

  describe('detectSuperpowers — skills-based fallback (superpowers:* dirs)', () => {
    it('returns installed=true when a superpowers: directory exists', async () => {
      const skillsDir = path.join(fakeHome, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'superpowers:using-superpowers'), { recursive: true });

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(true);
      expect(result.installPath).toBeDefined();
    });

    it('returns installed=false when no superpowers: directory exists', async () => {
      const skillsDir = path.join(fakeHome, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'some-other-skill'), { recursive: true });

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(false);
    });

    it('returns installed=false when ~/.claude/skills does not exist', () => {
      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(false);
    });

    it('returns first lexicographic match when multiple superpowers: directories exist', async () => {
      const skillsDir = path.join(fakeHome, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'superpowers:brainstorming'), { recursive: true });
      await fs.mkdir(path.join(skillsDir, 'superpowers:another'), { recursive: true });
      await fs.mkdir(path.join(skillsDir, 'superpowers:using-superpowers'), { recursive: true });

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(true);
      expect(result.installPath).toContain('superpowers:another');
    });

    it('returns a canonicalized (resolved) path', async () => {
      const skillsDir = path.join(fakeHome, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'superpowers:using-superpowers'), { recursive: true });

      const result = detectSuperpowers(fakeHome);
      expect(result.installPath).toBe(path.resolve(result.installPath!));
    });

    it('does not detect project-local .claude/skills as global when no projectPath given', async () => {
      const projectLocalSkills = path.join(fakeHome, 'myproject', '.claude', 'skills');
      await fs.mkdir(path.join(projectLocalSkills, 'superpowers:using-superpowers'), { recursive: true });

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(false);
    });

    it('detects project-local .claude/skills when projectPath given', async () => {
      const projectLocalSkills = path.join(fakeProject, '.claude', 'skills');
      await fs.mkdir(path.join(projectLocalSkills, 'superpowers:core'), { recursive: true });

      const result = detectSuperpowers(fakeHome, fakeProject);
      expect(result.installed).toBe(true);
      expect(result.installPath).toContain('superpowers:core');
    });
  });

  describe('shouldEnhanceWithSuperpowers', () => {
    const detected = { installed: true, installPath: '/some/path' };
    const notDetected = { installed: false };

    it('returns true when installed, claude selected, not opted out', () => {
      expect(shouldEnhanceWithSuperpowers(['claude', 'cursor'], detected, false)).toBe(true);
    });

    it('returns false when claude is not in selected tool ids', () => {
      expect(shouldEnhanceWithSuperpowers(['cursor', 'windsurf'], detected, false)).toBe(false);
    });

    it('returns false when opted out', () => {
      expect(shouldEnhanceWithSuperpowers(['claude'], detected, true)).toBe(false);
    });

    it('returns false when superpowers not installed', () => {
      expect(shouldEnhanceWithSuperpowers(['claude'], notDetected, false)).toBe(false);
    });

    it('returns false when tool list is empty', () => {
      expect(shouldEnhanceWithSuperpowers([], detected, false)).toBe(false);
    });
  });
});
