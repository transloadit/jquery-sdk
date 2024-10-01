/* eslint-disable max-len,quote-props */
// @ts-check
import { expect, test } from '@playwright/test'
// import os from 'os'
import readline from 'readline'

const BASE_URL = `http://localhost:3000`

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pause() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question('Hanging for debugging purposes, press any key to exit ', (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

// // Snapshots looked a little different on Linux than on Mac, so we're allowing a higher maxDiffPixelRatio on Linux, bumping it to 0.04
// // In addition, we're having issues with font rendering with playwright headless chromium on Linux now, so we bumped it up to 0.12
// // @TODO It would be great to at least go down again to 0.04, but I think instead of bumping our heads against the wall, we can just
// // wait until upgrades of playwright, chromium, ubuntu, solve this for us.
// const DEFAULT_MAX_DIFF_PIXEL_RATIO = os.platform() === 'darwin' ? 0.0 : 0.12

test.describe('e2e', async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  test.beforeEach(async ({ page }, testInfo) => {
    // Remove -darwin or -linux suffix from the screenshots so there is no conflict between local & CI tests.
    // There is inherent difference between the architectures today which we're working around with a higher maxDiffPixelRatio.
    // Clearly not ideal, as is working around with it by writing fixtures with Docker.
    // Hopefully something better will evolve:
    // https://github.com/microsoft/playwright/issues/7575
    //
    // eslint-disable-next-line no-param-reassign
    testInfo.snapshotSuffix = ''

    // Bubble up all page console messages
    page.on('console', (message) => {
      const type = message.type()
      const text = message.text()
      const location = message.location()

      // Log all console messages, regardless of type
      console.log(`Browser Console [${type}]: ${text}`)

      // For error messages, log additional details
      if (type === 'error') {
        console.error({
          text: text,
          type: `console.${type}`,
          ...location,
        })
      }
    })

    page.on('pageerror', (exception) => {
      console.error({
        name: exception.name,
        text: exception.message,
        type: `exception`,
        stack: exception.stack,
      })
      throw new Error(`Above pageerror Happened`)
    })
  })

  test('simple image resize', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/`)
      console.log('Navigated to the page')

      // Check if jQuery and Transloadit SDK are loaded
      const sdkLoaded = await page.evaluate(() => {
        console.log('Checking SDK loading status')
        return (
          typeof jQuery !== 'undefined' &&
          typeof jQuery.fn.transloadit !== 'undefined' &&
          jQuery('#entryForm').data('transloadit.uploader') !== undefined
        )
      })

      console.log('SDK loaded status:', sdkLoaded)
      expect(sdkLoaded).toBe(true, 'jQuery Transloadit SDK is not loaded or initialized')

      const fixturePath = await page.textContent('#fixture_path')
      await page.fill('[name="width_field"]', `400`)
      await page.fill('[name="height_field"]', `400`)
      await page.setInputFiles('#file', `${fixturePath}/1.jpg`)
      await page.click('[type="submit"]')
      await delay(5000)
      await page.waitForSelector('body')
      const locator = page.locator('body')
      await expect(locator).toContainText('ASSEMBLY_COMPLETED')
    } catch (err) {
      console.error('Test error:', err)
      if (process.env.CI) {
        throw err
      }
      await pause()
      throw err
    }
  })

  test('trigger upload on file selection', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/trigger-on-file-select`)
      console.log('Navigated to the trigger-on-file-select page')

      // Check if jQuery and Transloadit SDK are loaded
      const sdkLoaded = await page.evaluate(() => {
        console.log('Checking SDK loading status')
        return (
          typeof jQuery !== 'undefined' &&
          typeof jQuery.fn.transloadit !== 'undefined' &&
          jQuery('#entryForm').data('transloadit.uploader') !== undefined
        )
      })

      console.log('SDK loaded status:', sdkLoaded)
      expect(sdkLoaded).toBe(true, 'jQuery Transloadit SDK is not loaded or initialized')

      const fixturePath = await page.textContent('#fixture_path')
      await page.setInputFiles('#file', `${fixturePath}/1.jpg`)
      // await page.click('[type="submit"]')
      await delay(5000)
      await page.waitForSelector('body')
      const locator = page.locator('body')
      await expect(locator).toContainText('ASSEMBLY_COMPLETED')
    } catch (err) {
      console.error('Test error:', err)
      if (process.env.CI) {
        throw err
      }
      await pause()
      throw err
    }
  })
})
