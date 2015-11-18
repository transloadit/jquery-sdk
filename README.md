[![Build Status](https://travis-ci.org/transloadit/jquery-sdk.svg)](https://travis-ci.org/transloadit/jquery-sdk)

# Transloadit jQuery SDK

The official docs for our jQuery plugin / SDK are on the
[transloadit website](https://transloadit.com/docs/#jquery-plugin).

### Basics

The Transloadit jQuery plugin allows you to

- show file upload progress,
- get uploaded results directly without further API queries, and
- wait for upload processing to complete before redirecting to the result page.

Assuming a form with the ID <code>"upload-form"</code> (from the [minimal integration](/docs/#the-minimal-integration)), the jQuery plugin can be used like this:

```markup
<script src="//assets.transloadit.com/js/jquery.transloadit2-v2-latest.js"></script>
<script type="text/javascript">
// We call .transloadit() after the DOM is initialized:
$(function() {
  $('#upload-form').transloadit();
});
</script>
```

By default, this will display an overlay with a progress bar.

<span class="label label-danger">Important</span> Your file input fields must each have a proper <code>name</code> attribute for our jQuery SDK to work properly.


### Include drag and drop

Please refer to [this project](https://github.com/tim-kos/transloadit-drag-and-drop) to add support for drag and drop.

### Customize the progress bar

If you don't like the Transloadit progress bar, you can render your own, like this:

```javascript
$('#upload-form').transloadit({
  modal: false,
  onProgress: function(bytesReceived, bytesExpected) {
    // render your own progress bar!
    $('#progress')
      .text((bytesReceived / bytesExpected * 100).toFixed(2) + '%');
  },
  onError: function(assembly) {
    alert(assembly.error + ': ' + Assembly.message);
  }
});
```

If you like the default Transloadit progress bar but just want to change a few colors, customize [these css selectors](https://github.com/transloadit/jquery-sdk/blob/master/css/transloadit2.css) in your own css.

### Unbinding the plugin

You can unbind the plugin by calling

```javascript
$('#upload-form').unbind('submit.transloadit');
```

### How to use XMLHttpRequest

You can either set the <code>formData</code> parameter to true, or supply your own FormData
object to it in order to enable xhr file uploads:

```javascript
$('#upload-form').transloadit({
  formData: true
});
```

### How to access the internal Transloadit object

You can access the internal uploader object to call methods directly on it like so:

```javascript
var $el = $('#upload-form');
$el.transloadit({
  wait: true
});

var uploader = $el.data('transloadit.uploader');

// then call some methods on the uploader object
uploader.start();
uploader.stop();

// hide the modal if it exists
uploader.hideModal();

// alternatively you could also do it like this
$el.transloadit('start');
$el.transloadit('stop');
```

Please consult the [plugin's source code](https://github.com/transloadit/jquery-sdk) to see all available methods.

### Available plugin versions

#### Latest

This is always the latest version, and for now points to v2.7.2. This is the **recommended version** to use.<br />
<https://assets.transloadit.com/js/jquery.transloadit2-latest.js>

#### Version 2 Latest

This is always the latest version of the 2.x.x branch, and for now points to v2.7.2.<br />
<https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js>

### Plugin parameters

The plugin supports several parameters.

<table class="table table-striped table-bordered">
<tr>
 <th>Parameter</th>
 <th>Description</th>
</tr>
<tr>
 <td markdown="1">
  <code>wait</code>
 </td>
 <td markdown="1">
  Specifies whether the plugin should wait for files to be processed before submitting the form. This is <code>false</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>params</code>
 </td>
 <td markdown="1">

An object of Assembly instructions that should be executed. For examples please check [the minimal integration](#the-minimal-integration). This is <code>null</code> by default, which means the instructions are read from the hidden input field named <code>params</code>.

Here is an example:

<pre><code>
$('#upload-form').transloadit({
  wait   : true,
  params : {
    auth  : { key : 'YOUR_TRANSLOADIT_AUTH_KEY' },
    steps : {
      resize_to_75: {
        robot  : '/image/resize',
        use    : ':original',
        width  : 75,
        height : 75
      },
      // more Steps here
    }
  }
});
</code></pre>

 </td>
</tr>
<tr>
 <td markdown="1">
  <code>signature</code>
 </td>
 <td markdown="1">
  Specifies the signature string, which is required if signature authentication is enabled in your account. This is <code>null</code> by default. The old way of providing this in a hidden input field named <code>signature</code> is still valid and will not be deprecated.

  Please make sure the signature is calculated in your back-end code, so that your Transloadit Auth Secret is not exposed in your public JavaScript code!
 </td>
</tr>

<tr>
 <td markdown="1">
  <code>modal</code>
 </td>
 <td markdown="1">
  Specifies whether to render the Transloadit overlay and progress bar automatically. This is <code>true</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>autoSubmit</code>
 </td>
 <td markdown="1">
  Specifies whether to submit the original form automatically once the upload and processing have completed. This is <code>true</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>formData</code>
 </td>
 <td markdown="1">
  Specifies whether to use XMLHttpRequest (XHR) for file uploading. This is <code>false</code> by default. Can either be a FormData object or <code>true</code>, in which case the plugin builds the FormData object.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>processZeroFiles</code>
 </td>
 <td markdown="1">
  Specifies whether to perform processing when the form is submitted with no files selected using the form inputs. This is <code>true</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>triggerUploadOnFileSelection</code>
 </td>
 <td markdown="1">
  When set to <code>true</code> this triggers the upload to Transloadit as soon as the user has selected a file in any of the form's file input fields. This is <code>false</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>exclude</code>
 </td>
 <td markdown="1">
  Specifies a selector for which any matching <code>input[type=file]</code> elements in the current form will <em>not</em> be uploaded through Transloadit. This is <code>""</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>fields</code>
 </td>
 <td markdown="1">

A CSS selector that specifies the form fields to be sent to Transloadit. This is <code>false</code> by default, which means no form fields are submitted with an upload.

For example:

<pre><code>
$('form').transloadit({
  // send no form fields; this is the default
  fields: false
});
</code></pre>

If you would like to only send some fields, set this parameter to a CSS selector string matching the fields to be sent:

<pre><code>
$('form').transloadit({
  // only send the fields named "field1" &amp; "field2"
  fields: 'input[name=field1], input[name=field2]'
});
</code></pre>

If you would like to send all form fields, set this to true:

<pre><code>
$('form').transloadit({
  fields: true
});
</code></pre>

You can also set this to an object of key/value pairs:

<pre><code>
$('form').transloadit({
  fields: {
    name : 'John Doe',
    age  : 26
  }
});
</code></pre>

The fields that you send here will be available as <code>${fields.*}</code> variables in your Assembly instructions. Learn more about that [here](#form-fields-in-assembly-instructions).
 </td>
</tr>

<tr>
 <td markdown="1">
  <code>debug</code>
 </td>
 <td markdown="1">
  Specifies whether Transloadit errors are displayed to end users. If this is set to <code>false</code>, no Transloadit errors will be displayed. Use the <code>onError</code> callback to perform your own logging or presentation. This is <code>true</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>onStart(assembly)</code>
 </td>
 <td markdown="1">
  This is fired whenever an upload begins.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>onFileSelect(fileName, $fileInputField)</code>
 </td>
 <td markdown="1">
  This is fired whenever a user selects a file in file input field.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>onProgress(<br />bytesReceived, bytesExpected<br />)</code>
 </td>
 <td markdown="1">
  This is fired whenever the upload progress is updated, allowing you to render your own upload progress bar.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>onUpload(upload)</code>
 </td>
 <td markdown="1">
  This is fired once for each file uploaded. This is useful for custom renderings of multiple file uploads.

  Each upload here has an ID field. You can map that back to the <code>original_id</code> field of results on the <code>onResult</code> callback.
 </td>
</tr>

<tr>
 <td markdown="1">
  <code>onResult(step, result)</code>
 </td>
 <td markdown="1">
  This is fired each time a result becomes available for a given Step, and is only available when <code>wait</code> is set to <code>true</code>. This can be used
  to show thumbnails for videos or images once they are uploaded.

  Results here contain a key <code>original_id</code>, which maps them back to the ID of the originally uploaded file's ID.
 </td>
</tr>

<tr>
 <td markdown="1">
  <code>onCancel()</code>
 </td>
 <td markdown="1">
  This is fired after an upload has been canceled by the user.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>onError(assembly)</code>
 </td>
 <td markdown="1">
  This is fired when upload errors occur.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>onSuccess(assembly)</code>
 </td>
 <td markdown="1">
  This is fired when the plugin has completed an upload. If <code>wait</code> is set to <code>false</code>, this is fired after the upload finishes. If <code>wait</code> is <code>true</code>, this is fired once all files have been processed.
 </td>
</tr>
</table>

<span class="label label-danger">Important</span> For very specific use-cases it may help to
take a look at the [plugin's source code](https://github.com/transloadit/jquery-sdk). You can also always [ask us](/support) to clarify something or help you with integration.

## Contributing

Feel free to fork this project. We will happily merge bug fixes or other small
improvements. For bigger changes you should probably get in touch with us
before you start to avoid not seeing them merged.

## Versioning

This project implements the Semantic Versioning guidelines.

Releases will be numbered with the following format:

<code><major>.<minor>.<patch></code>

And constructed with the following guidelines:

* Breaking backward compatibility bumps the major (and resets the minor and patch)
* New additions without breaking backward compatibility bumps the minor (and resets the patch)
* Bug fixes and misc changes bumps the patch

For more information on SemVer, please visit http://semver.org/.

<code>latest</code> points to the latest stable of a major version.

Note that the <code>2</code> in <code>jquery.transloadit2-latest.js</code> refers to the Transloadit
API2 version, not the client SDK version.

## Releases

We have two *magic* releases:

 - <code>jquery.transloadit2-latest.js</code>
   This is always the latest version of any major release and is **the recommended version to use**. If you use this, it may break backwards compatibility for you once we release the next major version. [https://assets.transloadit.com/js/jquery.transloadit2-latest.js](https://assets.transloadit.com/js/jquery.transloadit2-latest.js)

 - <code>jquery.transloadit2-v2-latest.js</code>
   This is always the latest major 2.0 version: [https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js](https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js)

Here's an overview of [all our releases](https://github.com/transloadit/jquery-sdk/releases).

## Building

Building your own compressed version requires a *nix operation system and curl.
We are using the [Google Closure REST API](http://code.google.com/closure/compiler/docs/gettingstarted_api.html)
for minification.

```bash
make
```

The minified output file can be found in: <code>build/jquery.transloadit2.js</code>.

## Tests

To run the tests, install <code>make</code> (via Xcode or build-essentials), [CasperJS](http://casperjs.org/) and [Node.js](http://nodejs.org). Then run

```bash
make test
```

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
