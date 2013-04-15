function fibo(n) {
  return (n > 1) ? fibo(n-1) + fibo(n-2) : 1;
}
onmessage = function(oEvent) {
  var id = oEvent.data._id;
  console.log("id=" + oEvent.data._id+",n=" + oEvent.data.n);
  var f = fibo(oEvent.data.n);
  console.log("id=" + id+" --> f=" + f);
  postMessage({
    _id: id,
    fibo: f
  });
  self.close();
};

