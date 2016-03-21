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
query is created and passed to the driver. This takes care of sanitizing
the input.

A Lego instance is then-able. This means it's executed when `.then()` is
invoked. You can use it in the following way:
```js
Lego.sql `INSERT INTO projects (name) VALUES (${name}) RETURNING *`
	.then(function (projects) {
		return Lego.sql `INSERT INTO project_settings (project_id) VALUES (${projects[0].id})`;
	})
	.then(function () {
		// Ready! :-)
	})
```

You can also create an instance and call `Lego#add` multiple times to
construct a more advanced query:
```js
var lego = Lego.sql();
lego.append `SELECT * FROM users`;
lego.append `INNER JOIN projects ON projects.user_id = users.id`;

if(sort) {
	lego.append `ORDER BY projects.name`;
}

lego.append `LIMIT 10`;
```

You can combine different Lego instances:
```js
var lego = Lego.sql();
lego.append `SELECT * FROM users`;

var whereLego = Lego.sql `WHERE users.name = ${name}`;
lego.add(whereLego);

var sortLego = Lego.sql `ORDER BY users.created_at DESC`;
lego.add(sortLego);

lego.exec();
```

You can chain calls, if you want:
```js
Lego.sql `SELECT * FROM users WHERE name = 'Martijn' LIMIT 1`
	.first()
	.then(function (user) {
		//
	});
```

Obviously, you can write multi-line strings, like the following:
```js
Lego.sql `SELECT
		*
	FROM
		users
	WHERE
		role = 'admin'
	LIMIT 1`;
```
(I'm not too sure about the indentation best practices when writing multi-line SQL strings though.)

You can also nest arrays of lego instances:
```js
Lego.sql `INSERT INTO projects (name) VALUES ${projects.map((project) => Lego.sql `(${project.name})`)}`;
```

In `DELETE`, `UPDATE` and `INSERT` queries, when not using a `RETURNING` clause, the number of affected rows is resolved. Otherwise, the rows are resolved.

## Data mapper

Lego makes it easy to parse rows and transform them to objects. Consider the below rows:

```js
var rows = [{
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
var objects = [{
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

Transactions are also supported. In the `callback` make sure to return a promise. Based on it being fulfilled or rejected the transaction will, respectively, be commited or rolled back.

```js
Lego.transaction(function (lego) {
	return lego.sql `UPDATE money SET value = value + 100`
		.then(function () {
			return lego.sql `UPDATE money SET value = value - 100`;
		});
});
```

## Migrations

To create a migration you can simply invoke `lego migrate:make`. This creates an empty migration with an `up` and a `down` method.

Migrations come with a queue so you can easily execute multiple queries (if you're not interested in their return values). The queries are executed in sequential order (and not in parallel).

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
lego migrate:make                    Creates a new migration file.
lego migrate:latest                  Migrates to the latest migration.
lego migrate:rollback                Rolls back the previous migration.
lego migrate:<version>               Migrates or rolls back to the target migration <version>.
```

### Roadmap

- Implement decorators as soon as they enter phase 2.
- Implement additional drivers (mysql, etc).
- Add a seeds feature similar to the migrations.
- Extend the public API e.g. add `Lego#pluck`.

### Final note

JSHint W030 is disabled. This was causing an error in `lego.add ..` syntax.
