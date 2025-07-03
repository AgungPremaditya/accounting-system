import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

test.describe('Transactions Flow', () => {
  test.beforeEach(async ({ page }) => {
    dotenv.config();

    // Login first
    await page.goto('/auth/login');
    await page.getByLabel(/email address/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for login to complete and redirect
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to transactions page
    await page.goto('/banking/transactions');
  });

  test('should display transactions list', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Transaction' })).toBeVisible();
  });

  test('should be able to search transactions', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder('Search transactions...').fill('test');
    
    // Wait for search results (account for debounce)
    await page.waitForTimeout(500);
    
    // Check if table updates
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should be able to create a new transaction', async ({ page }) => {
    // Click create transaction button
    await page.getByRole('button', { name: 'Add Transaction' }).click();
    
    // Search for receiver account
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Search Receiver Account' })).toBeVisible();
    await page.getByLabel('Receiver Account Number').fill(process.env.TEST_RECEIVER_ACCOUNT || '1234567890');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Wait for table to refresh
    await page.waitForTimeout(1000);
  });

  test('should handle empty state', async ({ page }) => {
    // Search for non-existent transaction
    await page.getByPlaceholder('Search transactions...').fill('nonexistent transaction 123');
    
    // Wait for search debounce
    await page.waitForTimeout(500);
    
    // Check for empty state message
    await expect(page.getByText('No transactions found.')).toBeVisible();
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