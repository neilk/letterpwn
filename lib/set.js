module.exports = {

  /**
   * Take string, return canonical sorted array of characters
   * @param {String} letters
   * @return {String} canonically sorted letters
   */
  getCanonical: function(s) {
    var arr = [];
    if (typeof s === 'string') {
      s = s.replace(/\W/g, '');
      for (var i = 0; i < s.length; i += 1) {
        arr.push(s[i]);
      }
    }
    return arr.sort().join('');
  },

  /**
   * Given two canonically sorted strings, determine if 2nd is subset of 1st
   * @param {String} iStr set to search
   * @param {String} jStr subset to find
   * @return {Boolean}
   */
  isSubset: function(iStr, jStr) {
    for (var i = 0,
             j = 0,
             iLength = iStr.length,
             jLength = jStr.length;
         i < iLength && j < jLength;
         i++ ) {
      var ic = iStr.substr(i, 1), jc = jStr.substr(j, 1);
      if (ic === jc) {
        j++;
      } else if (ic > jc) {
        break;
      }
    }
    return j == jLength;
  }

};


