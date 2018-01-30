[![Build Status](https://travis-ci.org/transloadit/jquery-sdk.svg)](https://travis-ci.org/transloadit/jquery-sdk)

# Transloadit jQuery SDK

A jQuery Integration for [Transloadit](https://transloadit.com)'s file uploading and encoding service

## Intro

[Transloadit](https://transloadit.com) is a service that helps you handle file uploads, resize, crop and watermark your images, make GIFs, transcode your videos, extract thumbnails, generate audio waveforms, and so much more. In short, [Transloadit](https://transloadit.com) is the Swiss Army Knife for your files.

This is a **jQuery** SDK to make it easy to talk to the [Transloadit](https://transloadit.com) REST API. It supports resumable file uploads out of the box including a modal box with a progress bar, drag and drop support and several other nice things. :)

## Install

**Note** You may also be interested in checking out [Uppy](https://transloadit.com/docs/#uppy), Transloadit's next-gen file uploader for the web.

Simply include the JavaScript asset in your HTML page like so. jQuery >= 1.9 is also required.

```html
<script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
<script src="//assets.transloadit.com/js/jquery.transloadit2-v3-latest.js"></script>
```

## How does it work

You have an HTML form on your page like this one for example:

```
<form id="upload-form" action="/uploads" enctype="multipart/form-data" method="POST">
  <input type="file" name="my_file" multiple="multiple" />
  <div class="transloadit-drop-area">Drag and drop files here</div>
  <div class="transloadit-file-preview-area"></div>
  <input type="text" name="album_id" value="foo_id" />
  <input type="submit" value="Upload">
</form>
```

By attaching the jQuery SDK to the form you enable uploading functionality on the form:
```javascript
$('#upload-form').transloadit({
  wait: true,
  triggerUploadOnFileSelection: true,
  params : {
    auth  : { key : 'YOUR_TRANSLOADIT_KEY' },
    template_id : 'YOUR_TEMPLATE_ID'
  }
});
```

Once you select some files over the file input field (or the drag and drop area) a modal will appear that will upload your fils.
The `wait` parameter set to `true` instruct the SDK to wait for all transcoding to finish. Once it's finished it will attach a long JSON
string to a hidden textarea in your form.

You can then submit the form as you normally would. On your backend you have an extra POST field named `"transloadit"` then in the payload including JSON with information about all uploads and transcoding results, their meta data and the URLs to them.

It's that simple. :)

## Usage

The Transloadit jQuery plugin allows you to

- show file upload progress,
- get uploaded results directly without further API queries, and
- wait for upload processing to complete before redirecting to the result page or calling a callback function.

Assuming a form with the ID `"upload-form"` (from the [minimal integration](https://transloadit.com/docs/#minimal-integration)),
the jQuery plugin can be used like this:

```markup
<script src="//assets.transloadit.com/js/jquery.transloadit2-v3-latest.js"></script>
<script type="text/javascript">
// We call .transloadit() after the DOM is initialized:
$(function() {
  $('#upload-form').transloadit({
    wait  : true,
    fields: true,

    triggerUploadOnFileSelection: true,

    params : {
      auth  : { key : 'YOUR_TRANSLOADIT_KEY' },
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

## Specifying Assembly Instructions in the Form

Instead of using the plugin's `params` parameter, you could also have added the Assembly Instructions in a hidden form field named `params`.
Sometimes, especially when your instructions need to be calculated by a back-end language, and also when you want to add [Signature authentication](https://transloadit.com/docs/#authentication) it is easier to specify them directly in the form, than to add them in the call to the jQuery SDK.

The contents of the hidden params field need to be encoded as JSON, with **HTML entities escaped**.
Have your preferred scripting language encode the JSON for you to maintain readability. Here is an example in PHP:

```php
$params = array(
  "auth" => array("key" => "YOUR_TRANSLOADIT_KEY"),
  "steps" => array(
    "resize_to_75" => array(
      "robot" => "/image/resize",
      "use" => ":original",
      "width" => 75,
      "height" => 75
    )
  )
);

printf(
  '<input type="hidden" name="params" value="%s" />',
  htmlentities(json_encode($params))
);
```

Your form should then look like this (just with `YOUR_TRANSLOADIT_KEY` replaced with your real <dfn>Auth Key</dfn>):

```markup
<form id="upload-form" action="http://api2.transloadit.com/assemblies" enctype="multipart/form-data" method="POST">
  <input type="hidden" name="params" value="{&quot;auth&quot;:{&quot;key&quot;:&quot;YOUR_TRANSLOADIT_KEY&quot;},&quot;steps&quot;:{&quot;resize_to_75&quot;:{&quot;robot&quot;:&quot;\/image\/resize&quot;,&quot;use&quot;:&quot;:original&quot;,&quot;width&quot;:75,&quot;height&quot;:75}}}" />
  <input type="file" name="my_file" />
  <input type="submit" value="Upload">
</form>
```

Both ways of adding the Assembly Instructions are valid. When you upload a file you should see the same result.

## Example

An example use of this plugin can be found in the [examples](https://github.com/transloadit/jquery-sdk/tree/master/examples) directory.

To run it, simply replace `YOUR_TRANSLOADIT_KEY` (on the HTML file) with your actual Transloadit key and load the html file on your browser.

## Releases

We have one *magic* release:

- `jquery.transloadit-v3-latest.js`
  This is always the latest version of the v3 branch and is **the recommended version to use**. <https://assets.transloadit.com/js/jquery.transloadit2-v3-latest.js>

- You can also pin specific versions via:
  <https://assets.transloadit.com/js/jquery.transloadit2-v3.0.0.js>. Remember that it then becomes your responsibility to keep track of security and performance upgrades in our [releases](https://github.com/transloadit/jquery-sdk/releases).

## Callbacks

These can be added as parameters to the `.transloadit()` call like so:

```markup
<script src="//assets.transloadit.com/js/jquery.transloadit2-v3-latest.js"></script>
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
   onStart(assemblyObj)
  </td>
  <td markdown="1">
   This is fired whenever uploading begins. The assemblyObj contains useful data like the assembly's id.
  </td>
</tr>
<tr>
  <td markdown="1">
   onExecuting(assemblyObj)
  </td>
  <td markdown="1">
   This is fired whenever uploading is fully finished and transcoding begins. The assemblyObj contains useful data like the assembly's id.
  </td>
</tr>
<tr>
  <td markdown="1">
   onFileSelect(<br />fileObject,<br />$fileInputField<br />)
  </td>
  <td markdown="1">
   This is fired whenever a user selects a file in file input field.
  </td>
</tr>
<tr>
  <td markdown="1">
   onProgress(<br />bytesReceived, bytesExpected<br />)
  </td>
  <td markdown="1">
   This is fired whenever the upload progress is updated, allowing you to render your own upload progress bar.
  </td>
</tr>
<tr>
  <td markdown="1">
   onUpload(upload)
  </td>
  <td markdown="1">
   This is fired once for each uploaded file. This is useful for custom renderings of multiple file uploads.

   Each upload here has an ID field. You can map that back to the <code>original_id</code> field of results on the <code>onResult</code> callback.

   Please set <code>requireUploadMetaData</code> to true if you use this callback.
  </td>
</tr>
<tr>
  <td markdown="1">
   onResult(step, result)
  </td>
  <td markdown="1">
   This is fired each time a result becomes available for a given Step, and is only available when <code>wait</code> is set to <code>true</code>. This can be used
   to show thumbnails for videos or images once they are uploaded.

   Results here contain a key <code>original_id</code>, which maps them back to the ID of the originally uploaded file's ID.
  </td>
</tr>
<tr>
  <td markdown="1">
   onCancel()
  </td>
  <td markdown="1">
   This is fired after an upload has been canceled by the user.
  </td>
</tr>
<tr>
  <td markdown="1">
   onError(assembly)
  </td>
  <td markdown="1">
   This is fired when upload errors occur.
  </td>
</tr>
<tr>
  <td markdown="1">
   onSuccess(assembly)
  </td>
  <td markdown="1">
   This is fired when the plugin has completed an upload. If <code>wait</code> is set to <code>false</code>, this is fired after the upload finishes. If <code>wait</code> is <code>true</code>, this is fired once all files have been transcoded.
  </td>
</tr>
<tr>
  <td markdown="1">
   onDisconnect()
  </td>
  <td markdown="1">
   This is called whenever the internet connection goes down. Useful in the context of resumable uploads. Transloadit will display a default error message in this case, though, asking the user to keep their browser tab open and wait for the resume.
  </td>
</tr>
<tr>
  <td markdown="1">
   onReconnect()
  </td>
  <td markdown="1">
   This is called whenever the internet connection becomes available again after it had been down previously.
  </td>
</tr>
</table>

## Parameters

These can be added as parameters to the `.transloadit()` call like so:

```markup
<script src="//assets.transloadit.com/js/jquery.transloadit2-v3-latest.js"></script>
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
   service
  </td>
  <td markdown="1">
   The service URL to use. By default this is <code>"https://api2.transloadit.com/"</code>, which makes use of our entire api and route traffic based on the geolocation of your users.
   Setting this parameter overrules the <code>region</code> parameter, which you should also check out.
  </td>
</tr>
<tr>
  <td markdown="1">
   region
  </td>
  <td markdown="1">
   If you want to temporarily switch to a particular region only, because we are down in the other region, you can set this parameter to either <code>"us-east-1"</code> or <code>"eu-west-1"</code>. The SDK will then build the proper service endpoint for you. Make sure to not set a custom service endpoint yourself in this case, as this would overrule the region parameter.
  </td>
</tr>
<tr>
  <td markdown="1">
   wait
  </td>
  <td markdown="1">
   Specifies whether the plugin should wait for files to be transcoded before submitting the form. This is <code>false</code> by default.
  </td>
</tr>
<tr>
  <td markdown="1">
   requireUploadMetaData
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
   params
  </td>
  <td markdown="1">

 An object of Assembly instructions that should be executed. For examples please check [the minimal integration](https://transloadit.com/docs/#13-the-minimal-integration). This is <code>null</code> by default, which means the instructions are read from the hidden input field named <code>params</code>.

 Here is an example:

 <pre><code>
 $('#upload-form').transloadit({
   wait   : true,
   params : {
     auth  : { key : 'YOUR_TRANSLOADIT_KEY' },
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
   signature
  </td>
  <td markdown="1">
   Specifies the signature string, which is required if signature authentication is enabled in your account. This is <code>null</code> by default. The old way of providing this in a hidden input field named <code>signature</code> is still valid and will not be deprecated.

   Please make sure the signature is calculated in your back-end code, so that your Transloadit Auth Secret is not exposed in your public JavaScript code!
  </td>
</tr>
<tr>
  <td markdown="1">
   modal
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
   processZeroFiles
  </td>
  <td markdown="1">
   Specifies whether to perform processing when the form is submitted with no files selected using the form inputs. This is <code>true</code> by default.
  </td>
</tr>
<tr>
  <td markdown="1">
   triggerUploadOnFileSelection
  </td>
  <td markdown="1">
   When set to <code>true</code> this triggers the upload to Transloadit as soon as the user has selected a file in any of the form's file input fields. This is <code>false</code> by default.
  </td>
</tr>
<tr>
  <td markdown="1">
   maxNumberOfUploadedFiles
  </td>
  <td markdown="1">
   When set to an integer value, this is the maximum number of files users can upload. If they exceed this number, then an error will occur. By default this is <code>null</code>, which means no limit.
  </td>
</tr>
<tr>
  <td markdown="1">
   locale
  </td>
  <td markdown="1">
   The locale to use. The default value is <code>"en"</code>. If you use a custom locale, please provide your own localized strings. Please check the bottom of this page for further instructions.
  </td>
</tr>
<tr>
  <td markdown="1">
   exclude
  </td>
  <td markdown="1">
   Specifies a selector for which any matching <code>input[type=file]</code> elements in the current form will <em>not</em> be uploaded through Transloadit. This is <code>""</code> by default.
  </td>
</tr>
<tr>
  <td markdown="1">
   fields
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
   translations
  </td>
  <td markdown="1">
   An object of i18n translation strings. Please check below to get the list of all available strings to translate.
  </td>
</tr>
<tr>
  <td markdown="1">
   debug
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
  translations: {
    'errors.SERVER_CONNECTION_ERROR'                         : 'Your internet connection seems to be down. Retrying ...',
    'errors.SERVER_CONNECTION_ERROR.retries_exhausted'       : 'Your internet connection seems to be down. Once it is up and running again please reload your browser window and try again.',
    'errors.ASSEMBLY_NOT_FOUND'                              : 'There was a server problem finding the proper upload. Please reload your browser window and try again.',
    'errors.INTERNET_CONNECTION_ERROR_UPLOAD_IN_PROGRESS'    : 'Your internet connection seems to be offline. We will automatically retry the upload until the connection works again. Please leave the browser window open.',
    'errors.INTERNET_CONNECTION_ERROR_UPLOAD_NOT_IN_PROGRESS': 'Your internet connection seems to be offline. Please leave the browser window open, so that we can retry fetching the status of your upload.',
    'errors.MAX_FILES_EXCEEDED'                              : 'Please select at most %s files.',
    'errors.unknown'                                         : 'There was an unknown error.',
    'errors.tryAgain'                                        : 'Please reload your browser page and try again.',
    'errors.troubleshootDetails'                             : 'If you would like our help to troubleshoot this, ' + 'please email us this information:',
    'cancel'                                                 : 'Cancel',
    'cancelling'                                             : 'Cancelling ...',
    'details'                                                : 'Details',
    'startingUpload'                                         : 'Starting upload ...',
    'processingFiles'                                        : 'Upload done, now processing files ...',
    'uploadProgress'                                         : '%s / %s MB at %s kB/s | %s left',
  }
});
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
