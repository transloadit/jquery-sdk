const numberOfPlannedTests = 6
casper.test.begin('test-trigger-upload-on-file-selection', numberOfPlannedTests, (test) => {
  casper.start(`http://${testhost}/trigger-on-file-select`, function () {
  })

  casper.then(function () {
    const curr = this.getCurrentUrl()

    const fixturePath = this.fetchText('#fixture_path')

    this.fill('#entryForm', { my_file: `${fixturePath}/1.jpg` })

    this.waitFor(function () {
      return curr !== this.getCurrentUrl()
    })
  })

  casper.then(function () {
    this.test.assertTextExists('ASSEMBLY_COMPLETED')
  })

  casper.run(function () {
    this.test.done()
  })
})
