// generate the map of position to adjacent position on
// the letterpress board

var _ = require('underscore');

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
      if (pa >= 0 && pa <= 24) {
        adjacent[p].push(pa);
      }
    })
  })
});
console.log(JSON.stringify(adjacent, null, 2));

function getPos(n, i, j) {
  i += n[0];
  j += n[1];
  return i*5 + j;
}
