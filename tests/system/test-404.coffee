casper.start "http://#{testhost}/nonexistent", ->
  @test.assertHttpStatus 404, "nonexistent url should be a 404"
  @test.assertUrlMatch /\/nonexistent/,
    "there is no redirect after requesting nonexistent page"
