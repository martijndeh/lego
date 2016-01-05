# Lego.js
[![Build Status](https://travis-ci.org/martijndeh/lego.svg?branch=master)](https://travis-ci.org/martijndeh/lego)
[![Coverage Status](https://coveralls.io/repos/martijndeh/lego/badge.svg?branch=master)](https://coveralls.io/r/martijndeh/lego?branch=master)

A lightweight SQL (string) builder using ES6 template strings.

```
npm install lego-sql --save
```

Lego embraces SQL instead of adding yet another abstraction layer. It supports client pooling (using pg), transactions and migrations including a cli. Currently,
only PostgreSQL is supported. Feel free to send pull requests! :-)

```js
Lego.new `SELECT * FROM users WHERE name = ${name}`;
```

## Quick start

Lego uses ES6 template strings. From the template string, a parameterized
query is created and passed to the driver. This takes care of sanitizing
the input.

A Lego instance is then-able. This means it's executed when `.then()` is
invoked. You can use it in the following way:
```js
Lego.new `INSERT INTO projects (name) VALUES (${name}) RETURNING *`
	.then(function(projects) {
		return Lego.new `INSERT INTO project_settings (project_id) VALUES (${projects[0].id})`;
	})
	.then(function() {
		// Ready! :-)
	})
```

You can also create an instance and call `Lego#add` multiple times to
construct a more advanced query:
```js
var lego = Lego.new();
lego.add `SELECT * FROM users`;
lego.add `INNER JOIN projects ON projects.user_id = users.id`;

if(sort) {
	lego.add `ORDER BY projects.name`;
}

lego.add `LIMIT 10`;
```

You can combine different Lego instances:
```js
var lego = Lego.new();
lego.add `SELECT * FROM users`;

var whereLego = Lego.new `WHERE users.name = ${name}`;
lego.add(whereLego);

var sortLego = Lego.new `ORDER BY users.created_at DESC`;
lego.add(sortLego);

lego.exec();
```

You can chain calls, if you want:
```js
Lego.new `SELECT * FROM users WHERE name = 'Martijn' LIMIT 1`
	.first()
	.then(function(user) {
		//
	});
```

Obviously, you can write multi-line strings, like the following:
```js
Lego.new `SELECT
		*
	FROM
		users
	WHERE
		role = 'admin'
	LIMIT 1`;
```
(I'm not too sure about the indentation best practices when writing multi-line SQL strings though.)

In `DELETE`, `UPDATE` and `INSERT` queries, when not using a `RETURNING` clause, the number of affected rows is resolved. Otherwise, the rows are resolved.

## Transactions

Transactions are also supported. In the `callback` make sure to return a promise. Based on it being fulfilled or rejected the transaction will, respectively, be commited or rolled back.

```js
Lego.transaction(function(lego) {
	return lego.new `UPDATE money SET value = value + 100`
		.then(function() {
			return lego.new `UPDATE money SET value = value - 100`;
		});
});
```

## Migrations

To create a migration you can simply invoke `lego migrate:make`. This creates an empty migration with an `up` and a `down` method.

Migrations come with a queue so you can easily execute multiple queries (if you're not interested in their return values).

```js
exports = module.exports = {
	up: function(lego, queue) {
		queue.add `CREATE TABLE tests (name TEXT UNIQUE, value INTEGER)`;
		queue.add `INSERT INTO tests VALUES ('Martijn', 123)`;
	},

	down: function(lego, queue) {
		queue.add `DROP TABLE tests`;
	}
};
```

Lego creates a table to keep track of all the migrations. This migrations table is created in it's own schema, so don't worry about any collisions (unless you are using the lego schema).

## CLI

The command line interface supports the following commands:

```
migrate:make                    Creates a new migration file.
migrate:latest                  Migrates to the latest migration.
migrate:rollback                Rolls back the previous migration.
migrate:<version>               Migrates or rolls back to the target migration <version>.
```

### Roadmap

- Implement additional drivers (mysql, etc).
- Add a seeds feature similar to the migrations.
- Extend the public API e.g. add `Lego#pluck`.

### Final note

JSHint W030 is disabled. This was causing an error in `lego.add ..` syntax.
