import { Page, expect } from '@playwright/test';

const REACT_ERROR_PATTERNS = [
  'Something wrong happened',
  'Minified React error',
  'error #130',
  'error #310',
];

export async function waitForConsoleReady(page: Page, timeout = 120_000) {
  await expect(async () => {
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(200);
    expect(body).toMatch(/Home|Sandboxes|Confidential|Trustee|Administrator/i);
  }).toPass({ timeout, intervals: [2_000] });
}

/**
 * Wait for specific plugin content to appear in the page body.
 * Retries every 3 seconds for up to `timeout` ms.
 */
export async function waitForContent(
  page: Page,
  patterns: RegExp | string[],
  timeout = 180_000,
) {
  await waitForConsoleReady(page, Math.min(timeout, 60_000));
  const regex =
    patterns instanceof RegExp
      ? patterns
      : new RegExp(patterns.join('|'), 'i');
  await expect(page.locator('body')).toContainText(regex, { timeout });
}

export async function assertNoReactErrors(page: Page) {
  const body = await page.locator('body').innerText();
  for (const pattern of REACT_ERROR_PATTERNS) {
    expect(body, `page should not contain "${pattern}"`).not.toContain(pattern);
  }
}

export async function expandNavSection(page: Page, sectionName: string) {
  const section = page.locator('nav button, nav a', {
    hasText: new RegExp(`^${sectionName}$`, 'i'),
  }).first();
  if (await section.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const expanded = await section.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await section.click();
      await page.waitForTimeout(500);
    }
  }
}
