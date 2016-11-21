import Lego from '../src';
import assert from 'assert';

describe('transaction', function () {
	beforeEach(function () {
		return Lego.sql `CREATE TABLE tests (text TEXT UNIQUE, value INTEGER)`;
	});

	afterEach(function () {
		return Lego.sql `DROP TABLE IF EXISTS tests`;
	});

	it('can commit', function () {
		return Lego.transaction(function (transaction) {
				return transaction.sql `INSERT INTO tests (text, value) VALUES ('Martijn', 123) RETURNING *`
					.then(function (tests) {
						assert.equal(tests.length, 1);
						assert.equal(tests[0].text, 'Martijn');
						assert.equal(tests[0].value, 123);
					});
			})
			.then(function () {
				return Lego.sql `SELECT * FROM tests`;
			})
			.then(function (tests) {
				assert.equal(tests.length, 1);
				assert.equal(tests[0].text, 'Martijn');
				assert.equal(tests[0].value, 123);
			});
	});

	it('can rollback', function () {
		return Lego.transaction(function (transaction) {
				return transaction.sql `INSERT INTO tests (text, value) VALUES ('Martijn', 123) RETURNING *`
					.then(function (tests) {
						assert.equal(tests.length, 1);
						assert.equal(tests[0].text, 'Martijn');
						assert.equal(tests[0].value, 123);

						return transaction.sql `INSERT INTO tests (text, value) VALUES ('Martijn', 123) RETURNING *`;
					});
			})
			.then(assert.fail)
			.catch(function (error) {
				assert.equal(error.code, '23505');

				return Lego.sql `SELECT * FROM tests`
					.then(function (tests) {
						assert.equal(tests.length, 0);
					});
			});
	});

	it('should throw error in empty transaction', function () {
		return Lego.transaction(function () {
				// We return nothing so this fails.
			})
			.then(assert.fail)
			.catch(function (error) {
				assert.equal(error.message, '0 queries were found in Lego#transaction\'s callback.');
			});
	});

	it('can execute multiple statements', function () {
		return Lego
			.transaction((transaction) => {
				transaction.sql `INSERT INTO tests (text, value) VALUES ('Martijn', 1)`;
				transaction.sql `UPDATE tests SET value = 2 WHERE value = 1`;
				transaction.sql `UPDATE tests SET value = 3 WHERE value = 2`;
			})
			.then(() => {
				return Lego.sql `SELECT * FROM tests`.first();
			})
			.then((test) => {
				assert.equal(test.value, 3);
				assert.equal(test.text, 'Martijn');
			});
	});

	it('should execute in series with return value', function () {
		return Lego
			.transaction((transaction) => {
				transaction.sql `INSERT INTO tests (text, value) VALUES ('Martijn', 1)`;
				return transaction.sql `UPDATE tests SET value = 2 WHERE value = 1`;
			})
			.then(() => {
				return Lego.sql `SELECT * FROM tests`.first();
			})
			.then((test) => {
				assert.equal(test.value, 2);
				assert.equal(test.text, 'Martijn');
			});
	});
});
