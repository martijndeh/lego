import Lego from '../src';

import assert from 'assert';

describe('query', function () {
	describe('spaces', () => {
		it('no space after (, before )', () => {
			const test = 123;
			const lego = Lego.sql `INSERT INTO foo (test) VALUES (`;
			lego.append `${test}`;
			lego.append `)`;

			const query = lego.toQuery();

			assert.deepEqual(query, {
				text: 'INSERT INTO foo (test) VALUES ($1)',
				parameters: [test],
			});
		});

		it('space between regular words', () => {
			const lego = Lego.sql `INSERT INTO foo`;
			lego.append `DEFAULT VALUES`;

			const query = lego.toQuery();
			assert.deepEqual(query, {
				text: 'INSERT INTO foo DEFAULT VALUES',
				parameters: [],
			});
		});

		it('space before (', () => {
			const name = 'Martijn';
			const lego = Lego.sql `INSERT INTO foo`;
			lego.append `(name) VALUES (${name})`;

			const query = lego.toQuery();
			assert.deepEqual(query, {
				text: 'INSERT INTO foo (name) VALUES ($1)',
				parameters: [name],
			});
		});

		it('space after )', () => {
			const name = 'Martijn';
			const lego = Lego.sql `SELECT * FROM test INNER JOIN foo ON (test.id = foo.test_id)`;
			lego.append `WHERE test.name = ${name}`;

			const query = lego.toQuery();

			assert.deepEqual(query, {
				text: 'SELECT * FROM test INNER JOIN foo ON (test.id = foo.test_id) WHERE test.name = $1',
				parameters: [name],
			});
		});
	});

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

		it('append with array and raw', () => {
			const id = 1;
			const params = {
				age: 10,
				name: 'Bob',
			};
			const lego = Lego.sql `UPDATE users SET`;

			Object.keys(params).forEach((key, index) => {
				if (index > 0) {
					lego.append `,`;
				}

				lego.append `${Lego.raw(key)} = ${params[key]}`;
			});

			lego.append `WHERE id = ${id}`;

			const query = lego.toQuery();

			assert.equal(query.text, 'UPDATE users SET age = $1, name = $2 WHERE id = $3');
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

	describe('Lego#raw', () => {
		it('add 1 raw value', () => {
			const column = 'name';
			const value = 'Martijn';

			const lego = Lego.sql `SELECT * FROM tests WHERE ${Lego.raw(column)} = ${value}`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM tests WHERE name = $1');
			assert.deepEqual(query.parameters, [value]);
		});

		it('add 2 raw values', () => {
			const column = 'name';
			const value = 'Martijn';

			const lego = Lego.sql `SELECT * FROM tests WHERE ${Lego.raw(column)} = ${value} AND ${Lego.raw(column)} <> ${value}`;

			const query = lego.toQuery();
			assert.equal(query.text, 'SELECT * FROM tests WHERE name = $1 AND name <> $2');
			assert.deepEqual(query.parameters, [value, value]);
		});
	});

	describe('array', () => {
		const params = {
			age: 10,
			name: 'Bob',
		};
		const keys = Object.keys(params);

		it('array before regular parameter', () => {
			const id = 1;
			const lego = Lego.sql `UPDATE users SET ${keys.map(key => Lego.sql `${Lego.raw(key)} = ${params[key]}`)} WHERE id = ${id}`;
			const query = lego.toQuery();

			assert.equal(query.text, 'UPDATE users SET age = $1, name = $2 WHERE id = $3');
		});

		it('array after regular parameter', () => {
			const lego = Lego.sql `INSERT INTO users (${Lego.raw(keys.join(', '))}) VALUES (${keys.map(key => Lego.sql `${params[key]}`)})`;
			const query = lego.toQuery();

			assert.equal(query.text, 'INSERT INTO users (age, name) VALUES ($1, $2)');
		});

		it('array after array', () => {
			const lego = Lego.sql `INSERT INTO users (${Lego.raw(keys.join(', '))}) VALUES (${keys.map(key => Lego.sql `${params[key]}`)}), (${keys.map(key => Lego.sql `${params[key]}`)})`;
			const query = lego.toQuery();

			assert.equal(query.text, 'INSERT INTO users (age, name) VALUES ($1, $2), ($3, $4)');
		});

		it('array after array before regular parameter', () => {
			const lego = Lego.sql `INSERT INTO users (${Lego.raw(keys.join(', '))}) VALUES (${keys.map(key => Lego.sql `${params[key]}`)}), (${keys.map(key => Lego.sql `${params[key]}`)}) ON CONFLICT DO UPDATE SET ${Lego.raw('age')} = ${params.age}`;
			const query = lego.toQuery();

			assert.equal(query.text, 'INSERT INTO users (age, name) VALUES ($1, $2), ($3, $4) ON CONFLICT DO UPDATE SET age = $5');
		});
	});
});
