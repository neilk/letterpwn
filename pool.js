var numThreads= 10;
var threadPool= require('threads_a_gogo').createPool(numThreads);
threadPool.load(__dirname + '/child.js');

/*
  This is the code that's .load()ed into the child/background threads:

  function fibo (n) {
    return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
  }

  thread.on('giveMeTheFibo', function onGiveMeTheFibo (data) {
    this.emit('theFiboIs', fibo(+data)); //Emits 'theFiboIs' in the parent/main thread.
  });

*/

//Emit 'giveMeTheFibo' in all the child/background threads.
threadPool.any.emit('giveMeTheFibo', 35);

//Listener for the 'theFiboIs' events emitted by the child/background threads.
threadPool.on('theFiboIs', function cb (data) {
  process.stdout.write(" ["+ this.id+ "]"+ data);
  // this.emit('giveMeTheFibo', 35);
});

(function spinForever () {
  process.nextTick(spinForever);
})();
