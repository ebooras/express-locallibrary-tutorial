var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GenreSchema = new Schema(
	{
		name: {type: String, min: 3, max: 100, required: true}
	}
);

// virtual for genre URL
GenreSchema
.virtual('url')
.get(function (){
	return '/catalog/genre/' + this._id;
});

// export model
module.exports = mongoose.model('Genre', GenreSchema);