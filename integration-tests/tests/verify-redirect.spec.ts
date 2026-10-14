import { test, expect } from '@playwright/test';
import { navigateTo, assertNoReactErrors, waitForContent } from './helpers.js';
import { findKataCcPod } from './cluster.js';

/**
 * Manual matrix C-35: /trustee/verify/:ns/:name redirects to overview query params.
 */
test.describe('C-35 Verify attestation redirect', () => {
  test('legacy verify URL redirects to /trustee?namespace=&name=', async ({
    page,
    baseURL,
  }) => {
    const pod = findKataCcPod();
    const ns = pod?.ns ?? 'default';
    const name = pod?.name ?? 'example-kata-cc-pod';

    await navigateTo(page, baseURL!, `/trustee/verify/${ns}/${name}`);
    await page.waitForURL(
      (u) =>
        u.pathname.includes('/trustee') &&
        !u.pathname.includes('/trustee/verify/'),
      { timeout: 60_000 },
    );
    const url = page.url();
    expect(url).toMatch(/[?&]namespace=/);
    expect(url).toMatch(/[?&]name=/);
    await waitForContent(page, /attestation|trustee|confidential|workload|reference/i, 120_000);
    await assertNoReactErrors(page);
  });
});
