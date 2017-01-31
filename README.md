[![Build Status](https://travis-ci.org/transloadit/jquery-sdk.svg)](https://travis-ci.org/transloadit/jquery-sdk)

# Transloadit jQuery SDK

## Version 3

Changes from version 2 to version 3:

- There is now support for resumable file uploads! It works out of the box, you do not need to change anything for it.
- Performance has been improved in all areas of the plugin.
- Drag and Drop support has been added.
- Support for file preview lists has been added.
- All options related to polling have been removed.
- The onStart(), onUpload() and onResult() callbacks no longer receive the assembly object as a parameter, and is also called much sooner in the process.
- There is now a lot less network traffic for assembly status updates.
- There is now the ability to not wait for file upload meta data anymore, which is a big speed improvement.

### Basics

The Transloadit jQuery plugin allows you to

- show file upload progress,
- get uploaded results directly without further API queries, and
- wait for upload processing to complete before redirecting to the result page or calling a callback function.

Assuming a form with the ID <code>"upload-form"</code> (from the [minimal integration](/docs/#the-minimal-integration)), the jQuery plugin can be used like this:

```markup
<script src="//assets.transloadit.com/js/jquery.transloadit-v3-latest.js"></script>
<script type="text/javascript">
// We call .transloadit() after the DOM is initialized:
$(function() {
  $('#upload-form').transloadit();
});
</script>
```

By default, this will display an overlay with a progress bar.

<span class="label label-danger">Important</span> Your file input fields must each have a proper <code>name</code> attribute for our jQuery SDK to work properly.

### Releases

We have three *magic* releases:

 - <code>jquery.transloadit-latest.js</code>
   This is always the latest version of any major release and is **the recommended version to use**. We will make sure not to break backwards compatibility even between major versions. This version is safe to use. [https://assets.transloadit.com/js/jquery.transloadit-latest.js](https://assets.transloadit.com/js/jquery.transloadit-latest.js)

 - <code>jquery.transloadit-v3-latest.js</code>
   This is always the latest version of the v3 branch: [https://assets.transloadit.com/js/jquery.transloadit-v3-latest.js](https://assets.transloadit.com/js/jquery.transloadit-v3-latest.js)

 - <code>jquery.transloadit2-v2-latest.js</code>
   This is always the latest version of the v2 branch: [https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js](https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js)

### Include drag and drop

To enable drag and drop please add one or more divs to your form like this:

```html
<div class="transloadit-drop-area" data-name="files">Please drag and drop files here</div>
```

You can change the text of course and also the value of the data-name attribute. If you do not have the data-name attribute set, we will default it to "files".

This will create a drag and drop area with some default CSS in your form. This is the default CSS for it - feel free to overwrite it in your own CSS files:

```css
.transloadit-drop-area {
  padding: 5px;
  width: 200px;
  height: 75px;
  border: 2px dashed #ccc;
}
.transloadit-drop-area.hover {
  border: 2px dashed #0af;
}
```

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

### How to add your own localization / other language strings

You can add your own language strings like so:

```
var $el = $('#upload-form');
$el.transloadit({
  locale: "my_locale"
});

$el.transloadit.i18n.my_locale = {
  'errors.BORED_INSTANCE_ERROR' : 'Could not find a bored instance.',
  'errors.CONNECTION_ERROR'     : 'There was a problem connecting to the upload server',
  'errors.unknown'              : 'There was an internal error.',
  'errors.tryAgain'             : 'Please try your upload again.',
  'errors.troubleshootDetails'  : 'If you would like our help to troubleshoot this, ' +
      'please email us this information:',
  cancel                        : 'Cancel',
  details                       : 'Details',
  startingUpload                : 'Starting upload ...',
  processingFiles               : 'Upload done, now processing files ...',
  uploadProgress                : '%s / %s MB at %s kB/s | %s left'
}
```

Then just replace the English strings with your custom language strings.

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
  Specifies whether the plugin should wait for files to be transcoded before submitting the form. This is <code>false</code> by default.
 </td>
</tr>
<tr>
 <td markdown="1">
  <code>requireUploadMetaData</code>
 </td>
 <td markdown="1">
  Specifies whether the plugin should wait for meta data of uploaded files to first be extracted before it calls the <code>onSuccess</code> callback.
  If you set <code>wait</code> to <code>true</code>, this option does not have any effect, because extracting meta of uploaded files is a prerequisite for the files to be transcoded.

  However, if you set <code>wait</code> to <code>false</code>, the <code>onSuccess</code> callback is fired as soon as the uploading is finished. The  <code>uploads</code> array in the passed assembly object will be empty in this case. If you need this uploads array to be populated, set this option to <code>true</code>.

  This option is <code>false</code> by default to fire the <code>onSuccess</code> callback as soon as possible to increase perceived performance.
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
  <code>onStart()</code>
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

  Please set <code>requireUploadMetaData</code> to true if you use this callback.
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
  This is fired when the plugin has completed an upload. If <code>wait</code> is set to <code>false</code>, this is fired after the upload finishes. If <code>wait</code> is <code>true</code>, this is fired once all files have been transcoded.
 </td>
</tr>
</table>

<span class="label label-danger">Important</span> For very specific use-cases it may help to
take a look at the [plugin's source code](https://github.com/transloadit/jquery-sdk). You can also always [ask us](/support) to clarify something or help you with integration.

## Contributing

Feel free to fork this project. We will happily merge bug fixes or other small
improvements. For bigger changes you should probably get in touch with us
before you start to avoid not seeing them merged.

## Dependencies

This plugin includes the following dependencies:

* [jquery.jsonp.js](http://code.google.com/p/jquery-jsonp/) by Julian Aubourg (MIT License)
* [toolbox.expose.js](http://jquerytools.github.io/documentation/toolbox/expose.html) by Tero Piirainen (Public domain)
* [json2.js](https://cdnjs.cloudflare.com/ajax/libs/json2/20150503/json2.js) by Douglas Crockford (Public domain)

A big thanks goes to the authors of these fantastic projects!

## License

The Transloadit jQuery SDK is licensed under the MIT license. The dependencies
have their own licenses (MIT, BSD, PUBLIC DOMAIN).
