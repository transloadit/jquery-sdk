casper.start "http://#{testhost}", ->
  curr = @getCurrentUrl()

  @evaluate ->
    $("#width_field").val("500")
    $("#height_field").val("600")
    $("#my_file").val("/Applications/XAMPP/htdocs/transloadit/sdks/jquery-sdk/tests/fixtures/1.jpg")
    $("#width_field").closest("form").submit()

  @waitFor ->
    curr != @getCurrentUrl()

casper.then ->
  @test.assertTextExists "{\"width\":500"
  @test.assertTextExists "\"height\":600"
