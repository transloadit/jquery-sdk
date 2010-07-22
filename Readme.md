# Transloadit jQuery SDK

The official docs for our jQuery plugin / SDK are on the
[transloadit website](http://transloadit.com/docs/jquery-plugin).

## Contributing

Feel free to fork this project. We will happily merge bug fixes or other small
improvements. For bigger changes you should probably get in touch with us
before you start to avoid not seeing them merged.

## Building

Building your own compressed version requires a *nix operation system and curl.
We are using the [Google Closure REST API](http://code.google.com/closure/compiler/docs/gettingstarted_api.html)
for minification.

    make

The minified output file can be found in: `build/jquery.transloadit2.js`.

## Dependencies

This plugin includes the following dependencies:

* [jquery.easing.js](http://gsgd.co.uk/sandbox/jquery/easing/) by George McGinley Smith (BSD License)
* [jquery.jsonp.js](http://gsgd.co.uk/sandbox/jquery/easing/) by Julian Aubourg (MIT License)
* [toolbox.expose.js](http://flowplayer.org/tools/toolbox/expose.html) by Tero Piirainen (Public domain)
* [json2.js](http://www.json.org/json2.js) by Douglas Crockford (Public domain)

A big thanks goes to the authors of these fantastic projects!

## License

The Transloadit jQuery SDK is licensed under the MIT license. The dependencies
have their own licenses (MIT, BSD, PUBLIC DOMAIN).