casper.start "http://#{testhost}/trigger-on-file-select", ->
  curr = @getCurrentUrl()

  fixturePath = @fetchText "#fixture_path"

  @fill "#entryForm",
    "my_file": fixturePath + "/1.jpg"

  @waitFor ->
    curr != @getCurrentUrl()

casper.then ->
  @test.assertTextExists "{\\\"width\\\":400"
  @test.assertTextExists "\\\"height\\\":400"
