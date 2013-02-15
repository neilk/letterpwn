// generate the map of position to adjacent position on
// the letterpress board

var _ = require('underscore'),
    getBitMaskForPositions = require('lib/letterpress-getBitMask').getBitMaskForPositions;

var neighbors = [
  [ -1, 0 ],
  [ 0, -1 ],
  [ 0, 1 ],
  [ 1, 0 ],
];

var adjacent = [];
_.each( _.range(5), function(i) {
  _.each( _.range(5), function(j) {
    var p = getPos([0, 0], i, j);
    adjacent[p] = [];
    _.each(neighbors, function (n) {
      var pa = getPos(n, i, j);
      if (pa != null) {
        adjacent[p].push(pa);
      }
    })
  })
});

adjacentBitMasks = [];
for (var i = 0; i <= 24; i++) {
  adjacentBitMasks.push(
    [ getBitMaskForPositions([i]), getBitMaskForPositions(adjacent[i]) ]
  )
}

console.log(JSON.stringify(adjacentBitMasks, null, 2));

function getPos(n, i, j) {
  i += n[0];
  j += n[1];
  if (i >= 0 && i <= 4 && j >= 0 && j <= 4) {
    return i*5 + j;
  } else {
    return null;
  }
}
