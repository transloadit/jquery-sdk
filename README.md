# Transloadit jQuery SDK

The official docs for our jQuery plugin / SDK are on the
[transloadit website](http://transloadit.com/docs/jquery-plugin).

## Contributing

Feel free to fork this project. We will happily merge bug fixes or other small
improvements. For bigger changes you should probably get in touch with us
before you start to avoid not seeing them merged.

## Versioning

This project implements the Semantic Versioning guidelines.

Releases will be numbered with the following format:

`<major>.<minor>.<patch>`

And constructed with the following guidelines:

* Breaking backward compatibility bumps the major (and resets the minor and patch)
* New additions without breaking backward compatibility bumps the minor (and resets the patch)
* Bug fixes and misc changes bumps the patch

For more information on SemVer, please visit http://semver.org/.

`latest` points to the latest stable of a major version.

Note that the `2` in `jquery.transloadit2-latest.js` refers to the Transloadit
API2 version, not the client SDK version.

## Releases

We have two *magic* releases:

 - `jquery.transloadit2-latest.js`  
   This is always the latest version of any major release. If you use this, it may break backwards compatibility for you once we release the next major version. [https://assets.transloadit.com/js/jquery.transloadit2-latest.js](https://assets.transloadit.com/js/jquery.transloadit2-latest.js)
 
 - `jquery.transloadit2-v2-latest.js`
   This is always the latest major 2.0 version, and is **the recommended version to use:** [https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js](https://assets.transloadit.com/js/jquery.transloadit2-latest.js)

Here's an overview of [all our releases](https://github.com/transloadit/jquery-sdk/releases).

## Building

Building your own compressed version requires a *nix operation system and curl.
We are using the [Google Closure REST API](http://code.google.com/closure/compiler/docs/gettingstarted_api.html)
for minification.

    make

The minified output file can be found in: `build/jquery.transloadit2.js`.

## Dependencies

This plugin includes the following dependencies:

* [jquery.easing.js](http://gsgd.co.uk/sandbox/jquery/easing/) by George McGinley Smith (BSD License)
* [jquery.jsonp.js](http://code.google.com/p/jquery-jsonp/) by Julian Aubourg (MIT License)
* [toolbox.expose.js](http://flowplayer.org/tools/toolbox/expose.html) by Tero Piirainen (Public domain)
* [json2.js](http://www.json.org/json2.js) by Douglas Crockford (Public domain)

A big thanks goes to the authors of these fantastic projects!

## License

The Transloadit jQuery SDK is licensed under the MIT license. The dependencies
have their own licenses (MIT, BSD, PUBLIC DOMAIN).
