import { promises as fs } from 'fs';
import path from 'path';
import { readWorkspaceConfig } from '../core/workspace.js';

export async function getActiveChangeIds(root: string = process.cwd()): Promise<string[]> {
  const changesPath = path.join(root, 'openspec', 'changes');
  try {
    const entries = await fs.readdir(changesPath, { withFileTypes: true });
    const result: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'archive') continue;
      const proposalPath = path.join(changesPath, entry.name, 'proposal.md');
      try {
        await fs.access(proposalPath);
        result.push(entry.name);
      } catch {
        // skip directories without proposal.md
      }
    }
    return result.sort();
  } catch {
    return [];
  }
}

export async function getSpecIds(root: string = process.cwd()): Promise<string[]> {
  const specsPath = path.join(root, 'openspec', 'specs');
  const result: string[] = [];
  try {
    const entries = await fs.readdir(specsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const specFile = path.join(specsPath, entry.name, 'spec.md');
      try {
        await fs.access(specFile);
        result.push(entry.name);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return result.sort();
}

export async function getArchivedChangeIds(root: string = process.cwd()): Promise<string[]> {
  const archivePath = path.join(root, 'openspec', 'changes', 'archive');
  try {
    const entries = await fs.readdir(archivePath, { withFileTypes: true });
    const result: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const proposalPath = path.join(archivePath, entry.name, 'proposal.md');
      try {
        await fs.access(proposalPath);
        result.push(entry.name);
      } catch {
        // skip directories without proposal.md
      }
    }
    return result.sort();
  } catch {
    return [];
  }
}

export interface ScopedChangeId {
  id: string;
  scope: string | null;
  scopeRoot: string;
}

export async function getActiveChangeIdsAcrossWorkspace(root: string = process.cwd()): Promise<ScopedChangeId[]> {
  const workspace = readWorkspaceConfig(root);

  if (!workspace) {
    const ids = await getActiveChangeIds(root);
    return ids.map(id => ({ id, scope: null, scopeRoot: root }));
  }

  const results: ScopedChangeId[] = [];

  const umbrellaIds = await getActiveChangeIds(root);
  for (const id of umbrellaIds) {
    results.push({ id, scope: null, scopeRoot: root });
  }

  for (const scope of workspace.scopes) {
    const scopeRoot = path.resolve(root, scope.path);
    const ids = await getActiveChangeIds(scopeRoot);
    for (const id of ids) {
      results.push({ id, scope: scope.name, scopeRoot });
    }
  }

  return results.sort((a, b) => {
    if (a.scope === b.scope) return a.id.localeCompare(b.id);
    if (a.scope === null) return -1;
    if (b.scope === null) return 1;
    return a.scope.localeCompare(b.scope);
  });
}

export async function getArchivedChangeIdsAcrossWorkspace(root: string = process.cwd()): Promise<ScopedChangeId[]> {
  const workspace = readWorkspaceConfig(root);

  if (!workspace) {
    const ids = await getArchivedChangeIds(root);
    return ids.map(id => ({ id, scope: null, scopeRoot: root }));
  }

  const results: ScopedChangeId[] = [];

  const umbrellaIds = await getArchivedChangeIds(root);
  for (const id of umbrellaIds) {
    results.push({ id, scope: null, scopeRoot: root });
  }

  for (const scope of workspace.scopes) {
    const scopeRoot = path.resolve(root, scope.path);
    const ids = await getArchivedChangeIds(scopeRoot);
    for (const id of ids) {
      results.push({ id, scope: scope.name, scopeRoot });
    }
  }

  return results.sort((a, b) => {
    if (a.scope === b.scope) return a.id.localeCompare(b.id);
    if (a.scope === null) return -1;
    if (b.scope === null) return 1;
    return a.scope.localeCompare(b.scope);
  });
}
