build/jquery.transloadit2.js: js/dep/*.js js/lib/*.js
	@echo "Combining files ..."
	@cat $^ > build/jquery.transloadit2.js
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

# TRANSLOADIT INTERNAL
install: build/jquery.transloadit2.js
	cp build/jquery.transloadit2.js ../../crm/app/webroot/js/jquery.transloadit2.js

clean:
	-rm build/*.*

.PHONY: build clean install