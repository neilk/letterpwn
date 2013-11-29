/**
 * Module dependencies.
 */

var express = require('express')
    expressValidator = require('express-validator'),
    http = require('http'),
    routes = require('./routes'),
    //testRoute = require('./routes/test')
    path = require('path');

var app = express();

app.configure(function(){
  app.use(express.favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.set('port', process.env.PORT || 3000);
  app.set('jqueryUrl', process.env.JQUERYURL || '/javascripts/jquery-1.9.0.js');
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
//app.get('/test', testRoute.test);
app.get('/about', routes.about);
app.get('/colophon', routes.colophon);

// blitz.io proof of ownership
app.get('/mu-b432335c-89203046-5ca83cfa-02a50845', function(req, res, next) { res.end("42"); });

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
