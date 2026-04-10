import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '8173d32c3850d8a434106f7b684b2ff47593fdac376f98744f9b1fcf90257fa0',
  getNewChangeSkillTemplate: '6172dc846c3b9ef8e84479d529120507e35ff166ca72bb90f53352b6fb27b29d',
  getContinueChangeSkillTemplate: '809b12a8c1d7d827e84b7e3b7a1a9d9773fbb0cca04f74fe28087ad425435712',
  getApplyChangeSkillTemplate: 'ada6df92b1bab8435f54ae04698012e73cd88d6ab13e24d34732334c4da37800',
  getFfChangeSkillTemplate: '7e5b4d59e8a81375440a2113a091c9c28d43b3e5c09689c4feed219eea9572f6',
  getSyncSpecsSkillTemplate: '371c1046480f0ab290e8828e8003b8756cda06491f7355b0a3d76c22486997aa',
  getOnboardSkillTemplate: '819a2d117ad1386187975686839cb0584b41484013d0ca6a6691f7a439a11a4a',
  getOpsxExploreCommandTemplate: '9964a0c57a78203bf82496665b1b91276307c2bd6c64f6fefb812878bb675b66',
  getOpsxNewCommandTemplate: 'c979fb1ab9d4c3dc017d1c2d128ffcadf7cd08990d6e45f9bca8f8394d7a9422',
  getOpsxContinueCommandTemplate: 'd3b0c0421b4d65711ec526b88925c7164a63b35f86f88045bc3aac8957bbc333',
  getOpsxApplyCommandTemplate: '5a20646169c10284089b03b105e4b89ddfa2afa268fb6ac14d3ea647b005e524',
  getOpsxFfCommandTemplate: '38a8c88ed76bd72910f43bc5906a10a789deca79a274813176e100bb98f249fc',
  getArchiveChangeSkillTemplate: 'f9ea06f062104ffbf630cc472e2c136bb80fff8fa6cc55c21ca245e8f4d2df46',
  getBulkArchiveChangeSkillTemplate: '216ddaa7fc619c1100922c738d2508cf0cc2b82b4c39c81af1a568a039c7909c',
  getOpsxSyncCommandTemplate: '2bc34e12bfb9513a10f9f57e56d623151a6087ac87249bcd8c9d423e90dac345',
  getVerifyChangeSkillTemplate: '6d6ed04e8a5d3cfe3e85c307d04ce5df158abf00a33e2a33e5ea3a820fdfa223',
  getOpsxArchiveCommandTemplate: '8339de707471add0ad21bd17e76176b0aaef0a82d0f2956e79b09ec61be425eb',
  getOpsxOnboardCommandTemplate: '10052d05a4e2cdade7fdfa549b3444f7a92f55a39bf81ddd6af7e0e9e83a7302',
  getOpsxBulkArchiveCommandTemplate: '1cdd42b1efe082dbf2112842df2d9726671b1c2a08a46bde2856f67d50a8019b',
  getOpsxVerifyCommandTemplate: 'a81ff30bac0b07cc246e9a3b36644147895bd02fae093794c797eede592927c6',
  getOpsxProposeSkillTemplate: 'a7a51e805af9aaa39b826bf66e2c285d9e4a5707bfd59ec0c91514102db32e7a',
  getOpsxProposeCommandTemplate: '33ed01a09858cb4f10db3ac7a73bf940af5876db395726c2c1bcf06c8b2ccf7e',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'aa3b0ae8cc340aab0b7a6c0cdf6dd6a0f58d00d34508c0ab070e138f0e6dd805',
  'openspec-new-change': '1f0ecb83dc630bcaa1d264975ec408d07f6c67e43736bf233d4d8afe25548ab8',
  'openspec-continue-change': 'ee1fd5c7b4de20bcd9904d4b8c6520d43b549400037e90806268a024daab166b',
  'openspec-apply-change': '9040ff29f9ad22096e82aed5077c8ad049d55ae73fd32784f65826d3bea98bab',
  'openspec-ff-change': 'b69d6292220d0d221311c4e37393a8e4a846000b6144b9120c5005204cd468f6',
  'openspec-sync-specs': 'c2ec9b343195c1c5e9118df326df60f82549740160d386bad215576d124487cc',
  'openspec-archive-change': 'e973b7bf22b896586d85b4dadec3689a8aaa0e5ddfd71c8b38ec60d5af836853',
  'openspec-bulk-archive-change': 'bf8d7b18e6ca4932d548813424418dd67a1210f1876bde468a15fbac125f6e56',
  'openspec-verify-change': 'e459f6d59085a145a31cd579671a37113d18d7e9046cc57842e312d9800e8629',
  'openspec-onboard': 'dbce376cf895f3fe4f63b4bce66d258c35b7b8884ac746670e5e35fabcefd255',
  'openspec-propose': '997ecfae52a1147193f8b32fee4968a6da1ae635c17c8d98f405884ecc494f60',
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('skill templates split parity', () => {
  it('preserves all template function payloads exactly', () => {
    const functionFactories: Record<string, () => unknown> = {
      getExploreSkillTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxExploreCommandTemplate,
      getOpsxNewCommandTemplate,
      getOpsxContinueCommandTemplate,
      getOpsxApplyCommandTemplate,
      getOpsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getOpsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxOnboardCommandTemplate,
      getOpsxBulkArchiveCommandTemplate,
      getOpsxVerifyCommandTemplate,
      getOpsxProposeSkillTemplate,
      getOpsxProposeCommandTemplate,
      getFeedbackSkillTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    // Intentionally excludes getFeedbackSkillTemplate: skillFactories only models templates
    // deployed via generateSkillContent, while feedback is covered in function payload parity.
    const skillFactories: Array<[string, () => SkillTemplate]> = [
      ['openspec-explore', getExploreSkillTemplate],
      ['openspec-new-change', getNewChangeSkillTemplate],
      ['openspec-continue-change', getContinueChangeSkillTemplate],
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-ff-change', getFfChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
      ['openspec-onboard', getOnboardSkillTemplate],
      ['openspec-propose', getOpsxProposeSkillTemplate],
    ];

    const actualHashes = Object.fromEntries(
      skillFactories.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });
});
