process.env.DATABASE_URL = 'postgres://localhost';

const Lego = require('..');
const assert = require('assert');

describe('query', function() {
	it('exec and resolves', function() {
		var lego = Lego.new `SELECT 1 as count`;
		return lego.exec()
			.then(function(rows) {
				assert.equal(rows.length, 1);
				assert.equal(rows[0].count, '1');
			});
	});

	it('exec and rejects', function() {
		var lego = Lego.new `SELECT fail`;
		return lego.exec()
			.then(assert.fail)
			.catch(function(error) {
				assert.equal(error.message, 'column "fail" does not exist');
			});
	});

	it('resolves first result', function() {
		var lego = Lego.new `SELECT 1 as count`;
		return lego.first()
			.then(function(row) {
				assert.equal(row.length, undefined);
				assert.equal(row.count, '1');
			});
	});

	it('resolves null result with first on 0 rows', function() {
		var lego = Lego.new `SELECT 1 WHERE 1 <> 1`;
		return lego.first()
			.then(function(row) {
				assert.equal(row, null);
			});
	});

	it('is then-able', function() {
		return Lego.new `SELECT 1 as count`
			.then(function(rows) {
				assert.equal(rows.length, 1);
				assert.equal(rows[0].count, '1');
			});
	});

	it('connect error', function() {
		var driver = Lego.Driver('postgres://localhost:1337');
		driver.query('SELECT 1', [])
			.then(assert.fail)
			.catch(function(error) {
				assert.equal(error.message, 'connect ECONNREFUSED 127.0.0.1:1337');
			});
	});

	it('undefined database url', function() {
		assert.throws(function() {
			Lego.Driver(null);
		}, function(error) {
			return error.message === 'No DATABASE_URL provided.';
		});
	});

	it('unsupported driver', function() {
		assert.throws(function() {
			Lego.Driver('mysql://localhost');
		}, function(error) {
			return error.message === 'Unsupported driver in DATABASE_URL.';
		});
	});

	it('class call check', function() {
		assert.throws(function() {
			Lego.Driver.Postgres();
		}, function(error) {
			return error.message === 'Cannot call a class as a function';
		});
	});
});
