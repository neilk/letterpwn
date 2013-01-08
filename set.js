module.exports = {

  /**
   * Take string, return canonical sorted array of characters
   * @param {String} letters
   * @return {Array} of single character strings
   */
  getCanonical: function(s) {
    var arr = [];
    if (typeof s === 'string') {
      s = s.replace(/\W/g, '');
      for (var i = 0; i < s.length; i += 1) {
        arr.push(s[i]);
      }
    }
    return arr.sort();
  },

  /**
   * Given two sorted arrays of chars, determine if 2nd is subset of 1st
   * @param {Array} of chars
   * @param {Array} of chars
   * @return {Boolean}
   */
  isSubset: function(set, sub) {
    for (var setI = 0, subI = 0; setI < set.length && subI < sub.length; setI += 1) {
      if (set[setI] === sub[subI]) {
        subI++;
      }
    }
    return subI == sub.length;
  }

};


