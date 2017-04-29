import Table from './relations/table.js';
import Column from './relations/column.js';
import Index from './relations/index.js';
import Type from './relations/type.js';
import {
	CONSTRAINT_TYPE_NOT_NULL,
	CONSTRAINT_TYPE_DEFAULT,
} from './migrator.js';

const DEFAULT_OPTIONS = {
	allowDeleteInsertSelectUpdateQueries: false,
};

const DROP_REMOVE_TYPE_INDEX = 19;
const DROP_REMOVE_TYPE_TABLE = 32;
const DROP_REMOVE_TYPE_TYPE = 40;

export default class SchemaBuilder {
	// TODO: Can we merge these properties to a single relations map? We basically need to check
	// if naming collisions are allowed. If so, we can't merge them, if not, we can merge them.

	tables = {};
	indices = {};
	types = {};
	options = {}

	constructor(options = DEFAULT_OPTIONS) {
		this.options = options;
	}

	parseCreateStatement(statement, sql) {
		const relationName = statement.relation.RangeVar.relname;

		if (this.getTable(relationName)) {
			throw new Error(`Table with name ${relationName} already exists.`);
		}

		const table = new Table(relationName, sql);

		statement.tableElts.forEach((tableElement) => {
			const {
				ColumnDef,
				Constraint,
			} = tableElement;

			if (ColumnDef) {
				table.addColumn(new Column(ColumnDef.colname, ColumnDef, sql));
			}
			else if (Constraint) {
				console.log(JSON.stringify(Constraint, null, 2));

				// TODO: Add the constrain to the table.
			}
			else {
				console.log(`Unknown table element ${tableElement}`);
			}
		});

		this.tables[table.name] = table;
	}

	parseAlterTableStatement(statement, sql) {
		const relationName = statement.relation.RangeVar.relname;
		const table = this.getTable(relationName);

		if (!this.getTable(relationName)) {
			throw new Error(`Table with name ${relationName} does not exist. ${sql}`);
		}

		statement.cmds.forEach((command) => {
			const {
				subtype,
				behavior,
				def,
				name,
			} = command.AlterTableCmd;

			if (subtype === 0 && behavior === 0) {
				const {
					ColumnDef,
				} = def;

				table.addColumn(new Column(ColumnDef.colname, ColumnDef, sql));
			}
			else if (subtype === 3 && behavior === 0) {
				const column = table.getColumn(name);

				if (def) {
					console.log(`TODO: Add constraint`);

					/*
					raw_expr
						FuncCall
							String.str
							Integer.ival
							Float.str
					*/
				}
				else {
					column.removeConstraint(CONSTRAINT_TYPE_DEFAULT);
				}
			}
			else if (subtype === 4 && behavior === 0) {
				const column = table.getColumn(name);
				column.removeConstraint(CONSTRAINT_TYPE_NOT_NULL);
			}
			else if (subtype === 5 && behavior === 0) {
				const column = table.getColumn(name);
				column.addConstraint(CONSTRAINT_TYPE_NOT_NULL);
			}
			else if (subtype === 10 && behavior === 0) {
				table.removeColumn(name);
			}
			else {
				console.log(`Unknown subtype ${subtype} and behavior ${behavior} combination. What is this? ${sql}`);
			}
		});
	}

	parseRenameStatement(statement) {
		const {
			subname,
			newname,
		} = statement;

		const relationName = statement.relation.RangeVar.relname;
		const table = this.getTable(relationName);

		const column = table.getColumn(subname);
		table.removeColumn(subname);
		column.name = newname;

		// TODO: column.sql is now invalid because the column name is not renamed in the sql.

		table.addColumn(column);
	}

	parseIndexStatement(statement, sql) {
		const {
			idxname,
		} = statement;

		if (this.getIndex(idxname)) {
			throw new Error(`Index with name ${idxname} already exists.`);
		}

		const index = new Index(idxname, statement, sql);
		this.indices[index.name] = index;
	}

	parseCreateEnumStatement(statement, sql) {
		const name = statement.typeName[0].String.str;

		if (this.getType(name)) {
			throw new Error(`Enum type with name ${name} already exists.`);
		}

		this.types[name] = new Type(name, statement, sql);
	}

	parseDropStatement(statement, sql) {
		const {
			removeType,
			behavior,
		} = statement;

		if (removeType === DROP_REMOVE_TYPE_INDEX) {
			const indexName = statement.objects[0][0].String.str;

			if (this.indices[indexName]) {
				delete this.indices[indexName];
			}
			else {
				throw new Error(`Cannot drop index ${indexName} because it does not exist.`);
			}
		}
		else if (removeType === DROP_REMOVE_TYPE_TABLE) {
			const tableName = statement.objects[0][0].String.str;

			if (this.tables[tableName]) {
				delete this.tables[tableName];
			}
			else {
				throw new Error(`Cannot drop table ${tableName} because it does not exist.`);
			}
		}
		else if (removeType === DROP_REMOVE_TYPE_TYPE) {
			const typeName = statement.objects[0][0].TypeName.names[0].String.str;

			if (this.types[typeName]) {
				delete this.types[typeName];
			}
			else {
				throw new Error(`Cannot drop enum type ${typeName} because it does not exist.`);
			}
		}
		else {
			console.log(`Unknown remove type ${removeType} and behavior ${behavior} combination. ${sql}`);
		}
	}

	parseSelectStatement() {
		if (!this.options.allowDeleteInsertSelectUpdateQueries) {
			throw new Error(`SELECT statement is not allowed in your schema definition. Instead, please move any SELECT, DELETE, UPDATE and INSERT queries from your schema to a specific migration.`);
		}
	}

	parseDeleteStatement() {
		if (!this.options.allowDeleteInsertSelectUpdateQueries) {
			throw new Error(`DELETE statement is not allowed in your schema definition. Instead, please move any SELECT, DELETE, UPDATE and INSERT queries from your schema to a specific migration.`);
		}
	}

	parseUpdateStatement() {
		if (!this.options.allowDeleteInsertSelectUpdateQueries) {
			throw new Error(`UPDATE statement is not allowed in your schema definition. Instead, please move any SELECT, DELETE, UPDATE and INSERT queries from your schema to a specific migration.`);
		}
	}

	parseInsertStatement() {
		if (!this.options.allowDeleteInsertSelectUpdateQueries) {
			throw new Error(`INSERT statement is not allowed in your schema definition. Instead, please move any SELECT, DELETE, UPDATE and INSERT queries from your schema to a specific migration.`);
		}
	}

	addQuery(query, sql) {
		if (query.SelectStmt) {
			this.parseSelectStatement(query.SelectStmt, sql);
		}
		else if (query.DeleteStmt) {
			this.parseDeleteStatement(query.DeleteStmt);
		}
		else if (query.UpdateStmt) {
			this.parseUpdateStatement(query.UpdateStmt);
		}
		else if (query.InsertStmt) {
			this.parseInsertStatement(query.InsertStmt);
		}
		else if (query.CreateStmt) {
			this.parseCreateStatement(query.CreateStmt, sql);
		}
		else if (query.AlterTableStmt) {
			this.parseAlterTableStatement(query.AlterTableStmt, sql);
		}
		else if (query.RenameStmt) {
			this.parseRenameStatement(query.RenameStmt, sql);
		}
		else if (query.IndexStmt) {
			this.parseIndexStatement(query.IndexStmt, sql);
		}
		else if (query.CreateEnumStmt) {
			this.parseCreateEnumStatement(query.CreateEnumStmt, sql);
		}
		else if (query.DropStmt) {
			this.parseDropStatement(query.DropStmt, sql);
		}
		else {
			console.log('Unknown query type.');
			console.log(JSON.stringify(query, null, 2));
		}
	}

	getTable(tableName) {
		return this.tables[tableName];
	}

	forEachTable(callback) {
		Object.keys(this.tables).forEach((tableName) => {
			const table = this.tables[tableName];

			callback(table);
		});
	}

	getIndex(indexName) {
		return this.indices[indexName];
	}

	forEachIndex(callback) {
		Object.keys(this.indices).forEach((indexName) => {
			const index = this.indices[indexName];

			callback(index);
		});
	}

	getType(typeName) {
		return this.types[typeName];
	}

	forEachType(callback) {
		Object.keys(this.types).forEach((typeName) => {
			const type = this.types[typeName];

			callback(type);
		});
	}
}
