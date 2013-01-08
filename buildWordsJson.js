/**
 * Read a line-oriented tab separated file on STDIN,
 *    consisting of words and an integer representing their frequency
 * Write a JSON file to STDOUT in a format useable by letterpress.js
 *  (see the convert function for details)
 *
 *  e.g.
 *  $ node buildWordsJson.js < words-freq-sorted-log.txt  > words.json
 */

var
  canonicalize = require('canonicalize'),
  lazy = require('lazy');

/**
 * Initializes canonical words data structure from disk, calls callback
 * with this data structure.
 * Creates an array of 'word structs', an array of arrays where each element is of the form
 *   [ word, canonical-word, frequency ]
 *      word is simply the word, as a string
 *      canonical-word is the word unpacked into a sorted array of characters, good for instant subset comparisons
 *      frequency is an integer from 1-24 expressing how common this word is. 1=very rare, 24=very common. Log scale.
 * @param {stream} stream probably STDIN
 * @param {Function} next callback
 */
function convert(stream, next) {
  lazy(stream)
    .lines
    .map( function(line) {
      var wordFreq = line.toString().replace(/\n/g, '').split(/\t/);
      var word = wordFreq[0];
      var frequency = parseInt(wordFreq[1], 10);
      return([word, canonicalize(word), frequency])
    } )
    .join( function(wordStructs) {
      next(wordStructs);
    } );
  stream.resume();
}

function printJson(struct) {
  console.log(JSON.stringify(struct));
}

convert(process.stdin, printJson);


