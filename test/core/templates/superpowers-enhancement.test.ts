import { describe, it, expect } from 'vitest';
import { getApplyChangeSkillTemplate } from '../../../src/core/templates/workflows/apply-change.js';
import { getVerifyChangeSkillTemplate } from '../../../src/core/templates/workflows/verify-change.js';
import { getArchiveChangeSkillTemplate } from '../../../src/core/templates/workflows/archive-change.js';
import { getExploreSkillTemplate } from '../../../src/core/templates/workflows/explore.js';

const SUPERPOWERS_MARKER = '<!-- openspec-superpowers-enhanced: true -->';

describe('Superpowers-enhanced skill templates', () => {
  describe('apply-change', () => {
    it('contains Superpowers marker when superpowers=true', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain(SUPERPOWERS_MARKER);
    });

    it('does NOT contain Superpowers marker when superpowers=false', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: false });
      expect(instructions).not.toContain(SUPERPOWERS_MARKER);
    });

    it('does NOT contain Superpowers marker when ctx is absent', () => {
      const { instructions } = getApplyChangeSkillTemplate();
      expect(instructions).not.toContain(SUPERPOWERS_MARKER);
    });

    it('contains TDD instruction when superpowers=true', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain('superpowers:test-driven-development');
    });

    it('does NOT contain TDD instruction when superpowers=false', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: false });
      expect(instructions).not.toContain('superpowers:test-driven-development');
    });

    it('contains systematic-debugging instruction when superpowers=true', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain('superpowers:systematic-debugging');
    });

    it('does NOT contain systematic-debugging when superpowers=false', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: false });
      expect(instructions).not.toContain('superpowers:systematic-debugging');
    });

    it('contains requesting-code-review gate when superpowers=true', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain('superpowers:requesting-code-review');
    });

    it('contains receiving-code-review when superpowers=true', () => {
      const { instructions } = getApplyChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain('superpowers:receiving-code-review');
    });

    it('base content is preserved when superpowers=true', () => {
      const base = getApplyChangeSkillTemplate();
      const enhanced = getApplyChangeSkillTemplate({ superpowers: true });
      expect(enhanced.instructions).toContain('openspec list --json');
      expect(enhanced.name).toBe(base.name);
      expect(enhanced.description).toBe(base.description);
    });
  });

  describe('verify-change', () => {
    it('contains Superpowers marker when superpowers=true', () => {
      const { instructions } = getVerifyChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain(SUPERPOWERS_MARKER);
    });

    it('contains verification-before-completion when superpowers=true', () => {
      const { instructions } = getVerifyChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain('superpowers:verification-before-completion');
    });

    it('does NOT contain verification-before-completion when superpowers=false', () => {
      const { instructions } = getVerifyChangeSkillTemplate({ superpowers: false });
      expect(instructions).not.toContain('superpowers:verification-before-completion');
    });

    it('always contains ci-investigation regardless of superpowers flag', () => {
      const withSP = getVerifyChangeSkillTemplate({ superpowers: true });
      const withoutSP = getVerifyChangeSkillTemplate({ superpowers: false });
      const noCtx = getVerifyChangeSkillTemplate();
      expect(withSP.instructions).toContain('ci-investigation');
      expect(withoutSP.instructions).toContain('ci-investigation');
      expect(noCtx.instructions).toContain('ci-investigation');
    });
  });

  describe('archive-change', () => {
    it('contains Superpowers marker when superpowers=true', () => {
      const { instructions } = getArchiveChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain(SUPERPOWERS_MARKER);
    });

    it('contains finishing-a-development-branch when superpowers=true', () => {
      const { instructions } = getArchiveChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain('superpowers:finishing-a-development-branch');
    });

    it('does NOT contain finishing-a-development-branch when superpowers=false', () => {
      const { instructions } = getArchiveChangeSkillTemplate({ superpowers: false });
      expect(instructions).not.toContain('superpowers:finishing-a-development-branch');
    });

    it('contains github-cli PR creation guidance when superpowers=true', () => {
      const { instructions } = getArchiveChangeSkillTemplate({ superpowers: true });
      expect(instructions).toContain('github-cli');
    });
  });

  describe('explore', () => {
    it('contains Superpowers marker when superpowers=true', () => {
      const { instructions } = getExploreSkillTemplate({ superpowers: true });
      expect(instructions).toContain(SUPERPOWERS_MARKER);
    });

    it('contains systematic-debugging section when superpowers=true', () => {
      const { instructions } = getExploreSkillTemplate({ superpowers: true });
      expect(instructions).toContain('superpowers:systematic-debugging');
    });

    it('does NOT contain systematic-debugging when superpowers=false', () => {
      const { instructions } = getExploreSkillTemplate({ superpowers: false });
      expect(instructions).not.toContain('superpowers:systematic-debugging');
    });
  });
});
