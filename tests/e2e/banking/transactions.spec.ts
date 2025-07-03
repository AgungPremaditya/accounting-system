import { test, expect } from '@playwright/test';

test.describe('Transactions Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Navigate to transactions page
    await page.goto('/banking/transactions');
  });

  test('should display transactions list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should be able to create a new transaction', async ({ page }) => {
    // Click create transaction button
    await page.getByRole('button', { name: /create transaction/i }).click();
    
    // Fill transaction form
    await page.getByLabel(/amount/i).fill('100');
    await page.getByLabel(/description/i).fill('Test Transaction');
    await page.getByLabel(/type/i).selectOption('EXPENSE');
    
    // Submit form
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify transaction was created
    await expect(page.getByText('Test Transaction')).toBeVisible();
    await expect(page.getByText('100')).toBeVisible();
  });

  test('should be able to view transaction details', async ({ page }) => {
    // Click on first transaction
    await page.getByRole('row').nth(1).click();
    
    // Verify details modal is shown
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /transaction details/i })).toBeVisible();
  });
}); 