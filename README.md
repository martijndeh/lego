# Lego.js
[![Build Status](https://travis-ci.org/martijndeh/lego.svg?branch=master)](https://travis-ci.org/martijndeh/lego)
[![Coverage Status](https://coveralls.io/repos/martijndeh/lego/badge.svg?branch=master&service=github)](https://coveralls.io/github/martijndeh/lego?branch=master)

A SQL (string) builder using ES6 template strings. Lego embraces SQL instead of adding yet another abstraction layer. It automatically generates your migrations based on your evolving schema.

From the below call:

```js
Lego.sql `SELECT * FROM users WHERE name = ${name}`;
```

Lego creates the following query:

```sql
SELECT * FROM users WHERE name = $1
```

## Quick start

Lego uses ES6 template strings. From the template string, a parameterized query is created and passed to the driver. The driver creates a pool of connections using the connecting string from `process.env.DATABASE_URL`.

```js
Lego.sql `INSERT INTO projects (name) VALUES (${name}) RETURNING *`
	.then((projects) => {
		return Lego.sql `INSERT INTO project_settings (project_id) VALUES (${projects[0].id})`;
	})
	.then(() => {
		// Ready! :-)
	})
```

You can also append queries, merge queries and add raw strings. See https://github.com/martijndeh/lego/blob/master/test/query.js.

## Rows to JSON

Lego makes it easy to parse rows and transform them to objects. Consider the following rows:

These rows are flat but do contain 1 root object and 2 child objects. You can transform the rows by simply passing the rows to Lego's parse system and providing a definition object:
```js
Lego.sql `SELECT * FROM projects INNER JOIN tests ON tests.project_id = projects.id`
	.parse([{
		id: 'id',
		tests: [{
			id: 'test_id',
			name: 'test_name',
		}],
	}]);
```

The query returns the following rows:
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

But they are parsed and transformed to the following objects:
```js
const projects = [{
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

You can also use functions to transform a column's value. You can also define single objects, instead of arrays. See https://github.com/martijndeh/lego/blob/master/test/parse.js.

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

Or you can invoke multiple queries and they get invoked in series. See https://github.com/martijndeh/lego/blob/master/test/transaction.js.

## Automatic Migrations (beta)

You can manage your schema and Lego automatically generates your migrations. This gives you the productivity of an ORM but the speed and power of raw SQL.

In `schema/users.js`:
```js
export default function createSchema(transaction) {
	transaction.sql `CREATE TABLE users (
		id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
	)`;
}
```

Run `lego generate-migration` creates `migrations/001.js`:
```js
export function up(transaction) {
	transaction.sql `CREATE TABLE users (
		id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
	)`;
}

export function down(transaction) {
	transaction.sql `DROP TABLE users`;
}
```

Now, when you edit your schema by e.g. adding a new column to the users table, and you run `lego generate-migration` again, Lego loads all your migrations, loads your schema and generates a new migration, automatically.

Change `schema/users.js`:
```js
export default function createSchema(transaction) {
	transaction.sql `CREATE TABLE users (
		id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
		name TEXT NOT NULL
	)`;
}
```

Which generates `migrations/002.js`:
```js
export function up(transaction) {
	transaction.sql `ALTER TABLE users ADD COLUMN name TEXT NOT NULL`;
}

export function down(transaction) {
	transaction.sql `ALTER TABLE users DROP COLUMN name`;
}
```

To execute migrations, simply invoke `lego migrate:latest`. Migrations are executed in a transaction.

Lego creates a `migrations` table to keep track of all the migrations. This migrations table is created in it's own schema called `lego`, so don't worry about any collisions.

## CLI

The command line interface supports the following commands:

```
lego version                         Prints the version of Lego.
lego migrate:make                    Generates a new migration file based on changes in your schema.
lego migrate:empty                   Creates an empty migration file.
lego migrate:latest                  Migrates to the latest migration.
lego migrate:rollback                Rolls back the previous migration.
lego migrate:<version>               Migrates or rolls back to the target migration <version>.
```

## Environment variables

Variable | Description
---------|-------------
`DATABASE_URL` | The connection string to the database.
`LEGO_DISABLE_SSL` | By default, Lego requires an SSL connection to the database. To disable this, you can set the `LEGO_DISABLE_SSL` environment variable to `false`.
`LEGO_MAX_POOL_SIZE` | Sets the maximum pool size. If you don't set the max pool size, the [driver](https://www.npmjs.com/package/pg) sets a default value.
`LEGO_MIN_POOL_SIZE` | Sets the minimum pool size. If you don't set the min pool size, the [driver](https://www.npmjs.com/package/pg) sets a default value.
