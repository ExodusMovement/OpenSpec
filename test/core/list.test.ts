import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ListCommand } from '../../src/core/list.js';

describe('ListCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `openspec-list-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Mock console.log to capture output
    originalLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
    logOutput = [];
  });

  afterEach(async () => {
    // Restore console.log
    console.log = originalLog;

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('execute', () => {
    it('should handle missing openspec/changes directory', async () => {
      const listCommand = new ListCommand();
      
      await expect(listCommand.execute(tempDir, 'changes')).rejects.toThrow(
        "No OpenSpec changes directory found. Run 'openspec init' first."
      );
    });

    it('should handle empty changes directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toEqual(['No active changes found.']);
    });

    it('should exclude archive directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'my-change'), { recursive: true });
      
      // Create tasks.md with some tasks
      await fs.writeFile(
        path.join(changesDir, 'my-change', 'tasks.md'),
        '- [x] Task 1\n- [ ] Task 2\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('my-change'))).toBe(true);
      expect(logOutput.some(line => line.includes('archive'))).toBe(false);
    });

    it('should count tasks correctly', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'test-change'), { recursive: true });
      
      await fs.writeFile(
        path.join(changesDir, 'test-change', 'tasks.md'),
        `# Tasks
- [x] Completed task 1
- [x] Completed task 2
- [ ] Incomplete task 1
- [ ] Incomplete task 2
- [ ] Incomplete task 3
Regular text that should be ignored
`
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('2/5 tasks'))).toBe(true);
    });

    it('should show complete status for fully completed changes', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'completed-change'), { recursive: true });
      
      await fs.writeFile(
        path.join(changesDir, 'completed-change', 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2\n- [x] Task 3\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('✓ Complete'))).toBe(true);
    });

    it('should handle changes without tasks.md', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });

    it('should sort changes alphabetically when sort=name', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'zebra'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'alpha'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'middle'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { sort: 'name' });

      const changeLines = logOutput.filter(line =>
        line.includes('alpha') || line.includes('middle') || line.includes('zebra')
      );

      expect(changeLines[0]).toContain('alpha');
      expect(changeLines[1]).toContain('middle');
      expect(changeLines[2]).toContain('zebra');
    });

    it('should handle multiple changes with various states', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');

      // Complete change
      await fs.mkdir(path.join(changesDir, 'completed'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'completed', 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2\n'
      );

      // Partial change
      await fs.mkdir(path.join(changesDir, 'partial'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'partial', 'tasks.md'),
        '- [x] Done\n- [ ] Not done\n- [ ] Also not done\n'
      );

      // No tasks
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir);

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('completed') && line.includes('✓ Complete'))).toBe(true);
      expect(logOutput.some(line => line.includes('partial') && line.includes('1/3 tasks'))).toBe(true);
      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });
  });

  describe('workspace mode', () => {
    async function makeWorkspace(root: string, scopes: { name: string; scopePath: string }[]) {
      const openspecDir = path.join(root, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      const yaml = `scopes:\n${scopes.map(s => `  - name: ${s.name}\n    path: ${s.scopePath}`).join('\n')}\n`;
      await fs.writeFile(path.join(openspecDir, 'workspace.yaml'), yaml, 'utf-8');
    }

    it('should list changes across all workspace scopes', async () => {
      const webRoot = path.join(tempDir, 'apps', 'web');
      const apiRoot = path.join(tempDir, 'apps', 'api');
      await fs.mkdir(path.join(webRoot, 'openspec', 'changes', 'web-change'), { recursive: true });
      await fs.mkdir(path.join(apiRoot, 'openspec', 'changes', 'api-change'), { recursive: true });
      await makeWorkspace(tempDir, [
        { name: 'web', scopePath: 'apps/web' },
        { name: 'api', scopePath: 'apps/api' },
      ]);

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('[web]') && line.includes('web-change'))).toBe(true);
      expect(logOutput.some(line => line.includes('[api]') && line.includes('api-change'))).toBe(true);
    });

    it('should include root-level umbrella changes labelled [root]', async () => {
      const webRoot = path.join(tempDir, 'apps', 'web');
      await fs.mkdir(path.join(webRoot, 'openspec', 'changes', 'web-change'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'umbrella-change'), { recursive: true });
      await makeWorkspace(tempDir, [{ name: 'web', scopePath: 'apps/web' }]);

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('[root]') && line.includes('umbrella-change'))).toBe(true);
      expect(logOutput.some(line => line.includes('[web]') && line.includes('web-change'))).toBe(true);
    });

    it('should output JSON with scope field per change', async () => {
      const webRoot = path.join(tempDir, 'apps', 'web');
      await fs.mkdir(path.join(webRoot, 'openspec', 'changes', 'web-change'), { recursive: true });
      await makeWorkspace(tempDir, [{ name: 'web', scopePath: 'apps/web' }]);

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { json: true });

      const raw = logOutput.join('\n');
      const parsed = JSON.parse(raw);
      expect(parsed.changes).toHaveLength(1);
      expect(parsed.changes[0].name).toBe('web-change');
      expect(parsed.changes[0].scope).toBe('web');
    });

    it('should return empty JSON when no changes exist in workspace', async () => {
      const webRoot = path.join(tempDir, 'apps', 'web');
      await fs.mkdir(webRoot, { recursive: true });
      await makeWorkspace(tempDir, [{ name: 'web', scopePath: 'apps/web' }]);

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { json: true });

      const raw = logOutput.join('\n');
      const parsed = JSON.parse(raw);
      expect(parsed.changes).toEqual([]);
    });

    it('should sort workspace changes alphabetically by scope then name when sort=name', async () => {
      const webRoot = path.join(tempDir, 'apps', 'web');
      const apiRoot = path.join(tempDir, 'apps', 'api');
      await fs.mkdir(path.join(webRoot, 'openspec', 'changes', 'z-change'), { recursive: true });
      await fs.mkdir(path.join(apiRoot, 'openspec', 'changes', 'a-change'), { recursive: true });
      await makeWorkspace(tempDir, [
        { name: 'web', scopePath: 'apps/web' },
        { name: 'api', scopePath: 'apps/api' },
      ]);

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { sort: 'name' });

      const changeLines = logOutput.filter(line => line.includes('[api]') || line.includes('[web]'));
      expect(changeLines[0]).toContain('[api]');
      expect(changeLines[1]).toContain('[web]');
    });
  });
});