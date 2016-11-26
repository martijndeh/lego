# Lego.js
[![Build Status](https://travis-ci.org/martijndeh/lego.svg?branch=master)](https://travis-ci.org/martijndeh/lego)
[![Coverage Status](https://coveralls.io/repos/martijndeh/lego/badge.svg?branch=master&service=github)](https://coveralls.io/github/martijndeh/lego?branch=master)

A lightweight SQL (string) builder using ES6 template strings. Lego embraces SQL instead of adding yet another abstraction layer.

```js
Lego.sql `SELECT * FROM users WHERE name = ${name}`;
```

Lego does not do simple string concatenation. Instead, Lego creates parameterized queries. For example, the following statement is creates from the previous query:

```sql
SELECT * FROM users WHERE name = $1
```

## Breaking changes in 2.x

- `Lego#sql` now memoizes the query's result.
- Queries in transactions now always get executed in series, in chronological order instead of the returned `Lego#sql` first and then the other queries.
- The internal API has changed. If you were depending on private methods please review your code.

## Quick start

Lego uses ES6 template strings. From the template string, a parameterized query is created and passed to the driver. The driver creates a pool of connections with the url from `process.env.DATABASE_URL`.

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

Which creates and executes the query `INSERT INTO projects (name) VALUES ($1), ($2)`.

### Lego#append

In some cases, you want to append a statement:

```js
const lego = Lego.sql `SELECT * FROM tests`;

if (shouldOrderBy) {
	lego.append `ORDER BY value`;
}
```

### Lego#first

Or if you just want to first result from a query (or null if there were not results):

```js
Lego.sql `SELECT * FROM accounts LIMIT 1`
	.first()
	.then((account) => {
		// account is the first row from the query, or null if no rows were found.
	});
```

### Return value

`Lego.sql` returns a Promise-like object and the query is executed when `.then(..)` is invoked. The Promise is resolved with the query's result.

In `DELETE`, `UPDATE` and `INSERT` queries, when not using a `RETURNING` clause, the number of affected rows is resolved. Otherwise, the row data is resolved.

## Rows to objects

Lego makes it easy to parse rows and transform them to objects. Consider the following rows:

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

These rows are flat but do contain 1 root object and 2 child objects. Something like the below:

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

The definition object describes how to map columns and rows to objects. Every property refers to a column
name.

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
			createdAt: 'created_at',
			members: [{
				id: 'member_id',
				name: 'member_name',
				email: 'member_email',
				joinedAt: 'member_joined_at'
			}]
		})
	})
	.then((project) => {
		//
	})
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

Or use the transaction's queue which invokes the queries in series:

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

To create a migration you can simply invoke `lego migrate:make`. This creates an empty migration with an `up` and a `down` function in which you can write your queries to alter your database.

To execute migrations, simply invoke `lego migrate:latest`. Migrations are executed in a transaction. The transaction is passed as argument in the migrate functions.

```js
export function up(transaction) {
	transaction.sql `CREATE TABLE tests (name TEXT UNIQUE, value INTEGER)`;
	transaction.sql `INSERT INTO tests VALUES ('Martijn', 123)`;
}

export function down(transaction) {
	transaction.sql `DROP TABLE tests`;
}
```

Lego creates a `migrations` table to keep track of all the migrations. This migrations table is created in it's own schema called `lego`, so don't worry about any collisions.

To execute your migrations when you call `npm run release` you should add a run script to your `package.json`:

```json
"release": "node -r babel-register ./node_modules/.bin/lego migrate:latest",
```

## CLI

The command line interface supports the following commands:

```
lego version                         Prints the version of Lego.
lego migrate:make                    Creates a new migration file.
lego migrate:latest                  Migrates to the latest migration.
lego migrate:rollback                Rolls back the previous migration.
lego migrate:<version>               Migrates or rolls back to the target migration <version>.
```
