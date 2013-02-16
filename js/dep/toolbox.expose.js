/** @license jQuery Tools 1.2.3: Tero Piirainen | Public domain
*/

/**
 * jQuery Tools 1.2.3 / Expose - Dim the lights
 *
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 *
 * http://flowplayer.org/tools/toolbox/expose.html
 *
 * Since: Mar 2010
 * Date:    Mon Jun 7 13:43:53 2010 +0000
 */

/**
 * This version is by @pekeler as proposed in https://gist.github.com/pekeler/4965712
 * and discussed in https://github.com/transloadit/jquery-sdk/issues/13#issuecomment-13645153
 *
 * https://github.com/jquerytools/jquerytools/blob/master/src/toolbox/toolbox.expose.js
 * simplified, minimally tested in Safari 6.0.2, FF 18.0.2, Chrome 24.0.1312.57,
 * IE9, IE8, IE7. Works with jQuery 1.9
 */

(function($) {
	$.tools = $.tools || {version: '2013-02-15'};
	var tool = $.tools.expose = {
		conf: {
			maskId: 'exposeMask',
			loadSpeed: 'slow',
			closeSpeed: 'fast',
			zIndex: 9998,
			opacity: 0.8,
			startOpacity: 0,
			color: '#fff'
		}
	};
	var mask, exposed, loaded, config, overlayIndex;
	$.mask = {
		load: function(conf, els) {
			if (loaded) { return this; }
			conf = conf || config;
			config = conf = $.extend($.extend({}, tool.conf), conf);
			mask = $("#" + conf.maskId);
			if (!mask.length) {
				mask = $('<div/>').attr("id", conf.maskId);
				$("body").append(mask);
			}
			mask.css({
				position: 'fixed',
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				display: 'none',
				opacity: conf.startOpacity,
				zIndex: conf.zIndex,
				backgroundColor: conf.color
			});
			if (els && els.length) {
				overlayIndex = els.eq(0).css("zIndex");
				exposed = els.css({ zIndex: Math.max(conf.zIndex + 1, overlayIndex == 'auto' ? 0 : overlayIndex)});
			}
			mask.css({display: 'block'}).fadeTo(conf.loadSpeed, conf.opacity);
			loaded = true;
			return this;
		},
		close: function() {
			if (loaded) {
				mask.fadeOut(config.closeSpeed, function() {
					if (exposed) {
						exposed.css({zIndex: overlayIndex});
					}
				});
				loaded = false;
			}
			return this;
		}
	};
	$.fn.mask = function(conf) {
		$.mask.load(conf);
		return this;
	};
	$.fn.expose = function(conf) {
		$.mask.load(conf, this);
		return this;
	};
})(jQuery);