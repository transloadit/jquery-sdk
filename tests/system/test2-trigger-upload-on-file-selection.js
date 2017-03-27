casper.start(`http://${testhost}/trigger-on-file-select`, function () {
  const curr = this.getCurrentUrl()

  const fixturePath = this.fetchText('#fixture_path')

  this.fill('#entryForm', { my_file: `${fixturePath}/1.jpg` })

  return this.waitFor(function () {
    return curr !== this.getCurrentUrl()
  })
})

casper.then(function () {
  this.test.assertTextExists('{\\"width\\":400')
  return this.test.assertTextExists('\\"height\\":400')
})
