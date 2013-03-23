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
   * @param {String} set set to search
   * @param {String} sub subset to find
   * @return {Boolean}
   */
  isSubset: function(set, sub) {
    for (var setI = 0, subI = 0; setI < set.length && subI < sub.length; setI += 1) {
      if (set.substr(setI, 1) === sub.substr(subI, 1)) {
        subI++;
      }
    }
    return subI == sub.length;
  }

};


