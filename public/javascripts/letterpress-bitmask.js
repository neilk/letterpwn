(function(exports) {

  // Pairs of board position to adjacent positions, as bitmasks from bits 0-24
  var adjacent = exports.adjacent = [
    [ 1, 34 ],
    [ 2, 69 ],
    [ 4, 138 ],
    [ 8, 276 ],
    [ 16, 520 ],
    [ 32, 1089 ],
    [ 64, 2210 ],
    [ 128, 4420 ],
    [ 256, 8840 ],
    [ 512, 16656 ],
    [ 1024, 34848 ],
    [ 2048, 70720 ],
    [ 4096, 141440 ],
    [ 8192, 282880 ],
    [ 16384, 532992 ],
    [ 32768, 1115136 ],
    [ 65536, 2263040 ],
    [ 131072, 4526080 ],
    [ 262144, 9052160 ],
    [ 524288, 17055744 ],
    [ 1048576, 2129920 ],
    [ 2097152, 5308416 ],
    [ 4194304, 10616832 ],
    [ 8388608, 21233664 ],
    [ 16777216, 8912896 ]
  ];

  /**
   * Figure out how many squares are protected
   * For now, we do not consider other moves on the board, only this one in isolation.
   *
   * We calculate it simply. the 'adjacent' library has a bitmask of all adjacent positions
   * for every position. For each position, we check if this position and all adjacent positions
   * are taken in this move.
   *
   * @param {Number} bitMask
   * @return {Number} bitmask of protected positions
   */
  exports.getProtectedBitMask = function(bitMask) {
    var protectedBitMask = 0;
    exports.adjacent.forEach(function(a) {
      if (((a[0] | a[1]) & bitMask) == (a[0] | a[1])) {
        protectedBitMask |= a[0];
      }
    });
    return protectedBitMask;
  };

})(typeof exports === 'undefined' ? this['lpBitMask']={} : exports);
