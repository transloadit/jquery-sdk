(function($) {
  var PROTOCOL = (document.location.protocol == 'https:')
      ? 'https://'
      : 'http://'
    , OPTIONS =
      { service: PROTOCOL+'api2.transloadit.com/'
      , assets: PROTOCOL+'assets.transloadit/'
      , onStart: function() {}
      , onProgress: function() {}
      , onCancel: function() {}
      , onError: function() {}
      , onSuccess: function() {}
      , interval: 2500
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
      , upload
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

    this.documentTitle = null;
    this.timer = null;
    this._options = {};
    this.ended = null;
    this.pollStarted = null;
    this.pollRetries = 0;
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
      self.start();
      return false;
    });

    this.includeCss();
  };

  Uploader.prototype.start = function() {
    var self = this;
  
    this.ended = false;
    this.bytesReceivedBefore = 0;
    this.pollRetries = 0;

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
      alert('Error: input[name=params] does not include a redirect_url')
      return;
    }

    this.$files = this.$form
      .find('input[type=file]')
      .not(this._options.exclude);

    self.$fileClones = $().not(document);
    this.$files.each(function() {
      var $clone = $(this).clone();
      self.$fileClones = self.$fileClones.add($clone);
      $clone.insertAfter(this);
    });

    this.$iframe = $('<iframe id="transloadit-'+this.assemblyId+'" name="transloadit-'+this.assemblyId+'"/>')
      .appendTo('body')
      .hide();

    this.$uploadForm = $('<form enctype="multipart/form-data" />')
      .attr('action', this._options['service']+'assemblies/'+this.assemblyId+'?redirect=false')
      .attr('target', 'transloadit-' + this.assemblyId)
      .attr('method', 'POST')
      .append(this.$files)
      .appendTo('body')
      .hide();

    var fieldsFilter = '[name=params], [name=signature]';
    if (this._options.fields === true) {
      fieldsFilter = '*'
    } else if (typeof this._options.fields == 'string') {
      fieldsFilter += ', '+this._options.fields;
    }

    this.$form
      .find('input[type!=file]')
      .filter(fieldsFilter)
      .clone()
      .prependTo(this.$uploadForm);

    this.$params = $params;

    this.$uploadForm.submit();
    this.lastPoll = +new Date;
    setTimeout(function() {
      self._poll();
    }, 300);

    if (this._options.modal) {
      this.showModal();
    }
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
      url: this._options['service']+'assemblies/'+this.assemblyId+(query || ''),
      timeout: 6000,
      callbackParameter: 'callback',
      success: function(assembly) {
        if (self.ended) {
          return;
        }

        self.assembly = assembly;
        if (assembly.error == 'ASSEMBLY_NOT_FOUND') {
          self.pollRetries++;
          if (self.pollRetries > 5) {
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

        if (!self.started) {
          self.started = true;
          self._options.onStart(assembly);
        }

        self.pollRetries = 0;
        var isUploading = (assembly.ok == 'ASSEMBLY_UPLOADING')
          , isExecuting = (assembly.ok == 'ASSEMBLY_EXECUTING')
          , isCanceled = (assembly.ok == 'ASSEMBLY_CANCELED')
          , isComplete = (assembly.ok == 'ASSEMBLY_COMPLETED');

        self._options.onProgress(assembly.bytes_received, assembly.bytes_expected);

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
        if (self.pollRetries > 3) {
          document.title = self.documentTitle;
          self.ended = true
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

      this.$iframe[0].contentWindow.stop();
      setTimeout(function() {
        self.$iframe.remove();
      }, 500);
    }

    if (!this._options.modal) {
      return;
    }

    this.$modal.expose.close();
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

    this.$modal.expose = expose;

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
    var uuid = '';
    for (i = 0; i < 32; i++) {
      uuid += Math.floor(Math.random() * 16).toString(16);
    }
    return uuid;
  }

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

// jquery.jsonp 1.1.2 (c)2010 Julian Aubourg | MIT License
// http://code.google.com/p/jquery-jsonp/
(function(d){var b=function(n){return n!==undefined&&n!==null},m=function(p,n,o){b(p)&&p.apply(n,o)},e=function(n){setTimeout(n,0)},f="",a="&",k="?",l="success",g="error",i=d("head"),h={},c={callback:"C",url:location.href},j=function(s){s=d.extend({},c,s);var r=s.beforeSend,A=0;s.abort=function(){A=1};if(b(r)&&(r(s,s)===false||A)){return s}var q=s.success,o=s.complete,v=s.error,C=s.dataFilter,G=s.callbackParameter,w=s.callback,D=s.cache,n=s.pageCache,t=s.url,I=s.data,x=s.timeout,z,H,F,E;t=b(t)?t:f;I=b(I)?((typeof I)=="string"?I:d.param(I)):f;b(G)&&(I+=(I==f?f:a)+escape(G)+"=?");!D&&!n&&(I+=(I==f?f:a)+"_"+(new Date()).getTime()+"=");z=t.split(k);if(I!=f){H=I.split(k);E=z.length-1;E&&(z[E]+=a+H.shift());z=z.concat(H)}F=z.length-2;F>0&&(z[F]+=w+z.pop());var p=z.join(k),B=function(J){b(C)&&(J=C.apply(s,[J]));m(q,s,[J,l]);m(o,s,[s,l])},y=function(J){m(v,s,[s,J]);m(o,s,[s,J])},u=h[p];if(n&&b(u)){e(function(){b(u.s)?B(u.s):y(g)});return s}e(function(){if(A){return}var J=d("<iframe />").appendTo(i),L=J[0],N=L.contentWindow||L.contentDocument,P=N.document,K,Q,R=function(S,T){n&&!b(T)&&(h[p]=f);K();y(b(T)?T:g)},M=function(T){N[T]=undefined;try{delete N[T]}catch(S){}},O=w=="E"?"X":"E";if(!b(P)){P=N;N=P.getParentNode()}P.open();N[w]=function(S){A=1;n&&(h[p]={s:S});e(function(){K();B(S)})};N[O]=function(S){(!S||S=="complete")&&!A++&&e(R)};s.abort=K=function(){clearTimeout(Q);P.open();M(O);M(w);P.write(f);P.close();J.remove()};P.write(['<html><head><script src="',p,'" onload="',O,'()" onreadystatechange="',O,'(this.readyState)"><\/script></head><body onload="',O,'()"></body></html>'].join(f));P.close();x>0&&(Q=setTimeout(function(){!A&&R(f,"timeout")},x))});return s};j.setup=function(n){d.extend(c,n)};d.jsonp=j})(jQuery);

/*
 * tools.expose 1.0.5 - Make HTML elements stand out
 * 
 * Copyright (c) 2009 Tero Piirainen
 * http://flowplayer.org/tools/expose.html
 *
 * Dual licensed under MIT and GPL 2+ licenses
 * http://www.opensource.org/licenses
 *
 * Launch  : June 2008
 * Date: ${date}
 * Revision: ${revision} 
 */
(function(b){b.tools=b.tools||{};b.tools.expose={version:"1.0.5",conf:{maskId:null,loadSpeed:"slow",closeSpeed:"fast",closeOnClick:true,closeOnEsc:true,zIndex:9998,opacity:0.8,color:"#456",api:false}};function a(){if(b.browser.msie){var f=b(document).height(),e=b(window).height();return[window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth,f-e<20?e:f]}return[b(window).width(),b(document).height()]}function c(h,g){var e=this,j=b(this),d=null,f=false,i=0;b.each(g,function(k,l){if(b.isFunction(l)){j.bind(k,l)}});b(window).resize(function(){e.fit()});b.extend(this,{getMask:function(){return d},getExposed:function(){return h},getConf:function(){return g},isLoaded:function(){return f},load:function(n){if(f){return e}i=h.eq(0).css("zIndex");if(g.maskId){d=b("#"+g.maskId)}if(!d||!d.length){var l=a();d=b("<div/>").css({position:"absolute",top:0,left:0,width:l[0],height:l[1],display:"none",opacity:0,zIndex:g.zIndex});if(g.maskId){d.attr("id",g.maskId)}b("body").append(d);var k=d.css("backgroundColor");if(!k||k=="transparent"||k=="rgba(0, 0, 0, 0)"){d.css("backgroundColor",g.color)}if(g.closeOnEsc){b(document).bind("keydown.unexpose",function(o){if(o.keyCode==27){e.close()}})}if(g.closeOnClick){d.bind("click.unexpose",function(o){e.close(o)})}}n=n||b.Event();n.type="onBeforeLoad";j.trigger(n);if(n.isDefaultPrevented()){return e}b.each(h,function(){var o=b(this);if(!/relative|absolute|fixed/i.test(o.css("position"))){o.css("position","relative")}});h.css({zIndex:Math.max(g.zIndex+1,i=="auto"?0:i)});var m=d.height();if(!this.isLoaded()){d.css({opacity:0,display:"block"}).fadeTo(g.loadSpeed,g.opacity,function(){if(d.height()!=m){d.css("height",m)}n.type="onLoad";j.trigger(n)})}f=true;return e},close:function(k){if(!f){return e}k=k||b.Event();k.type="onBeforeClose";j.trigger(k);if(k.isDefaultPrevented()){return e}d.fadeOut(g.closeSpeed,function(){k.type="onClose";j.trigger(k);h.css({zIndex:b.browser.msie?i:null})});f=false;return e},fit:function(){if(d){var k=a();d.css({width:k[0],height:k[1]})}},bind:function(k,l){j.bind(k,l);return e},unbind:function(k){j.unbind(k);return e}});b.each("onBeforeLoad,onLoad,onBeforeClose,onClose".split(","),function(k,l){e[l]=function(m){return e.bind(l,m)}})}b.fn.expose=function(d){var e=this.eq(typeof d=="number"?d:0).data("expose");if(e){return e}if(typeof d=="string"){d={color:d}}var f=b.extend({},b.tools.expose.conf);d=b.extend(f,d);this.each(function(){e=new c(b(this),d);b(this).data("expose",e)});return d.api?e:this}})(jQuery);

/*
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 * Uses the built in easing capabilities added In jQuery 1.1
 * to offer multiple easing options
 *
 * TERMS OF USE - jQuery Easing
 * 
 * Open source under the BSD License. 
 * 
 * Copyright Â© 2008 George McGinley Smith
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
*/

// t: current time, b: begInnIng value, c: change In value, d: duration
jQuery.easing['jswing']=jQuery.easing['swing'];jQuery.extend(jQuery.easing,{def:'easeOutQuad',swing:function(x,t,b,c,d){return jQuery.easing[jQuery.easing.def](x,t,b,c,d);},easeInQuad:function(x,t,b,c,d){return c*(t/=d)*t+b;},easeOutQuad:function(x,t,b,c,d){return-c*(t/=d)*(t-2)+b;},easeInOutQuad:function(x,t,b,c,d){if((t/=d/2)<1)return c/2*t*t+b;return-c/2*((--t)*(t-2)-1)+b;},easeInCubic:function(x,t,b,c,d){return c*(t/=d)*t*t+b;},easeOutCubic:function(x,t,b,c,d){return c*((t=t/d-1)*t*t+1)+b;},easeInOutCubic:function(x,t,b,c,d){if((t/=d/2)<1)return c/2*t*t*t+b;return c/2*((t-=2)*t*t+2)+b;},easeInQuart:function(x,t,b,c,d){return c*(t/=d)*t*t*t+b;},easeOutQuart:function(x,t,b,c,d){return-c*((t=t/d-1)*t*t*t-1)+b;},easeInOutQuart:function(x,t,b,c,d){if((t/=d/2)<1)return c/2*t*t*t*t+b;return-c/2*((t-=2)*t*t*t-2)+b;},easeInQuint:function(x,t,b,c,d){return c*(t/=d)*t*t*t*t+b;},easeOutQuint:function(x,t,b,c,d){return c*((t=t/d-1)*t*t*t*t+1)+b;},easeInOutQuint:function(x,t,b,c,d){if((t/=d/2)<1)return c/2*t*t*t*t*t+b;return c/2*((t-=2)*t*t*t*t+2)+b;},easeInSine:function(x,t,b,c,d){return-c*Math.cos(t/d*(Math.PI/2))+c+b;},easeOutSine:function(x,t,b,c,d){return c*Math.sin(t/d*(Math.PI/2))+b;},easeInOutSine:function(x,t,b,c,d){return-c/2*(Math.cos(Math.PI*t/d)-1)+b;},easeInExpo:function(x,t,b,c,d){return(t==0)?b:c*Math.pow(2,10*(t/d-1))+b;},easeOutExpo:function(x,t,b,c,d){return(t==d)?b+c:c*(-Math.pow(2,-10*t/d)+1)+b;},easeInOutExpo:function(x,t,b,c,d){if(t==0)return b;if(t==d)return b+c;if((t/=d/2)<1)return c/2*Math.pow(2,10*(t-1))+b;return c/2*(-Math.pow(2,-10*--t)+2)+b;},easeInCirc:function(x,t,b,c,d){return-c*(Math.sqrt(1-(t/=d)*t)-1)+b;},easeOutCirc:function(x,t,b,c,d){return c*Math.sqrt(1-(t=t/d-1)*t)+b;},easeInOutCirc:function(x,t,b,c,d){if((t/=d/2)<1)return-c/2*(Math.sqrt(1-t*t)-1)+b;return c/2*(Math.sqrt(1-(t-=2)*t)+1)+b;},easeInElastic:function(x,t,b,c,d){var s=1.70158;var p=0;var a=c;if(t==0)return b;if((t/=d)==1)return b+c;if(!p)p=d*.3;if(a<Math.abs(c)){a=c;var s=p/4;}
else var s=p/(2*Math.PI)*Math.asin(c/a);return-(a*Math.pow(2,10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p))+b;},easeOutElastic:function(x,t,b,c,d){var s=1.70158;var p=0;var a=c;if(t==0)return b;if((t/=d)==1)return b+c;if(!p)p=d*.3;if(a<Math.abs(c)){a=c;var s=p/4;}
else var s=p/(2*Math.PI)*Math.asin(c/a);return a*Math.pow(2,-10*t)*Math.sin((t*d-s)*(2*Math.PI)/p)+c+b;},easeInOutElastic:function(x,t,b,c,d){var s=1.70158;var p=0;var a=c;if(t==0)return b;if((t/=d/2)==2)return b+c;if(!p)p=d*(.3*1.5);if(a<Math.abs(c)){a=c;var s=p/4;}
else var s=p/(2*Math.PI)*Math.asin(c/a);if(t<1)return-.5*(a*Math.pow(2,10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p))+b;return a*Math.pow(2,-10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p)*.5+c+b;},easeInBack:function(x,t,b,c,d,s){if(s==undefined)s=1.70158;return c*(t/=d)*t*((s+1)*t-s)+b;},easeOutBack:function(x,t,b,c,d,s){if(s==undefined)s=1.70158;return c*((t=t/d-1)*t*((s+1)*t+s)+1)+b;},easeInOutBack:function(x,t,b,c,d,s){if(s==undefined)s=1.70158;if((t/=d/2)<1)return c/2*(t*t*(((s*=(1.525))+1)*t-s))+b;return c/2*((t-=2)*t*(((s*=(1.525))+1)*t+s)+2)+b;},easeInBounce:function(x,t,b,c,d){return c-jQuery.easing.easeOutBounce(x,d-t,0,c,d)+b;},easeOutBounce:function(x,t,b,c,d){if((t/=d)<(1/2.75)){return c*(7.5625*t*t)+b;}else if(t<(2/2.75)){return c*(7.5625*(t-=(1.5/2.75))*t+.75)+b;}else if(t<(2.5/2.75)){return c*(7.5625*(t-=(2.25/2.75))*t+.9375)+b;}else{return c*(7.5625*(t-=(2.625/2.75))*t+.984375)+b;}},easeInOutBounce:function(x,t,b,c,d){if(t<d/2)return jQuery.easing.easeInBounce(x,t*2,0,c,d)*.5+b;return jQuery.easing.easeOutBounce(x,t*2-d,0,c,d)*.5+c*.5+b;}});

/*
    http://www.JSON.org/json2.js
    2009-08-17

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html
*/
if(!this.JSON){this.JSON={};}
(function(){function f(n){return n<10?'0'+n:n;}
if(typeof Date.prototype.toJSON!=='function'){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+'-'+
f(this.getUTCMonth()+1)+'-'+
f(this.getUTCDate())+'T'+
f(this.getUTCHours())+':'+
f(this.getUTCMinutes())+':'+
f(this.getUTCSeconds())+'Z':null;};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf();};}
var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==='string'?c:'\\u'+('0000'+a.charCodeAt(0).toString(16)).slice(-4);})+'"':'"'+string+'"';}
function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==='object'&&typeof value.toJSON==='function'){value=value.toJSON(key);}
if(typeof rep==='function'){value=rep.call(holder,key,value);}
switch(typeof value){case'string':return quote(value);case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==='[object Array]'){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||'null';}
v=partial.length===0?'[]':gap?'[\n'+gap+
partial.join(',\n'+gap)+'\n'+
mind+']':'['+partial.join(',')+']';gap=mind;return v;}
if(rep&&typeof rep==='object'){length=rep.length;for(i=0;i<length;i+=1){k=rep[i];if(typeof k==='string'){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}else{for(k in value){if(Object.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}
v=partial.length===0?'{}':gap?'{\n'+gap+partial.join(',\n'+gap)+'\n'+
mind+'}':'{'+partial.join(',')+'}';gap=mind;return v;}}
if(typeof JSON.stringify!=='function'){JSON.stringify=function(value,replacer,space){var i;gap='';indent='';if(typeof space==='number'){for(i=0;i<space;i+=1){indent+=' ';}}else if(typeof space==='string'){indent=space;}
rep=replacer;if(replacer&&typeof replacer!=='function'&&(typeof replacer!=='object'||typeof replacer.length!=='number')){throw new Error('JSON.stringify');}
return str('',{'':value});};}
if(typeof JSON.parse!=='function'){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==='object'){for(k in value){if(Object.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v;}else{delete value[k];}}}}
return reviver.call(holder,key,value);}
cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return'\\u'+
('0000'+a.charCodeAt(0).toString(16)).slice(-4);});}
if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof reviver==='function'?walk({'':j},''):j;}
throw new SyntaxError('JSON.parse');};}}());