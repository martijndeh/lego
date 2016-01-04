# Lego.js

A lightweight SQL (string) builder using ES6 template strings.

```
npm install lego-sql --save
```

Lego embraces SQL instead of adding yet another abstraction layer. Currently,
only PostgreSQL is supported. Feel free to send pull requests! :-)

```js
Lego.new `SELECT * FROM users WHERE name = ${name}`;
```

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

JSHint W030 is disabled. This was causing an error in `lego.add ..` syntax.

# Roadmap
- Add more dialects.
- Should we add something like pool2 for the connection pooling?
- Add additional methods like `.pluck`?
- Create a CLI (a separate project?) to run migrations.
