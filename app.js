// import node libraries (previously downloaded by npm)
var createError = require('http-errors');
var express = require('express');
var path = require('path');  // parses file and directory paths
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// require modules from routes directory
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var catalogRouter = require('./routes/catalog');

// app object for imported 'express' module
var app = express();

// set up mongoose connection
var mongoose = require('mongoose');
var mongoDB = 'mongodb://ebooras:d4t4b4s3@ds056288.mlab.com:56288/local_library0117';
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;  // connects to global promise variable
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));  // specify where templates are stored
app.set('view engine', 'pug');  // specify template library

// add middleware libraries to request handling chain
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));  // express will serve all static files in public directory

// add route-handling code to request handling chain
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
