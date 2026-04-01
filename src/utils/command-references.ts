/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/opsx:` patterns to `/opsx-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/opsx:new') // returns '/opsx-new'
 * transformToHyphenCommands('Use /opsx:apply to implement') // returns 'Use /opsx-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/opsx:/g, '/opsx-');
}

/**
 * Creates a transformer that replaces bare `openspec` CLI invocations with a custom command.
 * Only replaces command invocations (backtick-quoted, after `&&`, or at line start),
 * not path references like `openspec/changes/`.
 *
 * @param cli - The CLI command to use instead of bare `openspec`
 * @returns Transformer function, or undefined if cli is not set
 *
 * @example
 * const t = createCliTransformer('pnpm exec openspec');
 * t('`openspec list --json`')        // '`pnpm exec openspec list --json`'
 * t('openspec status --change "x"')  // 'pnpm exec openspec status --change "x"' (line-start)
 * t('openspec/changes/foo')          // 'openspec/changes/foo' (path unchanged)
 */
export function createCliTransformer(cli: string | undefined): ((text: string) => string) | undefined {
  if (!cli) return undefined;
  return (text: string) =>
    text
      .replace(/`openspec\s/g, `\`${cli} `)
      .replace(/&& openspec\s/g, `&& ${cli} `)
      .replace(/^(\s*)openspec\s/gm, `$1${cli} `);
}
