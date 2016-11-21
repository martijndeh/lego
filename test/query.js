import Lego from '../src';

import assert from 'assert';

describe('query', function () {
	it('without parameters', function () {
		const lego = Lego.sql `SELECT * FROM users`;

		const query = lego.toQuery();

		assert.equal(query.text, 'SELECT * FROM users');
		assert.equal(query.parameters.length, 0);
	});

	it('with 1 parameter', function () {
		const name = 'Martijn';
		const lego = Lego.sql `SELECT * FROM users WHERE name = ${name}`;

		const query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users WHERE name = $1');
		assert.equal(query.parameters.length, 1);
		assert.equal(query.parameters[0], name);
	});

	it('with 2 parameter', function () {
		const name = 'Martijn';
		const age = 27;
		const lego = Lego.sql `SELECT * FROM users WHERE name = ${name} AND age = ${age}`;

		const query = lego.toQuery();
		assert.equal(query.text, 'SELECT * FROM users WHERE name = $1 AND age = $2');
		assert.equal(query.parameters.length, 2);
		assert.equal(query.parameters[0], name);
		assert.equal(query.parameters[1], age);
	});

	it('with invalid parameters', function () {
		assert.throws(function () {
			Lego.sql();
		}, function (error) {
			return error.message === 'Lego#sql invoked with invalid arguments. This is likely because you are not using template strings e.g.: Lego.sql \`SELECT 1\`.';
		});
	});

	it('with invalid parameters (2)', function () {
		assert.throws(function () {
			Lego.sql('SELECT 1');
		}, function (error) {
			return error.message === 'Lego#sql invoked with invalid arguments. This is likely because you are not using template strings e.g.: Lego.sql \`SELECT 1\`.';
		});
	});

	describe('append', () => {
		it('should add space', () => {
			const lego = Lego.sql `SELECT * FROM users`;
			lego.append `ORDER BY age`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM users ORDER BY age');
		});

		it('append after parameter', () => {
			const name = 'Martijn';
			const lego = Lego.sql `SELECT * FROM users WHERE name = ${name}`;
			lego.append `ORDER BY age`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM users WHERE name = $1 ORDER BY age');
		});

		it('append with parameter after parameter', () => {
			const name = 'Martijn';
			const age = 18;

			const lego = Lego.sql `SELECT * FROM tests WHERE name = ${name}`;
			lego.append `AND age <> (${age})`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM tests WHERE name = $1 AND age <> ($2)');
			assert.deepEqual(query.parameters, [name, age]);
		});

		it('append with two parameters', () => {
			const name = 'Martijn';
			const age = 18;
			const gender = 'male';

			const lego = Lego.sql `SELECT * FROM tests WHERE name = ${name}`;
			lego.append `AND age <> (${age}) AND gender = ${gender}`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM tests WHERE name = $1 AND age <> ($2) AND gender = $3');
			assert.deepEqual(query.parameters, [name, age, gender]);
		});

		it('append with three parameters', () => {
			const name = 'Martijn';
			const age = 18;
			const gender = 'male';
			const role = 'developer';

			const lego = Lego.sql `SELECT * FROM tests WHERE name = ${name}`;
			lego.append `AND age <> (${age}) AND gender = ${gender} AND role = ${role}`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM tests WHERE name = $1 AND age <> ($2) AND gender = $3 AND role = $4');
			assert.deepEqual(query.parameters, [name, age, gender, role]);
		});
	});

	describe('sub instances', () => {
		it('merge regular', function () {
			const name = 'Martijn';
			const lego = Lego.sql `INSERT INTO users (name) ${Lego.sql `VALUES (${name})`}`;
			const query = lego.toQuery();

			assert.equal(query.text, 'INSERT INTO users (name) VALUES ($1)');
			assert.equal(query.parameters[0], name);
		});

		it('Nest', () => {
			const name = 'Martijn';
			const whereLego = Lego.sql `WHERE users.name = ${name}`;
			const sortLego = Lego.sql `ORDER BY users.created_at DESC`;
			const lego = Lego.sql `SELECT * FROM users ${whereLego} ${sortLego}`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM users WHERE users.name = $1 ORDER BY users.created_at DESC');
			assert.equal(query.parameters[0], 'Martijn');
		});

		it('Lego map 2 values', () => {
			const names = ['Martijn', 'Bob'];
			const lego = Lego.sql `INSERT INTO users (name) VALUES ${names.map((name) => Lego.sql `(${name})`)}`;

			const query = lego.toQuery();

			assert.equal(query.text, 'INSERT INTO users (name) VALUES ($1), ($2)');
			assert.equal(query.parameters[0], 'Martijn');
			assert.equal(query.parameters[1], 'Bob');
		});

		it('Lego map 1 value', () => {
			const names = ['Martijn'];
			const lego = Lego.sql `INSERT INTO users (name) VALUES ${names.map((name) => Lego.sql `(${name})`)}`;

			const query = lego.toQuery();

			assert.equal(query.text, 'INSERT INTO users (name) VALUES ($1)');
			assert.equal(query.parameters[0], 'Martijn');
		});
	});

});
