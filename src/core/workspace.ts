import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import fg from 'fast-glob';

export interface WorkspaceScope {
  name: string;
  path: string;
  description?: string;
}

export interface WorkspaceUmbrella {
  path: string;
  description?: string;
}

export interface WorkspaceConfig {
  scopes: WorkspaceScope[];
  umbrella?: WorkspaceUmbrella;
}

export function readWorkspaceConfig(projectPath: string): WorkspaceConfig | null {
  const configPath = path.join(projectPath, 'openspec', 'workspace.yaml');
  if (!existsSync(configPath)) {
    return null;
  }

  const content = readFileSync(configPath, 'utf-8');
  const raw = parseYaml(content);

  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.scopes)) {
    return null;
  }

  const scopes: WorkspaceScope[] = raw.scopes
    .filter((s: unknown) => typeof s === 'object' && s !== null && 'name' in s && 'path' in s)
    .map((s: Record<string, unknown>) => ({
      name: String(s.name),
      path: String(s.path),
      ...(s.description ? { description: String(s.description) } : {}),
    }));

  const config: WorkspaceConfig = { scopes };

  if (raw.umbrella && typeof raw.umbrella === 'object') {
    config.umbrella = {
      path: String(raw.umbrella.path ?? 'openspec/changes'),
      ...(raw.umbrella.description ? { description: String(raw.umbrella.description) } : {}),
    };
  }

  return config;
}

export function writeWorkspaceConfig(projectPath: string, config: WorkspaceConfig): void {
  const openspecDir = path.join(projectPath, 'openspec');
  if (!existsSync(openspecDir)) {
    mkdirSync(openspecDir, { recursive: true });
  }

  const configPath = path.join(openspecDir, 'workspace.yaml');
  const content = stringifyYaml(config, { lineWidth: 120 });
  writeFileSync(configPath, content, 'utf-8');
}

export function detectMonorepoScopes(projectPath: string): WorkspaceScope[] {
  const pnpmWorkspacePath = path.join(projectPath, 'pnpm-workspace.yaml');
  if (existsSync(pnpmWorkspacePath)) {
    const content = readFileSync(pnpmWorkspacePath, 'utf-8');
    const raw = parseYaml(content);
    if (raw && typeof raw === 'object' && Array.isArray(raw.packages)) {
      return resolveGlobPatterns(projectPath, raw.packages);
    }
  }

  const turboJsonPath = path.join(projectPath, 'turbo.json');
  if (existsSync(turboJsonPath)) {
    const pkgJsonPath = path.join(projectPath, 'package.json');
    if (existsSync(pkgJsonPath)) {
      const pkgContent = readFileSync(pkgJsonPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      if (Array.isArray(pkg.workspaces)) {
        return resolveGlobPatterns(projectPath, pkg.workspaces);
      }
      if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
        return resolveGlobPatterns(projectPath, pkg.workspaces.packages);
      }
    }
    return resolveGlobPatterns(projectPath, ['packages/*', 'apps/*']);
  }

  const lernaJsonPath = path.join(projectPath, 'lerna.json');
  if (existsSync(lernaJsonPath)) {
    const content = readFileSync(lernaJsonPath, 'utf-8');
    const raw = JSON.parse(content);
    if (raw && typeof raw === 'object' && Array.isArray(raw.packages)) {
      return resolveGlobPatterns(projectPath, raw.packages);
    }
    return resolveGlobPatterns(projectPath, ['packages/*']);
  }

  const pkgJsonPath = path.join(projectPath, 'package.json');
  if (existsSync(pkgJsonPath)) {
    const content = readFileSync(pkgJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    if (Array.isArray(pkg.workspaces)) {
      return resolveGlobPatterns(projectPath, pkg.workspaces);
    }
    if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
      return resolveGlobPatterns(projectPath, pkg.workspaces.packages);
    }
  }

  return [];
}

export function isWorkspace(projectPath: string): boolean {
  return existsSync(path.join(projectPath, 'openspec', 'workspace.yaml'));
}

function resolveGlobPatterns(projectPath: string, patterns: string[]): WorkspaceScope[] {
  const directories = fg.sync(patterns, {
    cwd: projectPath,
    onlyDirectories: true,
    absolute: false,
  });

  return directories
    .filter((dir) => existsSync(path.join(projectPath, dir, 'package.json')))
    .map((dir) => ({
      name: path.basename(dir),
      path: dir,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
