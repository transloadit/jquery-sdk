const numberOfPlannedTests = 6
casper.test.begin('test-simple-image-resize', numberOfPlannedTests, (test) => {
  casper.start(`http://${testhost}`, function () {
  })

  casper.then(function () {
    const curr        = this.getCurrentUrl()
    const fixturePath = this.fetchText('#fixture_path')

    this.fill('#entryForm', {
      my_file     : `${fixturePath}/1.jpg`,
      width_field : '400',
      height_field: '400',
    })

    this.evaluate(function () { $('#entryForm').submit() })

    this.waitFor(function () {
      return curr !== this.getCurrentUrl()
    })
  })

  casper.then(function () {
    this.test.assertTextExists('"ok":"ASSEMBLY_COMPLETED"')
  })

  casper.run(function () {
    this.test.done()
  })
})
