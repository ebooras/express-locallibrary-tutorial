var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');

var async = require('async');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list', { title: 'Book Instance List', 
      	                                bookinstance_list: list_bookinstances });
    });  
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function(err, bookinstance){
    	if(err) { return next(err); }
    	if(bookinstance==null){   // no results
    		var err = new Error('Book copy not found.');
    		err.status = 404;
    		return next(err);
    	}
    	// successful, so render
    	res.render('bookinstance_detail', { title: 'Book:', 
    		                                bookinstance: bookinstance });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    Book.find({}, 'title')
    .exec(function(err, books){
    	if(err) { return next(err); }
    	res.render('bookinstance_form', { title: 'Create BookInstance',
    	                                  book_list: books });
    });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
	// validate fields
	body('book', 'Book must be specified.').isLength({ min: 1 }).trim(),
	body('imprint', 'Imprint must be specified.').isLength({ min: 1 }).trim(),
	body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

	// sanitize fields
	sanitizeBody('book').trim().escape(),
	sanitizeBody('imprint').trim().escape(),
	sanitizeBody('status').trim().escape(),
	sanitizeBody('due_back').toDate(),

	// process request after validation and sanitization
	(req, res, next) => {
		const errors = validationResult(req);

		var bookinstance = new BookInstance(
		{
			book: req.body.book,
			imprint: req.body.imprint,
			status: req.body.status,
			due_back: req.body.due_back
		});

		if(!errors.isEmpty()){
			Book.find({}, 'title')
			.exec(function(err, books){
				if(err) { return next(err); }
	    	res.render('bookinstance_form', { title: 'Create BookInstance',
	    	                                  book_list: books,
	    	                                  selected_book: bookinstance.book._id,
	    	                                  bookinstance: bookinstance,
	    	                                  errors: errors.array()
	    	                              });
			});
			return;
		}
		else{
			bookinstance.save(function(err){
				if(err) { return next(err); }
				res.redirect(bookinstance.url);
			});
		}
	}
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
	BookInstance.findById(req.params.id)
	.populate('book')
	.exec(function(err, bookinstance){
    	if(err) { return next(err); }
    	if(bookinstance==null){  // no results
    		res.redirect('/catalog/bookinstances');
    	}
    	else{
    		res.render('bookinstance_delete', { title: 'Delete BookInstance',
    		                                    bookinstance: bookinstance });
    	}
    });
    
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
	BookInstance.findById(req.params.bookinstanceid)
	.exec(function(err, bookinstance){
    	if(err) { return next(err); }
    	else{
    		BookInstance.findByIdAndRemove(req.body.bookinstanceid, function deleteBookInstance(err){
    			if(err) { return next(err); }
    			// success, redirect to bookinstance list
    			res.redirect('/catalog/bookinstances');
    		});
    	}
    });  
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
    async.parallel({
    	bookinstance: function(callback){
    		BookInstance.findById(req.params.id)
    		.populate('book')
    		.exec(callback)	
    	},

    	books: function(callback){
    		Book.find(callback)
    	},

    	}, function(err, results){
	    	if(err) { return next(err); }
	    	if(results.bookinstance==null){  // no results
	    		var err = new Error('Book copy not found.');
	    		err.status = 404;
	    		return next(err);
	    	}
	    	else{
	    		res.render('bookinstance_form', { title: 'Update BookInstance',
		    	                                  book_list: results.books,
		    	                                  selected_book: results.bookinstance.book._id,
		    	                                  bookinstance: results.bookinstance
		    	});
	    	}
    });
    
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
	// validate fields
	body('book', 'Book must be specified.').isLength({ min: 1 }).trim(),
	body('imprint', 'Imprint must be specified.').isLength({ min: 1 }).trim(),
	body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

	// sanitize fields
	sanitizeBody('book').trim().escape(),
	sanitizeBody('imprint').trim().escape(),
	sanitizeBody('status').trim().escape(),
	sanitizeBody('due_back').toDate(),

	// process request after validation and sanitization
	(req, res, next) => {
		const errors = validationResult(req);

		var bookinstance = new BookInstance(
		{
			book: req.body.book,
			imprint: req.body.imprint,
			status: req.body.status,
			due_back: req.body.due_back,
			_id: req.params.id
		});

		if(!errors.isEmpty()){
			// errors -- re-render page
			Book.find({}, 'title')  // find all books to display in dropdown list
			.exec(function(err, books){
				if(err) { return next(err); }
		    	res.render('bookinstance_form', { title: 'Update BookInstance',
		    	                                  book_list: books,
		    	                                  selected_book: bookinstance.book._id,
		    	                                  bookinstance: bookinstance,
		    	                                  errors: errors.array()
		    	                              });
			});
			return;
		}
		else{
			// success
			BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function(err, newinstance){
				if(err) { return next(err); }
				res.redirect(newinstance.url);
			});
		}
	}
];