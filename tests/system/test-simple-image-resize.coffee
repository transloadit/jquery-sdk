casper.start "http://#{testhost}", ->
  curr = @getCurrentUrl()

  @evaluate ->
    $("#width_field").val("500")
    $("#height_field").val("600")

    fixturePath = $("#fixture_path").text();
    $("#my_file").val(fixturePath + "/1.jpg")
    $("#width_field").closest("form").submit()

  @waitFor ->
    curr != @getCurrentUrl()

casper.then ->
  @test.assertTextExists "{\"width\":500"
  @test.assertTextExists "\"height\":600"
