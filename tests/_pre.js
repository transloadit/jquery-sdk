// # Setup
// #########################################################################
// const utils = require('utils')
const casper = require('casper').create({
  verbose: true,
  logLevel: 'warning',
  exitOnError: true,
  safeLogs: true,
  waitTimeout: 10000,
  viewportSize: {
    width: 1600,
    height: 1600
  }
})

const testhost = casper.cli.get('testhost')
const screenshot = casper.cli.get('failscreen')

casper.log(`Using testhost: ${testhost}`, 'info').log(`Using screenshot: ${screenshot}`, 'info')

if (!testhost || !screenshot || !/\.(png)$/i.test(screenshot)) {
  casper
    .echo('Usage: $ casperjs test project.js \\')
    .echo('          --ignore-ssl-errors=yes\\')
    .echo('          --testhost=<testhost>\\')
    .echo('          --failscreen=<screenshot-fail.png>')
    .exit(1)
}

// casper.userAgent("Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.204 Safari/534.16");

// Capture screens from all fails
casper.test.on('fail', failure => {
  casper.capture(screenshot)
  return casper.exit(1)
})

// Capture screens from timeouts from e.g. @waitUntilVisible
// Requires RC3 or higher.
casper.options.onWaitTimeout = function () {
  this.capture(screenshot)
  return this.exit(1)
}

casper.on('remote.message', function (msg) {
  return this.echo(`A browser console message: ${msg}`)
})

casper.on('page.error', function (msg, trace) {
  for (let step of Array.from(trace)) {
    console.log(`${step.file}:${step.line} ${step.function || '(anonymous)'}`)
  }

  return this.echo(`A browser error occured: ${msg}`)
})
// Uncomment this to make browser errors fatal
// @test.assert false, "A browser error occured: #{msg}"

// Scan for faults
casper.on('step.complete', function (page) {
  // Uncomment the following to save a screenshot at every step:
  const outfile = screenshot.replace('fail', new Date().getTime())
  this.capture(outfile)

  // Skip urls that are allowed to contain 'error'/'exception'/etc
  const u = casper.getCurrentUrl().replace(/https?:\/\//, '').replace(`${testhost}`, '')
  if (u === '/nonexistent') {
    return
  }

  return this.test.assertEval(
    () => !$('div.container').text().match(/(warning|error|exception|unable|could not)/i),
    `no errors texts in ${u}`
  )
})
