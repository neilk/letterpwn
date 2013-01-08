
/**
 * Take string, return canonical sorted array of characters
 * @param {String} letters
 * @return {Array} of single character strings
 */
function canonicalize(s) {
  var arr = [];
  if (typeof s === 'string') {
    s = s.replace(/\W/g, '');
    for (var i = 0; i < s.length; i += 1) {
      arr.push(s[i]);
    }
  }
  return arr.sort();
}

module.exports = canonicalize;
