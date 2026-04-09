import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SuperpowersDetectionResult {
  installed: boolean;
  installPath?: string;
}

/**
 * Detects whether Superpowers is installed by scanning ~/.claude/skills/
 * for directories prefixed with "superpowers:".
 *
 * @param homeDir - Override for home directory (used in tests)
 */
export function detectSuperpowers(homeDir?: string): SuperpowersDetectionResult {
  const skillsDir = path.join(homeDir ?? os.homedir(), '.claude', 'skills');

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
