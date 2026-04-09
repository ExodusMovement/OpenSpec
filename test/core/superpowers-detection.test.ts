import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { detectSuperpowers, shouldEnhanceWithSuperpowers } from '../../src/core/superpowers-detection.js';

describe('superpowers-detection', () => {
  let fakeHome: string;

  beforeEach(async () => {
    fakeHome = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(fakeHome, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(fakeHome, { recursive: true, force: true });
  });

  describe('detectSuperpowers', () => {
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
      expect(result.installPath).toBeUndefined();
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

    it('does not detect project-local .claude/skills — only global', async () => {
      const projectLocalSkills = path.join(fakeHome, 'myproject', '.claude', 'skills');
      await fs.mkdir(path.join(projectLocalSkills, 'superpowers:using-superpowers'), { recursive: true });

      const result = detectSuperpowers(fakeHome);
      expect(result.installed).toBe(false);
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
