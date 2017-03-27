[![Build Status](https://travis-ci.org/transloadit/jquery-sdk.svg)](https://travis-ci.org/transloadit/jquery-sdk)

# Transloadit jQuery SDK

## Version 3

Changes from version 2 to version 3:

### BC Breaking changes:

- The onStart() and onExecuting() callbacks receive a stripped down version of the assembly object parameter.
- The onUpload() and onResult() callbacks no longer receive the assembly object as a parameter.
- The formData parameter has been removed, because all uploads use XHR now. This will only break BC for you if you used formData: customFormDataObj. In that case you should add the contents of your custom form data as hidden input fields to the form now.
- Several new translations have been added for which you would need to add a translation in case you run on a custom locale. Please check "How to add your own localization / other language strings" at the bottom of this page for details.

### Non-BC Breaking Changes and new features:

- There is now support for resumable file uploads! It works out of the box, you do not need to change anything for it.
- Performance has been improved in all areas of the plugin.
- Drag and Drop support has been added.
- Support for file preview lists has been added.
- All options related to polling have been removed.
- There is now a lot less network traffic for assembly status updates.
- There is now the ability to not wait for file upload meta data anymore, which is a big speed improvement. This change was also backported to the last version in the 2.x series.

- There are two new callbacks implemented: onDisconnect() and onReconnect()

Version 2 of the plugin is deprecated and will cease to exist on September 30, 2017. Please upgrade to version 3 as soon as possible.

## Basics

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
  $('#upload-form').transloadit({
    wait  : true,
    fields: true,

    triggerUploadOnFileSelection: true,

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
});
</script>
```

By default, this will display an overlay with a progress bar.

<span class="label label-danger">Important</span> Your file input fields must each have a proper <code>name</code> attribute for our jQuery SDK to work properly.

## Releases

We have three *magic* releases:

- <code>jquery.transloadit-latest.js</code>
  This is usually the latest version and is **the recommended version to use**. We will make sure not to break backwards compatibility even between major versions. This version is safe to use.
  Since between version 2 and 3 there are a few minor BC breaking changes, this version still points to **version 2** for now, until **September 30, 2017**. We will then make this point to **version 3**.
  [https://assets.transloadit.com/js/jquery.transloadit-latest.js](https://assets.transloadit.com/js/jquery.transloadit-latest.js)

- <code>jquery.transloadit-v3-latest.js</code>
  This is always the latest version of the v3 branch: [https://assets.transloadit.com/js/jquery.transloadit-v3-latest.js](https://assets.transloadit.com/js/jquery.transloadit-v3-latest.js)

- <code>jquery.transloadit2-v2-latest.js</code>
  This is always the latest version of the v2 branch: [https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js](https://assets.transloadit.com/js/jquery.transloadit2-v2-latest.js)

## Callbacks

These can be added as parameters to the `.transloadit()` call like so:

```markup
<script src="//assets.transloadit.com/js/jquery.transloadit-v3-latest.js"></script>
<script type="text/javascript">
// We call .transloadit() after the DOM is initialized:
$(function() {
  $('#upload-form').transloadit({
    onStart: function(assembly) {
      console.log('>> Uploading has started!');
    },
    onExecuting: function(assembly) {
      console.log('>> Transcoding has started!');
    },
  });
});
```

<table class="table table-striped table-bordered">
<tr>
  <th>Parameter</th>
  <th>Description</th>
</tr>
<tr>
  <td markdown="1">
   <code>onStart(assemblyObj)</code>
  </td>
  <td markdown="1">
   This is fired whenever uploading begins. The assemblyObj contains useful data like the assembly's id.
  </td>
</tr>
<tr>
  <td markdown="1">
   <code>onExecuting(assemblyObj)</code>
  </td>
  <td markdown="1">
   This is fired whenever uploading is fully finished and transcoding begins. The assemblyObj contains useful data like the assembly's id.
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
   This is fired once for each uploaded file. This is useful for custom renderings of multiple file uploads.

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
<tr>
  <td markdown="1">
   <code>onDisconnect()</code>
  </td>
  <td markdown="1">
   This is called whenever the internet connection goes down. Useful in the context of resumable uploads. Transloadit will display a default error message in this case, though, asking the user to keep their browser tab open and wait for the resume.
  </td>
</tr>
<tr>
  <td markdown="1">
   <code>onReconnect()</code>
  </td>
  <td markdown="1">
   This is called whenever the internet connection becomes available again after it had been down previously.
  </td>
</tr>
</table>

## Parameters

These can be added as parameters to the `.transloadit()` call like so:

```markup
<script src="//assets.transloadit.com/js/jquery.transloadit-v3-latest.js"></script>
<script type="text/javascript">
// We call .transloadit() after the DOM is initialized:
$(function() {
  $('#upload-form').transloadit({
    wait  : true,
    region: 'eu-west-1'
  });
});
```

<table class="table table-striped table-bordered">
<tr>
  <th>Parameter</th>
  <th>Description</th>
</tr>
<tr>
  <td markdown="1">
   <code>service</code>
  </td>
  <td markdown="1">
   The service URL to use. By default this is `"https://api2.transloadit.com/"`, which makes use of our entire api and route traffic based on the geolocation of your users.
   Setting this parameter overrules the `region` parameter, which you should also check out.
  </td>
</tr>
<tr>
  <td markdown="1">
   <code>region</code>
  </td>
  <td markdown="1">
   If you want to temporarily switch to a particular region only, because we are down in the other region, you can set this parameter to either `us-east-1` or `eu-west-1`. The SDK will then build the proper service endpoint for you. Make sure to not set a custom service endpoint yourself in this case, as this would overrule the region parameter.
  </td>
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
</table>

<span class="label label-danger">Important</span> For very specific use-cases it may help to
 take a look at the [plugin's source code](https://github.com/transloadit/jquery-sdk). You can also always [ask us](/support) to clarify something or help you with integration.

## Drag and drop

To enable drag and drop please add a div to your form like as follows:

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

## File preview areas

File preview areas are lists that are automatically populated with the files that will be part of the upload.
The user can then review the list prior to the upload and remove some files again if he or she so wishes.

To enable file preview areas, please add a div to your form like as follows:

```html
<div class="transloadit-file-preview-area"></div>
```

This will create a file preview area with some default CSS in your form. This is the default CSS for it - feel free to overwrite it in your own CSS files:

```css
.transloadit-file-preview-area {
  margin: 10px 0;
  padding: 5px;
  width: 300px;
  height: 100px;
  overflow-y: auto;
  border: 1px solid #ccc;
}
.transloadit-file-preview-area ul {
  margin: 0!important;
  padding: 0!important;
}
.transloadit-file-preview-area li {
  border-top: 1px solid #ddd;
  list-style-type: none;
  display: inline-block;
  width: 100%;
  height: 12px;
  padding: 1px 3px 3px 3px;
  font-size: 11px;
}
.transloadit-file-preview-area li:first-child {
  border-top: none;
}
```

## Customizing the Progress Bar

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
    alert(assembly.error + ': ' + assembly.message);
  }
});
```

If you like the default Transloadit progress bar but just want to change a few colors, customize [these css selectors](https://github.com/transloadit/jquery-sdk/blob/master/css/transloadit2.css) in your own css.

### Unbinding the plugin

You can unbind the plugin by calling

```javascript
$('#upload-form').unbind('submit.transloadit');
```

## How to add your own localization / other language strings

You can add your own language strings like so:

```
var $el = $('#upload-form');
$el.transloadit({
  locale: "my_locale"
});

$el.transloadit.i18n.my_locale = {
  'errors.SERVER_CONNECTION_ERROR'                         : 'Your internet connection seems to be down. Retrying ...',
  'errors.SERVER_CONNECTION_ERROR.retries_exhausted'       : 'Your internet connection seems to be down. Once it is up and running again please reload your browser window and try again.',
  'errors.ASSEMBLY_NOT_FOUND'                              : 'There was a server problem finding the proper upload. Please reload your browser window and try again.',
  'errors.INTERNET_CONNECTION_ERROR_UPLOAD_IN_PROGRESS'    : 'Your internet connection seems to be offline. We will automatically retry the upload until the connection works again. Please leave the browser window open.',
  'errors.INTERNET_CONNECTION_ERROR_UPLOAD_NOT_IN_PROGRESS': 'Your internet connection seems to be offline. Please leave the browser window open, so that we can retry fetching the status of your upload.',
  'errors.MAX_FILES_EXCEEDED'                              : 'Please select at most %s files.',
  'errors.unknown'                                         : 'There was an unknown error.',
  'errors.tryAgain'                                        : 'Please reload your browser page and try again.',
  'errors.troubleshootDetails'                             : 'If you would like our help to troubleshoot this, ' + 'please email us this information:',
  cancel         : 'Cancel',
  cancelling     : 'Cancelling ...',
  details        : 'Details',
  startingUpload : 'Starting upload ...',
  processingFiles: 'Upload done, now processing files ...',
  uploadProgress : '%s / %s MB at %s kB/s | %s left'
}
```

Then just replace the English strings with your custom language strings.

## How to access the internal plugin object

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

## Contributing

Feel free to fork this project. We will happily merge bug fixes or other small
improvements. For bigger changes you should probably get in touch with us
before you start to avoid not seeing them merged.

## Dependencies

This plugin includes the following dependencies:

* [jquery.jsonp.js](http://code.google.com/p/jquery-jsonp/) by Julian Aubourg (MIT License)
* [toolbox.expose.js](http://jquerytools.github.io/documentation/toolbox/expose.html) by Tero Piirainen (Public domain)
* [json2.js](https://cdnjs.cloudflare.com/ajax/libs/json2/20150503/json2.js) by Douglas Crockford (Public domain)
* [socket.io](https://socket.io) by Guillermo Rauch (MIT License)

A big thanks goes to the authors of these fantastic projects!

## License

The Transloadit jQuery SDK is licensed under the MIT license. The dependencies
have their own licenses (MIT, BSD, PUBLIC DOMAIN).
