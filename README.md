# Lego.js
[![Build Status](https://travis-ci.org/martijndeh/lego.svg?branch=master)](https://travis-ci.org/martijndeh/lego)
[![Coverage Status](https://coveralls.io/repos/martijndeh/lego/badge.svg?branch=master&service=github)](https://coveralls.io/github/martijndeh/lego?branch=master)

A lightweight SQL (string) builder using ES6 template strings.

```
npm install lego-sql --save
```

Lego embraces SQL instead of adding yet another abstraction layer. It supports client pooling (using pg), data mapping, transactions and migrations including a cli. Currently,
only PostgreSQL is supported. Feel free to send pull requests! :-)

```js
import Lego from 'lego-sql';

Lego.sql `SELECT * FROM users WHERE name = ${name}`;
```

The data mapper allows you to easily parse rows from a query and construct objects based on a definition object:

```js
Lego.sql `SELECT
	projects.id,
	projects.created_at,
	project_members.id member_id,
	project_members.name member_name,
	project_members.email member_email
	project_members.joined_at member_joined_at
FROM projects
INNER JOIN project_members ON projects.id = project_members.project_id
WHERE
	projects.id = ${projectID}`
	.then((rows) => {
		return Lego.parse(rows, {
			id: 'id',
			created_at: 'created_at',
			members: [{
				id: 'member_id',
				name: 'member_name',
				email: 'member_email',
				joined_at: 'member_joined_at'
			}]
		})
	})
	.then((project) => {
		//
	})
```

## Quick start

Lego uses ES6 template strings. From the template string, a parameterized
query is created and passed to the driver where the input is sanitized.

A Lego instance is then-able. This means the query is executed when `.then()` is
invoked. You can use it in the following way:
```js
Lego.sql `INSERT INTO projects (name) VALUES (${name}) RETURNING *`
	.then((projects) => {
		return Lego.sql `INSERT INTO project_settings (project_id) VALUES (${projects[0].id})`;
	})
	.then(() => {
		// Ready! :-)
	})
```

You can also nest arrays of Lego instances:
```js
Lego.sql `INSERT INTO projects (name) VALUES ${projects.map((project) => {
		return Lego.sql `(${project.name})`;
	})}`;
```

Which creates the query `INSERT INTO projects (name) VALUES ($1), ($2)`.

In some cases, you want to append a statement:

```js
const lego = Lego.sql `SELECT * FROM tests`;

if (shouldOrderBy) {
	lego.append `ORDER BY value`;
}

```

In `DELETE`, `UPDATE` and `INSERT` queries, when not using a `RETURNING` clause, the number of affected rows is resolved. Otherwise, the rows are resolved.

## Data mapper

Lego makes it easy to parse rows and transform them to objects. Consider the below rows:

```js
const rows = [{
	id: 1,
	test_id: 1,
	test_name: 'Test 1'
}, {
	id: 1,
	test_id: 2,
	test_name: 'Test 2'
}];
```

The rows are flat but do contain 1 root object and 2 child objects. Something like the below:

```js
const objects = [{
	id: 1,
	tests: [{
		id: 1,
		name: 'Test 1'
	}, {
		id: 2,
		name: 'Test 2'
	}]
}]
```

You can transform the rows by simply passing the rows to Lego's parse system and providing a definition object:
```js
Lego.parse(rows, [{
	id: 'id',
	tests: [{
		id: 'test_id',
		name: 'test_name'
	}]
}]);
```

## Transactions

Transactions are also supported. You can either chain the calls manually by returning a promise in the transaction's `callback`:

```js
Lego.transaction((transaction) => {
	return transaction.sql `UPDATE money SET value = value + 100`
		.then(() => {
			return transaction.sql `UPDATE money SET value = value - 100`;
		});
});
```

Or use the transaction queue which invokes the queries in series (make sure to *not* return a promise!):

```js
Lego.transaction((transaction) => {
	transaction.sql `UPDATE money SET value = value + 100`;
	transaction.sql `UPDATE money SET value = value - 100`;
});
```

Alternatively, you can construct regular Lego instances and assign them to the transaction:

```js
Lego.transaction((transaction) => {
	return Lego
		.sql `UPDATE money SET value = value + 100`
		.transacting(transaction)
		.then(() => {
			return Lego
				.sql `UPDATE money SET value = value - 100`
				.transacting(transaction);
		});
});
```

`Lego#transaction` returns a promise with the result of the transaction's `callback`.

## Migrations

To create a migration you can simply invoke `lego migrate:make`. This creates an empty migration with an `up` and a `down` method.

Migrations are executed in a transaction which is passed in both the `up` and `down` method.

```js
exports = module.exports = {
	up: function(transaction) {
		transaction.sql `CREATE TABLE tests (name TEXT UNIQUE, value INTEGER)`;
		transaction.sql `INSERT INTO tests VALUES ('Martijn', 123)`;
	},

	down: function(lego, queue) {
		transaction.sql `DROP TABLE tests`;
	}
};
```

Lego creates a table to keep track of all the migrations. This migrations table is created in it's own schema, so don't worry about any collisions (unless you are using the `lego` schema).

## CLI

The command line interface supports the following commands:

```
lego migrate:make                    Creates a new migration file.
lego migrate:latest                  Migrates to the latest migration.
lego migrate:rollback                Rolls back the previous migration.
lego migrate:<version>               Migrates or rolls back to the target migration <version>.
```
