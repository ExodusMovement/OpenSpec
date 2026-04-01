import { describe, it, expect } from 'vitest';
import { transformToHyphenCommands, createCliTransformer } from '../../src/utils/command-references.js';

describe('transformToHyphenCommands', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/opsx:new')).toBe('/opsx-new');
    });

    it('should transform multiple command references', () => {
      const input = '/opsx:new and /opsx:apply';
      const expected = '/opsx-new and /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /opsx:apply to implement tasks';
      const expected = 'Use /opsx-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:continue` to proceed';
      const expected = 'Run `/opsx-continue` to proceed';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged text with no command references', () => {
      const input = 'This is plain text without commands';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should return empty string unchanged', () => {
      expect(transformToHyphenCommands('')).toBe('');
    });

    it('should not transform similar but non-matching patterns', () => {
      const input = '/ops:new opsx: /other:command';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should handle multiple occurrences on same line', () => {
      const input = '/opsx:new /opsx:continue /opsx:apply';
      const expected = '/opsx-new /opsx-continue /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /opsx:new to start
Then /opsx:continue to proceed
Finally /opsx:apply to implement`;
      const expected = `Use /opsx-new to start
Then /opsx-continue to proceed
Finally /opsx-apply to implement`;
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('all known commands', () => {
    const commands = [
      'new',
      'continue',
      'apply',
      'ff',
      'sync',
      'archive',
      'bulk-archive',
      'verify',
      'explore',
      'onboard',
    ];

    for (const cmd of commands) {
      it(`should transform /opsx:${cmd}`, () => {
        expect(transformToHyphenCommands(`/opsx:${cmd}`)).toBe(`/opsx-${cmd}`);
      });
    }
  });
});

describe('createCliTransformer', () => {
  it('returns undefined when cli is undefined', () => {
    expect(createCliTransformer(undefined)).toBeUndefined();
  });

  it('returns undefined when cli is empty string', () => {
    expect(createCliTransformer('')).toBeUndefined();
  });

  describe('backtick-quoted invocations', () => {
    it('replaces `openspec <cmd>`', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      expect(t('`openspec list --json`')).toBe('`pnpm exec openspec list --json`');
    });

    it('replaces multiple backtick-quoted invocations', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      const input = 'Run `openspec list --json` then `openspec status --change "x" --json`';
      expect(t(input)).toBe('Run `pnpm exec openspec list --json` then `pnpm exec openspec status --change "x" --json`');
    });
  });

  describe('&& subshell invocations', () => {
    it('replaces (cd <path> && openspec <cmd>)', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      expect(t('(cd apps/frontend && openspec status --change "x" --json)')).toBe(
        '(cd apps/frontend && pnpm exec openspec status --change "x" --json)',
      );
    });
  });

  describe('line-start invocations', () => {
    it('replaces openspec at the start of a line', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      expect(t('openspec list --json')).toBe('pnpm exec openspec list --json');
    });

    it('replaces indented openspec in a fenced code block', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      expect(t('   openspec status --change "x" --json')).toBe('   pnpm exec openspec status --change "x" --json');
    });

    it('replaces deeply indented openspec', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      expect(t('        openspec instructions apply --change "x" --json')).toBe(
        '        pnpm exec openspec instructions apply --change "x" --json',
      );
    });

    it('replaces openspec at start of each line in multiline text', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      const input = `   openspec status --change "x" --json\n     openspec instructions apply --change "x" --json`;
      const expected = `   pnpm exec openspec status --change "x" --json\n     pnpm exec openspec instructions apply --change "x" --json`;
      expect(t(input)).toBe(expected);
    });

    it('replaces openspec at line start inside a fenced code block', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      const input = '```bash\nopenspec list --json\n```';
      expect(t(input)).toBe('```bash\npnpm exec openspec list --json\n```');
    });
  });

  describe('path references are preserved', () => {
    it('does not replace openspec/ path references', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      expect(t('openspec/changes/my-change/')).toBe('openspec/changes/my-change/');
    });

    it('does not replace openspec/ in prose mid-line', () => {
      const t = createCliTransformer('pnpm exec openspec')!;
      expect(t('See openspec/changes/ for details')).toBe('See openspec/changes/ for details');
    });
  });

  describe('npx variant', () => {
    it('works with npx @exodus/openspec', () => {
      const t = createCliTransformer('npx @exodus/openspec')!;
      expect(t('`openspec list --json`')).toBe('`npx @exodus/openspec list --json`');
      expect(t('openspec status --change "x"')).toBe('npx @exodus/openspec status --change "x"');
    });
  });
});
