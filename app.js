/**
 * Module dependencies.
 */

var express = require('express')
    expressValidator = require('express-validator'),
    http = require('http'),
    routes = require('./routes'),
    path = require('path');

var app = express();

app.configure(function(){
  app.use(express.favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(expressValidator);
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(app.router);
  app.use(clientErrorHandler);
});

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.send(500, { error: 'Something blew up!', details: err });
  } else {
    next(err);
  }
}

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/api', routes.api);


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
