var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema(
	{
		first_name: {type: String, required: true, max: 100},
		family_name: {type: String, required: true, max: 100},
		date_of_birth: {type: Date},
		date_of_death: {type: Date}
	}
);

// virtual for author's full name
AuthorSchema
.virtual('name')
.get(function (){
	return this.family_name + ', ' + this.first_name;
});

// virtual for author's lifespan
/* AuthorSchema
.virtual('lifespan')
.get(function (){
	return (this.date_of_death.getYear() - this.date_of_birth.getYear()).toString();
}); */

AuthorSchema
.virtual('lifespan')
.get(function(){
	return (this.date_of_birth ? moment(this.date_of_birth).format('MMMM Do, YYYY') : '')
	       + ' - ' + (this.date_of_death ? moment(this.date_of_death).format('MMMM Do, YYYY') : '');
});

// virtual for author's URL
AuthorSchema
.virtual('url')
.get(function (){
	return '/catalog/author/' + this._id;
});

AuthorSchema
.virtual('birth_date_input')
.get(function(){
	return this.date_of_birth ? 
		   moment(this.date_of_birth).format('YYYY-MM-DD')
		   : '';
});

AuthorSchema
.virtual('death_date_input')
.get(function(){
	return this.date_of_death ? 
	       moment(this.date_of_death).format('YYYY-MM-DD')
	       : '';
});

// export model
module.exports = mongoose.model('Author', AuthorSchema);