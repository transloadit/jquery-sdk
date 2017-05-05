const numberOfPlannedTests = 7
casper.test.begin('test-xss', numberOfPlannedTests, (test) => {
  casper.start(`http://${testhost}`, function () {
  })

  casper.then(function () {
    const curr = this.getCurrentUrl()

    const fixturePath = this.fetchText('#fixture_path')

    this.fill('#entryForm', {
      my_file     : `${fixturePath}/><img src=x onerror=document.write((1338-1));>.png`,
      width_field : '400',
      height_field: '400',
    })

    this.evaluate(() => $('#entryForm').submit())

    this.waitFor(function () {
      return curr !== this.getCurrentUrl()
    })
  })

  casper.then(function () {
    this.test.assertTextDoesntExist('1337')
    this.test.assertTextExists('{\\"width\\":400')
    this.test.assertTextExists('\\"height\\":400')
  })

  casper.run(function () {
    this.test.done()
  })
})
