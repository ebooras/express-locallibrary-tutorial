var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

exports.index = function(req, res) {
    async.parallel({
    	book_count: function(callback){
    		Book.countDocuments({}, callback);  // pass empty object as match condition
    		                                    // to find all documents of collection
    	},
    	book_instance_count: function(callback){
    		BookInstance.countDocuments({}, callback);
    	},
    	book_instance_available_count: function(callback){
    		BookInstance.countDocuments({status:'Available'}, callback);
    	},
    	author_count: function(callback){
    		Author.countDocuments({}, callback);
    	},
    	genre_count: function(callback){
    		Genre.countDocuments({}, callback);
    	}
    }, function(err, results){
    	res.render('index', { title: 'Local Library Home', error: err, data: results });
    });
};

// Display list of all books.
exports.book_list = function(req, res, next) {
    Book.find({}, 'title author')
      .populate('author')
      .exec(function(err, list_books){
      	if(err) { return next(err); }
      	// successful, so render
      	res.render('book_list', { title: 'Book List', 
      	                          book_list: list_books });  // book_list.pug (view)
      });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    async.parallel({
    	book: function(callback){
    		Book.findById(req.params.id)
    		.populate('author')
    		.populate('genre')
    		.exec(callback);
    	},

    	book_instance: function(callback){
    		BookInstance.find({ 'book': req.params.id })
    		.exec(callback);
    	},
    }, function(err, results){
    	if(err) { return next(err); }
    	if(results.book==null){   // no results found
    		var err = new Error('Book not found.');
    		err.status = 404;
    		return next(err);
    	}
    	// successful, so render
    	res.render('book_detail', { title: 'Title', 
    		                        book: results.book, 
    		                        book_instances: results.book_instance });
    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    // get all authors and genres
    async.parallel({
    	authors: function(callback){
    		Author.find(callback);
    	},
    	genres: function(callback){
    		Genre.find(callback);
    	},
    }, function(err, results){
    	if(err) { return next(err); }
    	res.render('book_form', { title: 'Create Book',
    	                          authors: results.authors,
    	                          genres: results.genres });
    });
};

// Handle book create on POST.
exports.book_create_post = [
	// convert the genre to an array
	(req, res, next) => {
		if(!(req.body.genre instanceof Array)){
			if(typeof req.body.genre==='undefined')
				req.body.genre = [];
			else
				req.body.genre = new Array(req.body.genre);
		}
		next();
	},

	// validate fields
	body('title', 'Title cannot be empty.').isLength({ min: 1 }).trim(),
	body('author', 'Author cannot be empty.').isLength({ min: 1 }).trim(),
	body('summary', 'Summary cannot be empty.').isLength({ min: 1 }).trim(),
	body('isbn', 'ISBN cannot be empty.').isLength({ min: 1 }).trim(),
	
	// sanitize fields (using wildcard)
	sanitizeBody('*').trim().escape(),

	// process request after validation and sanitization
	(req, res, next) => {
		// extract validation errors from a request
		const errors = validationResult(req);

		// create a Book object with escaped and trimmed data
		var book = new Book(
			{
				title: req.body.title,
				author: req.body.author,
				summary: req.body.summary,
				isbn: req.body.isbn,
				genre: req.body.genre
			}
		);

		if(!errors.isEmpty()){
			// there are errors -- render form again with sanitized values, error msgs

			// get all authors and genres for form
			async.parallel({
				authors: function(callback){
					Author.find(callback);
				},
				genres: function(callback){
					Genre.find(callback);
				},
			}, function(err, results){
				if(err) { return next(err); }

				// mark our selected genres as checked
				for(let i = 0; i < results.genres.length; i++){
					if(book.genre.indexOf(results.genres[i]._id) > -1)
						results.genres[i].checked = 'true';
				}

				res.render('book_form', { title: 'Create Book',
				                          authors: results.authors,
				                          genres: results.genres,
				                          book: book,
				                          errors: errors.array() });
			});
			return;
		}
		else{
			// data from form is valid. save book
			book.save(function(err){
				if(err) { return next(err); }
				res.redirect(book.url);
			});
		}
	}
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
	async.parallel({
    	book: function(callback){
    		Book.findById(req.params.id)
    		.exec(callback)
    	},

    	bookinstances: function(callback){
    		BookInstance.find({ 'book': req.params.id })
    		.exec(callback)
    	},
    }, function(err, results){
    	if(err) { return next(err); }
    	if(results.book==null){  // no results
    		res.redirect('/catalog/books');
    	}
    	res.render('book_delete', { title: 'Delete Book',
    	                            book: results.book,
    	                            bookinstances: results.bookinstances });
    });
	
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
	async.parallel({
    	book: function(callback){
    		Book.findById(req.params.bookid)
    		.exec(callback)
    	},

    	bookinstances: function(callback){
    		BookInstance.find({ 'book': req.params.bookid })
    		.populate('book')
    		.exec(callback)
    	},
    }, function(err, results){
    	if(err) { return next(err); }
    	if(results.bookinstances.length > 0){
    		// book still has existing instances
    		res.render('book_delete', { title: 'Delete Book',
    	                                book: results.book,
    	                                bookinstances: results.bookinstances });
    		return;
    	}
    	else{
    		Book.findByIdAndRemove(req.body.bookid, function deleteBook(err){
    			if(err) { return next(err); }
    			// deletion successful
    			res.redirect('/catalog/books');
    		});
    	}
    	
    });
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    async.parallel({
    	book: function(callback){
    		Book.findById(req.params.id)
    		.populate('author')
    		.populate('genre')
    		.exec(callback);
    	},

    	authors: function(callback){
    		Author.find(callback);
    	},

    	genres: function(callback){
    		Genre.find(callback);
    	}
    }, function(err, results){
    	if(err) { return next(err); }
    	if(results.book==null){  // no results
    		var err = new Error('Book not found.');
    		err.status = 404;
    		return next(err);
    	}
    	// success -- mark selected genres as checked
    	for(var g = 0; g < results.genres.length; g++){
    		for(var b = 0; b < results.book.genre.length; b++){
    			if(results.genres[g]._id.toString()==results.book.genre[b]._id.toString())
    				results.genres[g].checked = 'true';
    		}
    	}

    	res.render('book_form', { title: 'Update Book',
    	                          book: results.book,
    	                          authors: results.authors,
    	                          genres: results.genres });
    });
};

// Handle book update on POST.
exports.book_update_post = [
	// convert the genre to an array
	(req, res, next) => {
		if(!(req.body.genre instanceof Array)){
			if(typeof req.body.genre==='undefined')
				req.body.genre = [];
			else
				req.body.genre = new Array(req.body.genre);
		}
		next();
	},

	// validate fields
	body('title', 'Title cannot be empty.').isLength({ min: 1 }).trim(),
	body('author', 'Author cannot be empty.').isLength({ min: 1 }).trim(),
	body('summary', 'Summary cannot be empty.').isLength({ min: 1 }).trim(),
	body('isbn', 'ISBN cannot be empty.').isLength({ min: 1 }).trim(),
	
	// sanitize fields
	sanitizeBody('title').trim().escape(),
	sanitizeBody('author').trim().escape(),
	sanitizeBody('summary').trim().escape(),
	sanitizeBody('isbn').trim().escape(),
	sanitizeBody('genre.*').trim().escape(),

	// process request after sanitization and validation
	(req, res, next) => {
		// extract validation errors from a request
		const errors = validationResult(req);

		// create a new Book with escaped/trimmed data and OLD ID
		var book = new Book(
		{
			title: req.body.title,
			author: req.body.author,
			summary: req.body.summary,
			isbn: req.body.isbn,
			genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
			_id: req.params.id  // use old ID so that new object isn't created
		}
		);

		if(!errors.isEmpty()){
			async.parallel({
		    	authors: function(callback){
		    		Author.find(callback);
		    	},

		    	genres: function(callback){
		    		Genre.find(callback);
		    	}
		    }, function(err, results){
		    	if(err) { return next(err); }

		    	// mark our selected genres as checked
		    	for(let i = 0; i < results.genres.length; i++){
		    		if(book.genre.indexOf(results.genres[i]._id) > -1)
		    			results.genres[i].checked = 'true';
		    	}
		   
		    	res.render('book_form', { title: 'Update Book',
		    	                          book: results.book,
		    	                          authors: results.authors,
		    	                          genres: results.genres,
		    	                          errors: errors.array() });
		    });
		    return;
		}
		else{
			// data from form is valid -- update record
			Book.findByIdAndUpdate(req.params.id, book, {}, function (err, newbook){
				if(err) { return next(err); }
				// success -- redirect to book detail page
				res.redirect(newbook.url);
			});
		}
	}
	
];