build_name = jquery.transloadit2.js
build_path = build/$(build_name)
build_size = @ls -lh $(build_path) | awk '{print "$(1)", $$9, $$5}'
compile_js =\
	@curl \
	-s \
	-X POST \
	-H 'Expect: ' \
	--data-urlencode compilation_level="SIMPLE_OPTIMIZATIONS" \
	--data-urlencode output_format="text" \
	--data-urlencode output_info="compiled_code" \
	--data-urlencode js_code@$(build_path) \
	-o $(1) \
	http://closure-compiler.appspot.com/compile

$(build_path): js/dep/*.js js/lib/*.js
	@cat $^ > $(build_path)
	$(call build_size,before:)
	@echo "compiling with google closure rest api ..."
	$(call compile_js,$(build_path))
	$(call build_size,after:)

# TRANSLOADIT INTERNAL
install: $(build_path)
	cp $(build_path) ../../crm/app/webroot/js/$(build_name)

clean:
	-rm build/*.*

.PHONY: build clean install