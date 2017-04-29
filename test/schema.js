import assert from 'assert';
import SchemaManager from '../src/schema/schema.js';

function assertEqualQueries(queries, otherQueries) {
	function trim(text) {
		// TODO: Maybe we should count the number of tabs on the first line, and strip that number
		// from every line?

		if (text) {
			return text.split('\n')
				.map((line) => line.replace(/^\s+/g, ''))
				.join('\n');
		}
	}

	queries.forEach((query, index) => {
		const otherQuery = otherQueries[index];

		assert.equal(trim(query), trim(otherQuery));
	});

	assert.equal(queries.length, otherQueries.length);
}

describe('schema', () => {
	it('should create migrations from initial schema', async () => {
		const schemaManager = new SchemaManager();

		function createSchema(transaction) {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		}

		await schemaManager.defineSchema(createSchema);

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`CREATE TABLE accounts (
			id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
			created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`]);
		assertEqualQueries(migration.down, [`DROP TABLE accounts`]);
	});

	it('remove column from schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`ALTER TABLE accounts DROP COLUMN created_at`]);
		assertEqualQueries(migration.down, [`ALTER TABLE accounts ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`]);
	});

	it('add column to schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
			)`;
		});

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`ALTER TABLE accounts ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`]);
		assertEqualQueries(migration.down, [`ALTER TABLE accounts DROP COLUMN created_at`]);
	});

	it('no changes in schema after create table and alter table add column', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`;
		});

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('no changes in schema after create table and alter table drop column', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts DROP COLUMN created_at`;
		});

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('remove table from schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;

			transaction.sql `CREATE TABLE users (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
			)`;
		});

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`DROP TABLE users`]);
		assertEqualQueries(migration.down, [`CREATE TABLE users (
			id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
		)`]);
	});

	it('add table to schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`CREATE TABLE accounts (
			id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
			created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`]);
		assertEqualQueries(migration.down, [`DROP TABLE accounts`]);
	});

	it('no changes in schema after rename column in migration', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				creted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts RENAME COLUMN creted_at TO created_at`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('add index to schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE INDEX test_index ON accounts (created_at)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`CREATE INDEX test_index ON accounts (created_at)`]);
		assertEqualQueries(migration.down, [`DROP INDEX test_index`]);
	});

	it('remove index from schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			//
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE INDEX test_index ON accounts (created_at)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`DROP INDEX test_index`]);
		assertEqualQueries(migration.down, [`CREATE INDEX test_index ON accounts (created_at)`]);
	});

	it('create and remove index from schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			//
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE INDEX test_index ON accounts (created_at)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `DROP INDEX test_index`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('add type to schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TYPE event_types AS ENUM ('enter', 'exit')`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`CREATE TYPE event_types AS ENUM ('enter', 'exit')`]);
		assertEqualQueries(migration.down, [`DROP TYPE event_types`]);
	});

	it('remove type from schema', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema(() => {
			//
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TYPE event_types AS ENUM ('enter', 'exit')`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`DROP TYPE event_types`]);
		assertEqualQueries(migration.down, [`CREATE TYPE event_types AS ENUM ('enter', 'exit')`]);
	});

	it('should alter column and drop not null', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`ALTER TABLE accounts ALTER COLUMN created_at DROP NOT NULL`]);
		assertEqualQueries(migration.down, [`ALTER TABLE accounts ALTER COLUMN created_at SET NOT NULL`]);
	});

	it('should not create migration after alter column and drop not null', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts ALTER COLUMN created_at DROP NOT NULL`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('should not create migration after alter column and set not null', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts ALTER COLUMN created_at SET NOT NULL`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('should disallow insert, delete, update, select statements in schema', async () => {
		const schemaManager = new SchemaManager();

		try {
			await schemaManager.defineSchema((transaction) => {
				transaction.sql `SELECT * FROM accounts`;
				transaction.sql `DELETE FROM accounts`;
				transaction.sql `UPDATE accounts SET value = 1`;
				transaction.sql `INSERT INTO accounts (name) VALUES ('Martijn')`;
			});

			assert.equal(true, false);
		}
		catch (e) {
			assert.equal(e.message, 'SELECT statement is not allowed in your schema definition. Instead, please move any SELECT, DELETE, UPDATE and INSERT queries from your schema to a specific migration.');
		}
	});

	it('should ignore insert, delete, update, select statements in migrations', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.addMigration((transaction) => {
			transaction.sql `SELECT * FROM accounts`;
			transaction.sql `DELETE FROM accounts`;
			transaction.sql `UPDATE accounts SET value = 1`;
			transaction.sql `INSERT INTO accounts (name) VALUES ('Martijn')`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('should alter column and drop default', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		assert.throws(() => schemaManager.createMigration());
	});

	it('should not create migration after alter column and drop default', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts ALTER COLUMN created_at DROP DEFAULT`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('should not create migration after alter column and set default', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, []);
		assertEqualQueries(migration.down, []);
	});

	it('should throw unsupported error to change default', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `ALTER TABLE accounts ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP`;
		});

		schemaManager.createMigration();

		assert.throws(() => schemaManager.createMigration(), /^test/);
	});

	it('should throw unsupported error for changes we don\'t support yet', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TIMESTAMP
			)`;
		});

		await schemaManager.addMigration((transaction) => {
			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				created_at TEXT
			)`;
		});

		assert.throws(() => schemaManager.createMigration(), /^Error: Unsupported migration of column accounts\.created_at/);
	});

	it('should create migration with inline primary key', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE account_unsubscribes (
				account_id			UUID NOT NULL REFERENCES accounts(id),
				test_id UUID,

				PRIMARY KEY (account_id, test_id)
			)`;
		});

		const migration = schemaManager.createMigration();

		console.log(migration);
	});

	/*
	it('should sort', async () => {
		const schemaManager = new SchemaManager();

		await schemaManager.defineSchema((transaction) => {
			transaction.sql `CREATE TABLE account_tokens (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				account_id UUID NOT NULL REFERENCES accounts(id)
			)`;

			transaction.sql `CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
			)`;
		});

		const migration = schemaManager.createMigration();

		assertEqualQueries(migration.up, [`CREATE TABLE accounts (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
			)`,
			`CREATE TABLE account_tokens (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				account_id UUID NOT NULL REFERENCES accounts(id)
			)`,
		]);
		assertEqualQueries(migration.down, [`DROP TABLE account_tokens`, `DROP TABLE accounts`]);
	});
	*/

	// it('should set default')
	// it('should drop default')
	// it('should alter type')
});
