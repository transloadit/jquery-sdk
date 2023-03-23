/**
 * @type { import('@playwright/test').PlaywrightTestConfig }
 */
const config = {
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0,
  use: {
    // trace     : 'on',
    screenshot: 'only-on-failure', // Capture screenshot after each test failure.
    video: 'retain-on-failure', // Record videos for all tests, and only keep videos of tests that failed.
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    // Don't rebuild in CI because we already have a build ready in _site
    command: `yarn test:server`,
    url: 'http://localhost:3000/',
    timeout: 5 * 60 * 1000,
    reuseExistingServer: !process.env.CI,
    ignoreHTTPSErrors: true,
  },
}

module.exports = config
