const Lego = require('..');
const assert = require('assert');

describe('create', function() {
	it('without parameters', function() {
		var lego = Lego.new `SELECT * FROM users`;

		var query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users');
		assert.equal(query.parameters.length, 0);
	});

	it('with 1 parameter', function() {
		var name = 'Martijn';
		var lego = Lego.new `SELECT * FROM users WHERE name = ${name}`;

		var query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users WHERE name = $1');
		assert.equal(query.parameters.length, 1);
		assert.equal(query.parameters[0], name);
	});

	it('with 2 parameter', function() {
		var name = 'Martijn';
		var age = 27;
		var lego = Lego.new `SELECT * FROM users WHERE name = ${name} AND age = ${age}`;

		var query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users WHERE name = $1 AND age = $2');
		assert.equal(query.parameters.length, 2);
		assert.equal(query.parameters[0], name);
		assert.equal(query.parameters[1], age);
	});

	it('with invalid parameters', function() {
		assert.throws(function() {
			Lego.new(['SELECT * FROM users WHERE name = ', 'AND age = ', ''], 'Martijn');
		}, function(error) {
			return error.message === 'Invalid number of parameters in Lego#add.';
		});
	});

	it('empty and calling add', function() {
		var lego = Lego.new();
		lego.add `SELECT * FROM users`;

		var query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users');
		assert.equal(query.parameters.length, 0);
	});

	it('new and calling add', function() {
		var lego = Lego.new `SELECT * FROM users`;
		lego.add `WHERE name = "Martijn"`;

		var query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users\nWHERE name = "Martijn"');
		assert.equal(query.parameters.length, 0);
	});

	it('chaining add calls', function() {
		var query = Lego.new `SELECT * FROM users`
			.add `WHERE name = "Martijn"`
			.toQuery();

		assert.equal(query.text, 'SELECT * FROM users\nWHERE name = "Martijn"');
		assert.equal(query.parameters.length, 0);
	});

	it('merge queries', function() {
		var name = 'Martijn';

		var lego = Lego.new `SELECT * FROM users`;
		var whereLego = Lego.new `WHERE name = ${name}`;
		lego.add(whereLego);

		var query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users\nWHERE name = $1');
		assert.equal(query.parameters.length, 1);
		assert.equal(query.parameters[0], name);
	});

	it('class call check', function() {
		assert.throws(function() {
			Lego.LegoInstance();
		}, function(error) {
			return error.message === 'Cannot call a class as a function';
		});
	});
});
