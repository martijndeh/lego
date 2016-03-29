import Lego from '../src';
import assert from 'assert';

describe('result', function () {
	beforeEach(() => {
		return Lego.sql `CREATE TABLE tests (value INTEGER)`
			.then(() => {
				return Lego.sql `INSERT INTO tests VALUES (1), (2), (3)`;
			});
	});

	afterEach(() => {
		return Lego.sql `DROP TABLE IF EXISTS tests`;
	});

	it('in update query', function () {
		return Lego.sql `UPDATE tests SET value = 1`
			.then(function (affectedRows) {
				assert.equal(affectedRows, 3);
			});
	});

	it('in update query with 0 affected rows', function () {
		return Lego.sql `UPDATE tests SET value = 1 WHERE value > 10`
			.then(function (affectedRows) {
				assert.equal(affectedRows, 0);
			});
	});

	it('in update query with 0 returning', function () {
		return Lego.sql `UPDATE tests SET value = 1 WHERE value > 10 RETURNING *`
			.then(function (rows) {
				assert.equal(rows.length, 0);
			});
	});

	it('in update query with returning clause', function () {
		return Lego.sql `UPDATE tests SET value = 1 RETURNING *`
			.then(function (rows) {
				assert.equal(rows.length, 3);
			});
	});

	it('in delete query', function () {
		return Lego.sql `DELETE FROM tests`
			.then(function (affectedRows) {
				assert.equal(affectedRows, 3);
			});
	});

	it('in delete query with 2 affected rows', function () {
		return Lego.sql `DELETE FROM tests WHERE value <> 2`
			.then(function (affectedRows) {
				assert.equal(affectedRows, 2);
			});
	});

	it('in delete query with 2 returning rows', function () {
		return Lego.sql `DELETE FROM tests WHERE value <> 2 RETURNING *`
			.then(function (rows) {
				assert.equal(rows.length, 2);
			});
	});

	it('in drop query', function () {
		return Lego.sql `DROP TABLE tests`
			.then(function (affectedRows) {
				assert.equal(isNaN(affectedRows), true);
			});
	});

	it('select query', function () {
		return Lego.sql `SELECT * FROM tests`
			.then(function (rows) {
				assert.equal(rows.length, 3);
			});
	});
});
