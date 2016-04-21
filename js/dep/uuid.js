var uuid = {
  _clockseq: 0,
  _lastNSecs: 0,
  _lastMSecs: 0,

  generate: function() {
    var i = 0;
    var b = [];

    var _rnds = new Array(16);
    var _rng = function() {
      for (var j = 0, r; j < 16; j++) {
        if ((j & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[j] = r >>> ((j & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
    var _seedBytes = _rng();

    var _nodeId = [
      _seedBytes[0] | 0x01,
      _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
    ];

    this._clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;
    var clockseq = this._clockseq;

    var _byteToHex = [];
    var _hexToByte = {};
    for (var j = 0; j < 256; j++) {
      _byteToHex[j] = (j + 0x100).toString(16).substr(1);
      _hexToByte[_byteToHex[j]] = j;
    }

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = this._lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - this._lastMSecs) + (nsecs - this._lastNSecs) / 10000;

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    this._lastMSecs = msecs;
    this._lastNSecs = nsecs;
    this._clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = _nodeId;

    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    function unparse(_buf, offset) {
      var i = offset || 0, bth = _byteToHex;

      return bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]];
    }

    return unparse(b);
  }
};

module.exports = uuid;
