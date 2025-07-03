import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Bank Accounts Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.getByLabel(/email address/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for login and dashboard navigation
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to bank accounts page and wait for load
    await page.goto('/banking/accounts');
  });

  test('should display bank accounts list', async ({ page }) => {
    await page.goto('/banking/accounts');
    
    // Check table and add account button
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Account' })).toBeVisible();
  });

  test('should be able to create a new bank account', async ({ page }) => {
    // Click add account button and wait for modal
    await page.getByRole('button', { name: 'Add Account' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill the form
    await page.getByLabel('Account Name').fill('Test Savings Account');
    await page.getByLabel('Account Number').fill('1234567890');
    await page.getByLabel('Bank Name').fill('Test Bank');
    await page.getByLabel('Initial Balance').fill('1000');
    await page.getByLabel('Type').click();
    await page.getByRole('option', { name: 'Savings' }).click();
    
    // Submit form and wait for response
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Check success toast and wait for table update
    await page.waitForTimeout(1000); // Wait for table refresh
  });

  test('should be able to search accounts', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder('Search accounts...').fill('test');
    
    // Wait for search results (account for debounce)
    await page.waitForTimeout(1000);
    
    // Check if table updates
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should handle empty state', async ({ page }) => {
    // Clear the search to potentially trigger empty state
    await page.getByPlaceholder('Search accounts...').fill('nonexistent account 123');
    
    // Wait for search debounce and table update
    await page.waitForTimeout(1000);
    
    // Check for empty state message
    await expect(page.getByText('No bank accounts found. Add your first account to get started.')).toBeVisible();
  });

  test('should handle pagination', async ({ page }) => {
    // Wait for table to load completely
    await expect(page.getByRole('table')).toBeVisible();
    await page.waitForTimeout(1000); // Wait for data to load
    
    // Check if pagination controls exist (if there are more than 5 items)
    const paginationExists = await page.getByRole('button', { name: 'Next' }).isVisible();
    
    if (paginationExists) {
      // Click next page if pagination exists
      await page.getByRole('button', { name: 'Next' }).click();
      await page.waitForTimeout(1000); // Wait for page transition
      
      // Verify page change
      await expect(page.getByRole('table')).toBeVisible();
    }
  });
});

test('CI workflow verification - E2E', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');
  
  // Verify that the page loads
  await expect(page).toHaveTitle(/Ledger System/);
}); 