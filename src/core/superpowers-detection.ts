import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SuperpowersDetectionResult {
  installed: boolean;
  installPath?: string;
}

interface InstalledPlugin {
  scope: string;
  installPath: string;
  version: string;
}

interface InstalledPluginsFile {
  version: number;
  plugins: Record<string, InstalledPlugin[]>;
}

function detectFromPluginsFile(pluginsFile: string): SuperpowersDetectionResult {
  let raw: string;
  try {
    raw = fs.readFileSync(pluginsFile, 'utf8');
  } catch {
    return { installed: false };
  }

  let parsed: InstalledPluginsFile;
  try {
    parsed = JSON.parse(raw) as InstalledPluginsFile;
  } catch {
    return { installed: false };
  }

  const key = Object.keys(parsed.plugins ?? {})
    .filter(k => k.startsWith('superpowers@'))
    .sort()[0];

  if (!key) return { installed: false };

  const entries = parsed.plugins[key];
  const entry = entries?.find(e => e.scope === 'user') ?? entries?.[0];

  if (!entry?.installPath) return { installed: false };

  return {
    installed: true,
    installPath: path.resolve(entry.installPath),
  };
}

function detectFromSkillsDir(skillsDir: string): SuperpowersDetectionResult {
  let entries: string[];
  try {
    entries = fs.readdirSync(skillsDir);
  } catch {
    return { installed: false };
  }

  const match = entries
    .filter(e => e.startsWith('superpowers:'))
    .sort()[0];

  if (!match) return { installed: false };

  return {
    installed: true,
    installPath: path.resolve(path.join(skillsDir, match)),
  };
}

function detectIn(claudeDir: string): SuperpowersDetectionResult {
  const fromPlugins = detectFromPluginsFile(path.join(claudeDir, 'plugins', 'installed_plugins.json'));
  if (fromPlugins.installed) return fromPlugins;

  return detectFromSkillsDir(path.join(claudeDir, 'skills'));
}

/**
 * Detects whether Superpowers is installed.
 *
 * Checks in order:
 * 1. Project-local <projectPath>/.claude/ (plugins then skills)
 * 2. Global ~/.claude/ (plugins then skills)
 *
 * @param homeDir - Override for home directory (used in tests)
 * @param projectPath - Project root to check for project-local install
 */
export function detectSuperpowers(homeDir?: string, projectPath?: string): SuperpowersDetectionResult {
  const home = homeDir ?? os.homedir();

  if (projectPath) {
    const fromProject = detectIn(path.join(projectPath, '.claude'));
    if (fromProject.installed) return fromProject;
  }

  return detectIn(path.join(home, '.claude'));
}

/**
 * Returns true only when all three conditions hold:
 * - Superpowers is installed
 * - The Claude tool is among the selected tools
 * - The user has not opted out
 */
export function shouldEnhanceWithSuperpowers(
  selectedToolIds: string[],
  detection: SuperpowersDetectionResult,
  optOut: boolean
): boolean {
  return detection.installed && selectedToolIds.includes('claude') && !optOut;
}
