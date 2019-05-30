var Genre = require('../models/genre');
var Book = require('../models/book');

var async = require('async');
var mongoose = require('mongoose');

const {body,validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    Genre.find()
      .sort([['name', 'ascending']])
      .exec(function(err, list_genres){
      	if(err) { return next(err); }
      	// successful, so render
      	res.render('genre_list', { title: 'Genre List', 
      		                       genre_list: list_genres });
      });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
	var id = mongoose.Types.ObjectId(req.params.id);   // fix ObjectId display error

    async.parallel({
    	genre: function(callback){
    		Genre.findById(id)
    		.exec(callback);
    	},

    	genre_books: function(callback){
    		Book.find({ 'genre': id })
    		.exec(callback);
    	},

    }, function(err, results){
    	if(err) { return next(err); }
    	if(results.genre==null){  // no results, genre may have been deleted
    		var err = new Error('Genre not found.');
    		err.status = 404;
    		return next(err);
    	}
    	// successful, so render
    	res.render('genre_detail', { title: 'Genre Detail', 
    		                         genre: results.genre, 
    		                         genre_books: results.genre_books });
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res, next) {
    res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [
	// validate that name field is not empty
	body('name', 'Genre name required').isLength({min: 1}).trim(),

	// sanitize (trim and escape) the name field
	sanitizeBody('name').trim().escape(),

	// process request after validation and sanitization
	(req, res, next) => {
		// extract validation errors from a request
		const errors = validationResult(req);

		// create a genre object with escaped and trimmed data
		var genre = new Genre(
			{ name: req.body.name }
		);

		if(!errors.isEmpty()){
			// there are errors -- render form again with sanitized values/error msgs
			res.render('genre_form', { title: 'Create Genre',
			                           genre: genre,
			                           errors: errors.array() });
			return;
		}
		else {
			// data from the form is valid
			// check if Genre with same name already exists
			Genre.findOne({ 'name': req.body.name })
			.exec(function(err, found_genre){
				if(err) { return next(err); }

				if(found_genre){
					// genre exists, redirect to its detail page
					res.redirect(found_genre.url);
				}
				else{
					genre.save(function(err){
						if(err) { return next(err); }
						// genre saved -- redirect to genre detail page
						res.redirect(genre.url);
					});
				}
			});
		}
	}
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    async.parallel({
    	genre: function(callback){
    		Genre.findById(req.params.id)
    		.exec(callback);
    	},

    	genre_books: function(callback){
    		Book.find({ 'genre': req.params.id })
    		.exec(callback);
    	},

    }, function(err, results){
    	if(err) { return next(err); }
    	if(results.genre==null){
    		res.redirect('/catalog/genres');
    	}
    	else{
    		res.render('genre_delete', { title: 'Delete Genre', 
    		                             genre: results.genre, 
    		                             genre_books: results.genre_books });	
    	}
    	
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
	async.parallel({
    	genre: function(callback){
    		Genre.findById(req.params.genreid)
    		.exec(callback);
    	},

    	genre_books: function(callback){
    		Book.find({ 'genre': req.params.genreid })
    		.exec(callback);
    	},

    }, function(err, results){
    	if(err) { return next(err); }
    	if(results.genre_books.length > 0){
    		// there are still books with this genre
    		res.render('genre_delete', { title: 'Delete Genre', 
    		                             genre: results.genre, 
    		                             genre_books: results.genre_books });
    		return;
    	}
    	else{
    		Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err){
    			if(err) { return next(err); }
    			// deletion successful
    			res.redirect('/catalog/genres');
    		});
    	}
    	
    });  
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
    Genre.findById(req.params.id)
    .exec(function(err, genre_update){
    	if(err) { return next(err); }
    	if(genre_update==null){
    		var err = new Error('Genre not found.');
    		err.status = 404;
    		return next(err);
    	}
    	// success
    	res.render('genre_form', { title: 'Update Genre',
    	                           genre: genre_update });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [
	body('name', 'Genre name required').isLength({min: 1}).trim(),

	// sanitize (trim and escape) the name field
	sanitizeBody('name').trim().escape(),

	// process now that data has been validated and sanitized
	(req, res, next) => {
		// get errors from request
		const errors = validationResult(req);

		// create genre object to update
		var genre = new Genre(
		{
			name: req.body.name,
			_id: req.params.id
		}
		);

		if(!errors.isEmpty()){
			// re-render page
			Genre.findById(req.params.id)
		    .exec(function(err, genre_update){
		    	if(err) { return next(err); }
		    	// success
		    	res.render('genre_form', { title: 'Update Genre',
		    	                           genre: genre_update,
		    	                           errors: errors.array() });
		    });
		    return;
		}
		else{
			// success
			Genre.findByIdAndUpdate(req.params.id, genre, {}, function(err, newgenre){
				if(err) { return next(err); }
				res.redirect(newgenre.url);
			});
		}
	}
];