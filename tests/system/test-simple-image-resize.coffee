casper.start "http://#{testhost}", ->
  curr = @getCurrentUrl()

  fixturePath = @fetchText "#fixture_path"
  console.log fixturePath

  @fill "#entryForm",
    "my_file": fixturePath + "/1.jpg"
    "width_field": "400",
    "height_field": "400"

  @evaluate ->
    $("#entryForm").submit()

  @waitFor ->
    curr != @getCurrentUrl()

casper.then ->
  @test.assertTextExists "{\\\"width\\\":400"
  @test.assertTextExists "\\\"height\\\":400"
