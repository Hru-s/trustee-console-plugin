import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'kubeadmin.json');

setup('authenticate as kubeadmin', async ({ page, baseURL }) => {
  const password = process.env.BRIDGE_KUBEADMIN_PASSWORD;
  if (!password) {
    throw new Error('BRIDGE_KUBEADMIN_PASSWORD is required');
  }

  const oauthBase = baseURL!
    .replace('console-openshift-console', 'oauth-openshift');
  const authURL =
    `${oauthBase}/oauth/authorize?client_id=console&redirect_uri=` +
    `${encodeURIComponent(baseURL + '/auth/callback')}&response_type=code`;

  await page.goto(authURL, { waitUntil: 'load' });

  const kubeLink = page.locator('a', { hasText: 'kube:admin' }).first();
  if (await kubeLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await kubeLink.click();
  }

  await page.fill('input[name="username"], #inputUsername', 'kube:admin');
  await page.fill('input[name="password"], #inputPassword', password);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 60_000,
  });

  await page.goto(baseURL!, { waitUntil: 'load' });

  await expect(async () => {
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(200);
  }).toPass({ timeout: 120_000, intervals: [2_000] });

  await page.context().storageState({ path: authFile });
});
