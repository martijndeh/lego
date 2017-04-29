import { parse } from 'pg-query-parser';
import SchemaBuilder from './builder.js';
import autobind from 'autobind-decorator';
import VirtualDriver from './driver.js';
import Transaction from '../transaction/index.js';
import SchemaMigrator from './migrator.js';

export default class SchemaManager {
	schema = new SchemaBuilder();
	migrationsSchema = new SchemaBuilder({
		allowDeleteInsertSelectUpdateQueries: true,
	});

	@autobind _onSchemaQuery(sql) {
		const construct = parse(sql);

		// TODO: If we have multiple queries in a string, we likely will not be able to get the
		// column's type information from the query. Should we just disallow it for now?

		construct.query.forEach((query) => {
			this.schema.addQuery(query, sql);
		});
	}

	@autobind _onMigrationQuery(sql) {
		const construct = parse(sql);

		construct.query.forEach((query) => {
			this.migrationsSchema.addQuery(query, sql);
		});
	}

	defineSchema(callback) {
		const driver = new VirtualDriver(this._onSchemaQuery);
		const transaction = new Transaction(driver);

		callback(transaction);

		return transaction.execAll();
	}

	addMigration(callback) {
		const driver = new VirtualDriver(this._onMigrationQuery);
		const transaction = new Transaction(driver);

		callback(transaction);

		return transaction.execAll();
	}

	createMigration() {
		const migrator = new SchemaMigrator(this.schema, this.migrationsSchema);
		return migrator.create();
	}
}
