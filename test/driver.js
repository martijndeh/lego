import Lego from '../src';
import assert from 'assert';
import { setPoolIdleTimeout } from '../src/driver/postgres';
import { createDriver, getSingleton } from '../src/driver';

describe('driver', function () {
	it('exec and resolves', function () {
		const lego = Lego.sql `SELECT 1 as count`;
		return lego
			.then(function (rows) {
				assert.equal(rows.length, 1);
				assert.equal(rows[0].count, '1');
			});
	});

	it('exec and rejects', function () {
		const lego = Lego.sql `SELECT fail`;
		return lego
			.then(assert.fail)
			.catch(function (error) {
				assert.equal(error.message, 'column "fail" does not exist');
			});
	});

	it('resolves first result', function () {
		const lego = Lego.sql `SELECT 1 as count`;
		return lego.first()
			.then(function (row) {
				assert.equal(row.length, undefined);
				assert.equal(row.count, '1');
			});
	});

	it('resolves null result with first on 0 rows', function () {
		const lego = Lego.sql `SELECT 1 WHERE 1 <> 1`;
		return lego.first()
			.then(function (row) {
				assert.equal(row, null);
			});
	});

	it('is then-able', function () {
		return Lego.sql `SELECT 1 as count`
			.then(function (rows) {
				assert.equal(rows.length, 1);
				assert.equal(rows[0].count, '1');
			});
	});

	it('can set pool idle timeout', function () {
		assert.doesNotThrow(() => {
			setPoolIdleTimeout(500);
		});
	});

	it('undefined database url', function () {
		assert.throws(function () {
			createDriver(null);
		}, function (error) {
			return error.message === 'No DATABASE_URL provided.';
		});
	});

	it('unsupported driver', function () {
		assert.throws(function () {
			createDriver('mysql://localhost');
		}, function (error) {
			return error.message === 'Unsupported driver \'mysql:\' in DATABASE_URL.';
		});
	});

	it('get singleton', function () {
		assert.strictEqual(getSingleton(), getSingleton());
	});
});
