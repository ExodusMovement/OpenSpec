import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { stringify, parse } from 'yaml';

const META_FILE = '.openspec-meta.yaml';

export interface SuperpowersMeta {
  superpowers: {
    enhanced: boolean;
    configPatched: boolean;
    installPath: string;
    detectedAt: string;
  };
}

export interface WriteMetaOptions {
  installPath: string;
  configPatched: boolean;
}

export async function writeSuperpowersMeta(projectPath: string, options: WriteMetaOptions): Promise<void> {
  const meta: SuperpowersMeta = {
    superpowers: {
      enhanced: true,
      configPatched: options.configPatched,
      installPath: options.installPath,
      detectedAt: new Date().toISOString(),
    },
  };
  const content = stringify(meta);
  await writeFile(join(projectPath, META_FILE), content, 'utf8');
}

export async function readSuperpowersMeta(projectPath: string): Promise<SuperpowersMeta | null> {
  try {
    const content = await readFile(join(projectPath, META_FILE), 'utf8');
    return parse(content) as SuperpowersMeta;
  } catch {
    return null;
  }
}
