const Lego = require('../').default;
const microtime = require('microtime');

if (!microtime) {
	// TODO: Make sure microtime also works in Node 4, or remove Node 4 as target.

	console.log('Microtime dependency is not available. Please add it.');
}

function simple_query() {
	const name = 'Martijn';
	const query = Lego.sql `SELECT * FROM users WHERE name = ${name}`;

	query.toQuery();
}

function query_with_raw() {
	const name = 'Martijn';
	const column = 'name';
	const query = Lego.sql `SELECT * FROM users WHERE ${Lego.raw(column)} = ${name}`;

	query.toQuery();
}

function test(message, callback) {
	const start = microtime.nowDouble();
	const count = 10000;

	for (var i = 0; i < count; i++) {
		callback();
	}

	const total = microtime.nowDouble() - start;

	console.log(`${message}: ${total * 1000}ms (${total / count * 1000}ms per query)`);
}

test('Simple select query', simple_query);
test('Query with raw part', query_with_raw);
