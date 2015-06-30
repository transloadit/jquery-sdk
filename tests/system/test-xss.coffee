casper.start "http://#{testhost}", ->
  curr = @getCurrentUrl()

  fixturePath = @fetchText "#fixture_path"

  @fill "#entryForm",
    "my_file": fixturePath + "/><img src=x onerror=document.write((1338-1));>.png"
    "width_field": "400",
    "height_field": "400"

  @evaluate ->
    $("#entryForm").submit()

  @waitFor ->
    curr != @getCurrentUrl()

casper.then ->
  @test.assertTextDoesntExist "1337"
  @test.assertTextExists "{\\\"width\\\":400"
  @test.assertTextExists "\\\"height\\\":400"
