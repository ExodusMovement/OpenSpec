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
  getExploreSkillTemplate: '3b275814eaee966f16ef29c8a7836b74f25197371029e511c64f05a8144b54e6',
  getNewChangeSkillTemplate: '6172dc846c3b9ef8e84479d529120507e35ff166ca72bb90f53352b6fb27b29d',
  getContinueChangeSkillTemplate: 'f3ebf64b5b3de657ff26f4d39b4d598c78a4b79b596607e82504e5427db7bc53',
  getApplyChangeSkillTemplate: 'c273bacc5305a86f82d10a9f53aafe618302f69924dd8dadf98e789e28acbce7',
  getFfChangeSkillTemplate: '7e5b4d59e8a81375440a2113a091c9c28d43b3e5c09689c4feed219eea9572f6',
  getSyncSpecsSkillTemplate: '3cf7c4a4cb950a72aae3ba2278936ee0982b242437970629c0c4a2fb0eaa86be',
  getOnboardSkillTemplate: '819a2d117ad1386187975686839cb0584b41484013d0ca6a6691f7a439a11a4a',
  getOpsxExploreCommandTemplate: '4c17be93070eda03e19dad0bf1ac3b3e64b1713b0e3480e60e223854a5166624',
  getOpsxNewCommandTemplate: 'c979fb1ab9d4c3dc017d1c2d128ffcadf7cd08990d6e45f9bca8f8394d7a9422',
  getOpsxContinueCommandTemplate: 'cbe824f63c948e99d8605bb2c5667ccbf77c46ed91e7ae9ca38114f37acc5111',
  getOpsxApplyCommandTemplate: 'd3c37618ee8ea15a72ad785ae1b16d426d0e90f133f188e4d05a150adec082db',
  getOpsxFfCommandTemplate: '38a8c88ed76bd72910f43bc5906a10a789deca79a274813176e100bb98f249fc',
  getArchiveChangeSkillTemplate: 'a78d9d117d13963d1a46c715039fc99a9550b1a4279e56e25b770d19f49cc681',
  getBulkArchiveChangeSkillTemplate: '3041f96533bfe879989aeeae94e00af38f6a59c036cde998107e5189f2e24b25',
  getOpsxSyncCommandTemplate: '3ea3a79272a6a6cf64e96d8205525d661abb0f5ce4ab90f4a59ec1c07337d007',
  getVerifyChangeSkillTemplate: 'd4a7e4f6272ccbc2370ccc1e7cb8e3a4214b7842de084b9eb57feea5367b9579',
  getOpsxArchiveCommandTemplate: '1db7e81600fb84b6c230646174654e5b0df84c5dff063753c4ea7dfbff03ae63',
  getOpsxOnboardCommandTemplate: '10052d05a4e2cdade7fdfa549b3444f7a92f55a39bf81ddd6af7e0e9e83a7302',
  getOpsxBulkArchiveCommandTemplate: '7f07c5bae0dfdd953166c8e7e1314b09b0169243cf6cb9d2b60f329bc89a2aff',
  getOpsxVerifyCommandTemplate: '2461d0b2c0482bf8327283e51bc4199ad6e0e2d9adf377a9c3702e0922cb48a2',
  getOpsxProposeSkillTemplate: 'a7a51e805af9aaa39b826bf66e2c285d9e4a5707bfd59ec0c91514102db32e7a',
  getOpsxProposeCommandTemplate: '33ed01a09858cb4f10db3ac7a73bf940af5876db395726c2c1bcf06c8b2ccf7e',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '271899de3bd93d67b622f66cbaa71783da3c4591650b6a04cc4ed0acec2bccd5',
  'openspec-new-change': '1f0ecb83dc630bcaa1d264975ec408d07f6c67e43736bf233d4d8afe25548ab8',
  'openspec-continue-change': '0bbeec26d62e663c79766fe5afa8ab340422f5c73eed574bffb864c9d75012bc',
  'openspec-apply-change': 'a9fe0a7084b2657a3c7b29e180cc4de5e3e7f788cd355323747520037099e67a',
  'openspec-ff-change': 'b69d6292220d0d221311c4e37393a8e4a846000b6144b9120c5005204cd468f6',
  'openspec-sync-specs': 'd3659c8dcff15e10c7cffc7c5d78a40c2e831a52357aaf765f83a87512cc9481',
  'openspec-archive-change': '2ad5f19899b26da660973511695d2347cc5c2f711eb19fd4008299089cccdf3c',
  'openspec-bulk-archive-change': '906055c7130c7dc8d8ff774a791cb5b5aa22cfd9f1efcff465015d83fd06e8c3',
  'openspec-verify-change': '5b3b6bf1171928a8828c9c816d4ef9a3b7089921f87385691232d195e0e5fe57',
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
