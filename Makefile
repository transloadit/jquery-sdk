build:
	@echo "Combining files ..."
	@cat \
	  js/dep/jquery.easing.js \
	  js/dep/jquery.jsonp.js \
	  js/dep/json2.js \
	  js/dep/toolbox.expose.js \
	  js/lib/jquery.transloadit2.js > build/jquery.transloadit2.js
	@echo "Compiling with Closure REST API ..."
	@curl \
		-s \
		-X POST \
		-H 'Expect: ' \
		--data-urlencode compilation_level="SIMPLE_OPTIMIZATIONS" \
		--data-urlencode output_format="text" \
		--data-urlencode output_info="compiled_code" \
		--data-urlencode js_code@build/jquery.transloadit2.js \
		-o build/jquery.transloadit2.js \
		http://closure-compiler.appspot.com/compile
	@echo "Build complete:"
	@ls -lh build/jquery.transloadit2.js | awk '{print $$9, $$5}'

clean:
	-rm build/*.*

.PHONY: build clean