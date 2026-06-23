import { APIRequestContext, expect, test } from '@playwright/test';

const apiURL = process.env.E2E_API_URL ?? 'http://127.0.0.1:18080/api/v1';
const userEmail = process.env.E2E_USER_EMAIL ?? 'admin@dotsolutions.cl';
const userPassword = process.env.E2E_USER_PASSWORD ?? 'Admin123!';

async function loginByAPI(request: APIRequestContext) {
  const response = await request.post(`${apiURL}/auth/login`, {
    data: {
      userEmail,
      password: userPassword,
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json() as { token: string; user: { id: string; userEmail: string } };
  expect(body.token).toBeTruthy();
  expect(body.user.userEmail).toBe(userEmail);
  return body.token;
}

test.describe('ERP smoke E2E', () => {
  test('API health, auth, companies and branding templates work end to end', async ({ request }) => {
    const health = await request.get(`${apiURL}/health`);
    expect(health.ok(), await health.text()).toBeTruthy();
    expect(await health.json()).toEqual({ status: 'ok' });

    const token = await loginByAPI(request);
    const authHeaders = { Authorization: `Bearer ${token}` };

    const companiesResponse = await request.get(`${apiURL}/companies`, { headers: authHeaders });
    expect(companiesResponse.ok(), await companiesResponse.text()).toBeTruthy();
    const companiesBody = await companiesResponse.json() as { companies: Array<{ id: string; companyName: string }> };
    expect(companiesBody.companies.length).toBeGreaterThan(0);

    const company = companiesBody.companies[0];
    const templatesResponse = await request.get(`${apiURL}/companies/${company.id}/branding/templates`, { headers: authHeaders });
    expect(templatesResponse.ok(), await templatesResponse.text()).toBeTruthy();
    const templatesBody = await templatesResponse.json() as { templates: Array<{ templateKey: string; subject: string; bodyHtml: string }> };
    expect(templatesBody.templates.some(template => template.templateKey === 'supplier_view')).toBeTruthy();
  });

  test('browser login reaches the authenticated app shell', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('user@dotsolutions.cl').fill(userEmail);
    await page.getByPlaceholder('********').fill(userPassword);
    await page.getByRole('button', { name: /Iniciar/i }).click();

    await expect(page.locator('#layout-container')).toBeVisible();
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.selected-company')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login$/);
  });
});
