import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  getActiveChangeIds,
  getArchivedChangeIds,
  getActiveChangeIdsAcrossWorkspace,
  getArchivedChangeIdsAcrossWorkspace,
} from '../../src/utils/item-discovery.js';

async function makeChange(dir: string, name: string) {
  const changeDir = path.join(dir, 'openspec', 'changes', name);
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal', 'utf-8');
}

async function makeArchivedChange(dir: string, name: string) {
  const archiveDir = path.join(dir, 'openspec', 'changes', 'archive', name);
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.writeFile(path.join(archiveDir, 'proposal.md'), '# Proposal', 'utf-8');
}

async function makeWorkspace(root: string, scopes: { name: string; path: string }[]) {
  const openspecDir = path.join(root, 'openspec');
  await fs.mkdir(openspecDir, { recursive: true });
  const yaml = `scopes:\n${scopes.map(s => `  - name: ${s.name}\n    path: ${s.path}`).join('\n')}\n`;
  await fs.writeFile(path.join(openspecDir, 'workspace.yaml'), yaml, 'utf-8');
}

describe('getActiveChangeIds', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-item-discovery-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns empty array when changes directory missing', async () => {
    const result = await getActiveChangeIds(testDir);
    expect(result).toEqual([]);
  });

  it('returns change ids that have proposal.md', async () => {
    await makeChange(testDir, 'add-auth');
    await makeChange(testDir, 'fix-bug');

    const result = await getActiveChangeIds(testDir);
    expect(result).toEqual(['add-auth', 'fix-bug']);
  });

  it('excludes archive directory', async () => {
    await makeChange(testDir, 'active-change');
    await makeArchivedChange(testDir, 'old-change');

    const result = await getActiveChangeIds(testDir);
    expect(result).toEqual(['active-change']);
  });

  it('excludes directories without proposal.md', async () => {
    const emptyDir = path.join(testDir, 'openspec', 'changes', 'no-proposal');
    await fs.mkdir(emptyDir, { recursive: true });
    await makeChange(testDir, 'has-proposal');

    const result = await getActiveChangeIds(testDir);
    expect(result).toEqual(['has-proposal']);
  });
});

describe('getArchivedChangeIds', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-item-discovery-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns empty array when archive directory missing', async () => {
    const result = await getArchivedChangeIds(testDir);
    expect(result).toEqual([]);
  });

  it('returns archived change ids with proposal.md', async () => {
    await makeArchivedChange(testDir, '2024-01-01-add-auth');
    await makeArchivedChange(testDir, '2024-01-02-fix-bug');

    const result = await getArchivedChangeIds(testDir);
    expect(result).toEqual(['2024-01-01-add-auth', '2024-01-02-fix-bug']);
  });
});

describe('getActiveChangeIdsAcrossWorkspace', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-workspace-discovery-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns single-scope results when no workspace.yaml', async () => {
    await makeChange(testDir, 'add-auth');

    const result = await getActiveChangeIdsAcrossWorkspace(testDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'add-auth', scope: null, scopeRoot: testDir });
  });

  it('aggregates changes across workspace scopes', async () => {
    const webRoot = path.join(testDir, 'apps', 'web');
    const apiRoot = path.join(testDir, 'apps', 'api');
    await fs.mkdir(webRoot, { recursive: true });
    await fs.mkdir(apiRoot, { recursive: true });

    await makeWorkspace(testDir, [
      { name: 'web', path: 'apps/web' },
      { name: 'api', path: 'apps/api' },
    ]);
    await makeChange(webRoot, 'web-change');
    await makeChange(apiRoot, 'api-change');

    const result = await getActiveChangeIdsAcrossWorkspace(testDir);
    expect(result).toHaveLength(2);

    const webChange = result.find(r => r.scope === 'web');
    const apiChange = result.find(r => r.scope === 'api');

    expect(webChange).toBeDefined();
    expect(webChange!.id).toBe('web-change');
    expect(webChange!.scopeRoot).toBe(webRoot);

    expect(apiChange).toBeDefined();
    expect(apiChange!.id).toBe('api-change');
    expect(apiChange!.scopeRoot).toBe(apiRoot);
  });

  it('includes root-level umbrella changes alongside scope changes', async () => {
    const apiRoot = path.join(testDir, 'apps', 'api');
    await fs.mkdir(apiRoot, { recursive: true });

    await makeWorkspace(testDir, [{ name: 'api', path: 'apps/api' }]);
    await makeChange(testDir, 'umbrella-change');
    await makeChange(apiRoot, 'api-change');

    const result = await getActiveChangeIdsAcrossWorkspace(testDir);
    expect(result).toHaveLength(2);

    const umbrella = result.find(r => r.scope === null);
    const api = result.find(r => r.scope === 'api');

    expect(umbrella!.id).toBe('umbrella-change');
    expect(api!.id).toBe('api-change');
  });

  it('returns empty array when no changes exist in any scope', async () => {
    const webRoot = path.join(testDir, 'apps', 'web');
    await fs.mkdir(webRoot, { recursive: true });
    await makeWorkspace(testDir, [{ name: 'web', path: 'apps/web' }]);

    const result = await getActiveChangeIdsAcrossWorkspace(testDir);
    expect(result).toEqual([]);
  });

  it('sorts umbrella changes before scope changes', async () => {
    const webRoot = path.join(testDir, 'apps', 'web');
    await fs.mkdir(webRoot, { recursive: true });
    await makeWorkspace(testDir, [{ name: 'web', path: 'apps/web' }]);
    await makeChange(testDir, 'cross-scope');
    await makeChange(webRoot, 'web-only');

    const result = await getActiveChangeIdsAcrossWorkspace(testDir);
    expect(result[0].scope).toBeNull();
    expect(result[1].scope).toBe('web');
  });
});

describe('getArchivedChangeIdsAcrossWorkspace', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-workspace-archived-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns single-scope archived results when no workspace.yaml', async () => {
    await makeArchivedChange(testDir, '2024-01-01-old-change');

    const result = await getArchivedChangeIdsAcrossWorkspace(testDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: '2024-01-01-old-change',
      scope: null,
      scopeRoot: testDir,
    });
  });

  it('aggregates archived changes across workspace scopes', async () => {
    const webRoot = path.join(testDir, 'apps', 'web');
    const apiRoot = path.join(testDir, 'apps', 'api');
    await fs.mkdir(webRoot, { recursive: true });
    await fs.mkdir(apiRoot, { recursive: true });

    await makeWorkspace(testDir, [
      { name: 'web', path: 'apps/web' },
      { name: 'api', path: 'apps/api' },
    ]);
    await makeArchivedChange(webRoot, '2024-01-01-web-old');
    await makeArchivedChange(apiRoot, '2024-01-02-api-old');

    const result = await getArchivedChangeIdsAcrossWorkspace(testDir);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.scope).sort()).toEqual(['api', 'web']);
  });
});
