import { classifyKbsUrl, detectClusterTee, detectNodeXfam, teeTypeForNode } from './topology';
import { SNP_NODE_LABEL, TDX_NODE_LABEL } from '../k8s/resources';
import type { NodeKind } from '../k8s/types';

const node = (labels: Record<string, string>): NodeKind => ({ metadata: { labels } });

describe('teeTypeForNode', () => {
  it('reads the TDX NFD label', () => {
    expect(teeTypeForNode(node({ [TDX_NODE_LABEL]: 'true' }))).toBe('tdx');
  });

  it('reads the SNP NFD label', () => {
    expect(teeTypeForNode(node({ [SNP_NODE_LABEL]: 'true' }))).toBe('snp');
  });

  it('returns none for an unlabeled node', () => {
    expect(teeTypeForNode(node({}))).toBe('none');
    expect(teeTypeForNode(undefined)).toBe('none');
  });
});

describe('detectClusterTee', () => {
  it('returns null when no node carries a TEE label', () => {
    expect(detectClusterTee([node({}), node({ foo: 'bar' })])).toBeNull();
    expect(detectClusterTee([])).toBeNull();
  });

  it('detects TDX from a labeled node among unlabeled ones', () => {
    expect(detectClusterTee([node({}), node({ [TDX_NODE_LABEL]: 'true' })])).toBe('tdx');
  });

  it('detects SNP', () => {
    expect(detectClusterTee([node({ [SNP_NODE_LABEL]: 'true' })])).toBe('snp');
  });

  it('returns the first TEE found when scanning', () => {
    const tdxFirst = [node({ [TDX_NODE_LABEL]: 'true' }), node({ [SNP_NODE_LABEL]: 'true' })];
    expect(detectClusterTee(tdxFirst)).toBe('tdx');
  });
});

describe('detectNodeXfam', () => {
  const cpuid = (flags: string[]): Record<string, string> =>
    Object.fromEntries(flags.map((f) => [`feature.node.kubernetes.io/cpu-cpuid.${f}`, 'true']));

  it('returns undefined when no node publishes cpuid labels', () => {
    expect(detectNodeXfam([node({}), node({ [TDX_NODE_LABEL]: 'true' })])).toBeUndefined();
    expect(detectNodeXfam([])).toBeUndefined();
  });

  it('reproduces the live virtlab2410 label set (Sapphire Rapids TDX node)', () => {
    // The exact spelling NFD publishes on the live node (live-verified
    // 2026-11-12): no underscores, no PKU/OSPKE label at all — although the
    // hardware's /proc/cpuinfo has pku/ospke and the TDX-measured XFAM
    // (e702060000000000) includes pkru.
    expect(
      detectNodeXfam([node(cpuid(['AVX', 'AVX2', 'AVX512F', 'AMXTILE', 'AMXINT8', 'AMXBF16']))]),
    ).toBe('x87,sse,avx,avx512,pkru,amx');
  });

  it('infers pkru from AVX512F when NFD omits the PKU/OSPKE label', () => {
    // Every TDX-capable platform with AVX-512 also carries PKU in XCR0.
    expect(detectNodeXfam([node(cpuid(['AVX512F']))])).toBe('x87,sse,avx,avx512,pkru');
    // An explicit label is honored even without AVX-512.
    expect(detectNodeXfam([node(cpuid(['OSPKE']))])).toBe('x87,sse,avx,pkru');
    expect(detectNodeXfam([node(cpuid(['PKU']))])).toBe('x87,sse,avx,pkru');
  });

  it('accepts both AMX spellings — NFD strips underscores, /proc/cpuinfo keeps them', () => {
    expect(detectNodeXfam([node(cpuid(['AMXTILE']))])).toBe('x87,sse,avx,amx');
    expect(detectNodeXfam([node(cpuid(['AMX_TILE']))])).toBe('x87,sse,avx,amx');
    expect(detectNodeXfam([node(cpuid(['AMX_BF16']))])).toBe('x87,sse,avx,amx');
  });

  it('keeps the baseline when the node lacks AVX-512/PKU/AMX flags', () => {
    expect(detectNodeXfam([node(cpuid(['SSE2', 'AVX']))])).toBe('x87,sse,avx');
  });

  it('skips nodes without cpuid labels and uses the first node that has them', () => {
    const nodes = [node({}), node(cpuid(['AVX512F'])), node(cpuid([]))];
    expect(detectNodeXfam(nodes)).toBe('x87,sse,avx,avx512,pkru');
  });
});

describe('classifyKbsUrl', () => {
  it('classifies the in-cluster Service host as local', () => {
    expect(classifyKbsUrl('http://kbs-service.ns.svc:8080', 'kbs-service').target).toBe('local');
  });

  it('classifies an external Route host as remote', () => {
    expect(classifyKbsUrl('https://kbs.apps.example.com', 'kbs-service').target).toBe('remote');
  });
});
