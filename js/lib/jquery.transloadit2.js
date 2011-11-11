/** @license jquery.transloadit2.js: Copyright (c) 2010 Felix Geisendörfer | MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Fork this on Github: http://github.com/transloadit/jquery-sdk
 *
 * Transloadit servers allow browsers to cache jquery.transloadit2.js for 1 hour.
 * keep this in mind when rolling out fixes.
 */
(function($) {
  var PROTOCOL = (document.location.protocol == 'https:')
      ? 'https://'
      : 'http://'
    , OPTIONS =
      { service: PROTOCOL+'api2.transloadit.com/'
      , assets: PROTOCOL+'assets.transloadit.com/'
      , onStart: function() {}
      , onProgress: function() {}
      , onUpload: function() {}
      , onResult: function() {}
      , onCancel: function() {}
      , onError: function() {}
      , onSuccess: function() {}
      , interval: 2500
      , pollTimeout: 8000
      , poll404Retries: 15
      , pollConnectionRetries: 3
      , wait: false
      , autoSubmit: true
      , modal: true
      , exclude: ''
      , fields: false
      , debug: true
      }
    , CSS_LOADED = false;

  $.fn.transloadit = function() {
    var args = Array.prototype.slice.call(arguments)
      , method
      , uploader
      , r;

    if (args.length == 1 && typeof args[0] == 'object' || args[0] === undefined) {
      args.unshift('init');
    }

    method = args.shift();
    if (method == 'init') {
      uploader = new Uploader();
      args.unshift(this);
      this.data('transloadit.uploader', uploader);
    } else {
      uploader = this.data('transloadit.uploader');
    }

    if (!uploader) {
      throw new Error('Element is not initialized for transloadit!');
    }

    r = uploader[method].apply(uploader, args);
    return (r === undefined)
      ? this
      : r;
  };

  function Uploader() {
    this.assemblyId = null;

    this.instance = null;
    this.documentTitle = null;
    this.timer = null;
    this._options = {};
    this.uploads = [];
    this.results = {};
    this.ended = null;
    this.pollStarted = null;
    this.pollRetries = 0;
    this.seq = 0;
    this.started = false;
    this.assembly = null;
    this.params = null;

    this.bytesReceivedBefore = 0;
    this.lastPoll = 0;

    this.$params = null;
    this.$form = null;
    this.$files = null;
    this.$fileClones = null;
    this.$iframe = null;
    this.$modal = null;
  }

  Uploader.prototype.init = function($form, options) {
    this.$form = $form;
    this.options($.extend({}, OPTIONS, options || {}));

    var self = this;
    $form.bind('submit.transloadit', function() {
      self.getBoredInstance();
      return false;
    });

    this.includeCss();
  };

  Uploader.prototype.getBoredInstance = function() {
    var self = this;

    this.instance = null;

    $.jsonp({
      url: this._options['service']+'instances/bored',
      timeout: self._options.pollTimeout,
      callbackParameter: 'callback',
      success: function(instance) {
        if (instance.error) {
          self.ended = true;
          self.renderError(instance);
          self._options.onError(instance);
          return;
        }

        self.instance = instance.api2_host;
        self.start();
      },
      error: function(xhr, status) {
        self.ended = true;
        var err =
          { error: 'CONNECTION_ERROR'
          , message: 'There was a problem connecting to the upload server'
          , reason: 'JSONP request status: '+status
          };
        self.renderError(err);
        self._options.onError(err);
      }
    });

    if (this._options.modal) {
      this.showModal();
    }
  };

  Uploader.prototype.start = function() {
    var self = this;

    this.started = false;
    this.ended = false;
    this.bytesReceivedBefore = 0;
    this.pollRetries = 0;
    this.seq = 0;
    this.uploads = [];
    this.results = {};

    this.assemblyId = this.uuid();

    var $params = this.$form.find('input[name=params]');
    if (!$params.length) {
      alert('Could not find input[name=params] in your form.');
      return;
    }

    try {
      this.params = JSON.parse($params.val());
    } catch (e) {
      alert('Error: input[name=params] seems to contain invalid JSON.');
      return;
    }

    if (this.params.redirect_url) {
      this.$form.attr('action', this.params.redirect_url);
    } else if (this._options.autoSubmit && (this.$form.attr('action') == this._options.service+'assemblies')) {
      alert('Error: input[name=params] does not include a redirect_url');
      return;
    }

    this.$files = this.$form
      .find('input[type=file]')
      .not(this._options.exclude);

    self.$fileClones = $().not(document);
    this.$files.each(function() {
      var $clone = $(this).clone(true);
      self.$fileClones = self.$fileClones.add($clone);
      $clone.insertAfter(this);
    });

    this.$iframe = $('<iframe id="transloadit-'+this.assemblyId+'" name="transloadit-'+this.assemblyId+'"/>')
      .appendTo('body')
      .hide();

    this.$uploadForm = $('<form enctype="multipart/form-data" />')
      .attr('action', PROTOCOL+this.instance+'/assemblies/'+this.assemblyId+'?redirect=false')
      .attr('target', 'transloadit-' + this.assemblyId)
      .attr('method', 'POST')
      .append(this.$files)
      .appendTo('body')
      .hide();

    var fieldsFilter = '[name=params], [name=signature]';
    if (this._options.fields === true) {
      fieldsFilter = '*';
    } else if (typeof this._options.fields == 'string') {
      fieldsFilter += ', '+this._options.fields;
    }

    this.$form
      .find(':input[type!=file]')
      .filter(fieldsFilter)
      .clone()
      .prependTo(this.$uploadForm);

    this.$params = $params;

    this.$uploadForm.submit();
    this.lastPoll = +new Date;
    setTimeout(function() {
      self._poll();
    }, 300);
  };

  Uploader.prototype._poll = function(query) {
    var self = this;
    if (this.ended) {
      return;
    }

    // Reduce Firefox Title Flickering
    if ($.browser['mozilla'] && !this.documentTitle) {
      this.documentTitle = document.title;
      document.title = 'Loading...';
    }

    this.pollStarted = +new Date();

    $.jsonp({
      url: PROTOCOL+this.instance+'/assemblies/'+this.assemblyId+(query || '?seq='+this.seq),
      timeout: self._options.pollTimeout,
      callbackParameter: 'callback',
      success: function(assembly) {
        if (self.ended) {
          return;
        }

        self.assembly = assembly;
        if (assembly.error == 'ASSEMBLY_NOT_FOUND') {
          self.pollRetries++;

          if (self.pollRetries > self._options.poll404Retries) {
            document.title = self.documentTitle;
            self.ended = true;
            self.renderError(assembly);
            self._options.onError(assembly);
            return;
          }

          setTimeout(function() {
            self._poll();
          }, 400);
          return;
        } else if (assembly.error) {
          self.ended = true;
          self.renderError(assembly);
          document.title = self.documentTitle;
          self._options.onError(assembly);
          return;
        }

        self.seq = assembly.last_seq;

        if (!self.started) {
          self.started = true;
          self._options.onStart(assembly);
        }

        self.pollRetries = 0;
        var isUploading = (assembly.ok == 'ASSEMBLY_UPLOADING')
          , isExecuting = (assembly.ok == 'ASSEMBLY_EXECUTING')
          , isCanceled = (assembly.ok == 'ASSEMBLY_CANCELED')
          , isComplete = (assembly.ok == 'ASSEMBLY_COMPLETED');

        self._options.onProgress(assembly.bytes_received, assembly.bytes_expected, assembly);

        for (var i = 0; i < assembly.uploads.length; i++) {
          self._options.onUpload(assembly.uploads[i], assembly);
          self.uploads.push(assembly.uploads[i]);
        }

        for (var step in assembly.results) {
          self.results[step] = self.results[step] || [];
          for (var i = 0; i < assembly.results[step].length; i++) {
            self._options.onResult(step, assembly.results[step][i], assembly);
            self.results[step].push(assembly.results[step][i]);
          }
        }

        if (isCanceled) {
          self.ended = true;
          document.title = self.documentTitle;
          self._options.onCancel(assembly);
          return;
        }

        self.renderProgress(assembly);

        if (isComplete || (!self._options['wait'] && isExecuting)) {
          self.ended = true;
          document.title = self.documentTitle;
          assembly.uploads = self.uploads;
          assembly.results = self.results;
          self._options.onSuccess(assembly);
          if (self._options.modal) {
            self.cancel();
          }

          if (self._options.autoSubmit) {
            self.submitForm();
          }
          return;
        }

        var ping = (self.pollStarted - +new Date)
          , timeout = (ping < self._options.interval)
            ? self._options.interval
            : ping;

        self.timer = setTimeout(function() {
          self._poll();
        }, timeout);
        self.lastPoll = +new Date;
      },
      error: function(xhr, status) {
        if (self.ended) {
          return;
        }

        self.pollRetries++;
        if (self.pollRetries > self._options.pollConnectionRetries) {
          document.title = self.documentTitle;
          self.ended = true;
          var err =
            { error: 'CONNECTION_ERROR'
            , message: 'There was a problem connecting to the upload server'
            , reason: 'JSONP request status: '+status
            };
          self.renderError(err);
          self._options.onError(err);
          return;
        }

        setTimeout(function() {
          self._poll();
        }, 350);
      }
    });
  };

  Uploader.prototype.stop = function() {
    document.title = this.documentTitle;
    this.ended = true;
  };


  Uploader.prototype.cancel = function() {
    // @todo this has still a race condition if a new upload is started
    // while a the cancel request is still being executed. Shouldn't happen
    // in real life, but needs fixing.

    if (!this.ended) {
      var self = this;
      this.$params.prependTo(this.$form);
      this.$fileClones.each(function(i) {
        var $original = $(self.$files[i]), $clone = $(this);
        $original.insertAfter($clone);
        $clone.remove();
      });
      clearTimeout(self.timer);

      this._poll('?method=delete');

      if (navigator.appName == 'Microsoft Internet Explorer') {
        this.$iframe[0].contentWindow.document.execCommand('Stop');
      }

      setTimeout(function() {
        self.$iframe.remove();
      }, 500);
    }

    if (!this._options.modal) {
      return;
    }

    $.mask.close();
    this.$modal.remove();
  };

  Uploader.prototype.submitForm = function() {
    this.$fileClones.remove();

    $('<textarea/>')
      .attr('name', 'transloadit')
      .text(JSON.stringify(this.assembly))
      .prependTo(this.$form)
      .hide();

    this.$form
      .unbind('submit.transloadit')
      .submit();
  };

  Uploader.prototype.showModal = function() {
    this.$modal =
      $('<div id="transloadit">'+
        '<div class="content">'+
          '<a href="#close" class="close"></a>'+
          '<p class="status"></p>'+
          '<div class="progress"><label>starting upload ...</label><span></span></div>'+
          '<p class="error"></p>'+
        '</div>'+
      '</div>')
      .appendTo('body');

    $.extend
      ( this.$modal
      , { '$status': this.$modal.find('.status')
        , '$content': this.$modal.find('.content')
        , '$close': this.$modal.find('.close')
        , '$label': this.$modal.find('label')
        , '$progress': this.$modal.find('.progress')
        , '$progressSpan': this.$modal.find('.progress span')
        , '$error': this.$modal.find('.error')
        }
      );

    var self = this;
    this.$modal.$close.click(function() {
      self.cancel();
    });

    this.$modal.$error.hide();

    var self = this
      , expose =
          this.$modal.expose
          ( { api: true
            , maskId: 'transloadit_expose'
            , opacity: 0.9
            , loadSpeed: 250
            , closeOnEsc: false
            , closeOnClick: false
            }
          ).load();

    this.$modal.$close.click(function() {
      self.cancel();
      return false;
    });
  };

  Uploader.prototype.renderError = function(assembly) {
    if (!this._options.modal) {
      return;
    }

    this.$modal.$content.addClass('content-error');
    this.$modal.$progress.hide();

    var text = (this._options.debug)
      ? assembly.error+': '+assembly.message+'<br><br>'+(assembly.reason || '')
      : 'There was an internal error, please try your upload again.';

    this.$modal.$error
      .html(text)
      .show();
  };

  Uploader.prototype.renderProgress = function(assembly) {
    if (!this._options.modal) {
      return;
    }

    var progress = assembly.bytes_received / assembly.bytes_expected
      , bytesReceived = assembly.bytes_received - this.bytesReceivedBefore
      , timeSinceLastPoll = (+new Date - this.lastPoll)
      , duration = (progress == 1)
        ? 1000
        : this._options.interval * 2
      , text = (progress == 1)
        ? 'processing ...'
        :   (assembly.bytes_received / 1024 / 1024).toFixed(2)+' MB / '
          + (assembly.bytes_expected / 1024 / 1024).toFixed(2)+' MB '
          + '('+((bytesReceived / 1024) / (timeSinceLastPoll / 1000)).toFixed(1)+' kB / sec)';

    this.bytesReceivedBefore = assembly.bytes_received;
    this.$modal.$label.text(text);

    this.$modal.$progressSpan
      .stop()
      .animate({width: (progress * 100)+'%'}, duration, 'easeOutCubic');
  };

  Uploader.prototype.includeCss = function() {
    if (CSS_LOADED || (!this._options.modal)) {
      return;
    }

    CSS_LOADED = true;
    $('<link rel="stylesheet" type="text/css" href="'+this._options.assets+'css/transloadit2.css" />')
      .appendTo('head');
  };

  Uploader.prototype.uuid = function() {
    var uuid = '', i;
    for (i = 0; i < 32; i++) {
      uuid += Math.floor(Math.random() * 16).toString(16);
    }
    return uuid;
  };

  Uploader.prototype.options = function(options) {
    if (arguments.length == 0) {
      return this._options;
    }

    $.extend(this._options, options);
  };

  Uploader.prototype.option = function(key, val) {
    if (arguments.length == 1) {
      return this._options[key];
    }

    this._options[key] = val;
  };
})(jQuery);
