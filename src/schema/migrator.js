export const CONSTRAINT_TYPE_NOT_NULL = 1;
export const CONSTRAINT_TYPE_DEFAULT = 2;

function isEqual(definitionA, definitionB) {
	// TODO: Implement a better compare function e.g. the order of the properties shouldn't matter.
	// Also, maybe we should ignore the location key as it's value doesn't say anything about the
	// definition itself.

	const replacer = (key, value) => {
		if (key !== 'location') {
			return value;
		}
	};

	return JSON.stringify(definitionA, replacer) === JSON.stringify(definitionB, replacer);
}

function getColumnSql(sql, column) {
	let min = -1;
	let max = -1;

	function setLocation(value) {
		if (min === -1) {
			min = value;
		}
		else if (value < min) {
			min = value;
		}

		if (max === -1) {
			max = value;
		}
		else if (value > max) {
			max = value;
		}
	}

	function find(object) {
		if (Array.isArray(object)) {
			object.forEach((value) => {
				find(value);
			});
		}
		else {
			Object.keys(object).forEach((key) => {
				const value = object[key];

				if (typeof value === 'object') {
					find(value);
				}
				else if (key === 'location') {
					setLocation(value);
				}
			});
		}
	}

	find(column.definition);

	function getMinPosition(max, ...args) {
		return args.reduce((current, value) => {
			if (value !== -1 && (current === -1 || value < current)) {
				return value;
			}

			return current;
		}, max);
	}

	max = getMinPosition(sql.length, sql.indexOf(',', max), sql.indexOf('\n', max));

	return sql.substring(min, max);
}

export default class SchemaMigrator {
	targetSchema = null;
	currentSchema = null;
	up = [];
	down = [];

	constructor(targetSchema, currentSchema) {
		this.targetSchema = targetSchema;
		this.currentSchema = currentSchema;
	}

	dropTable(table) {
		this.up.push(`DROP TABLE ${table.name}`);
		this.down.push(`CREATE TABLE ${table.name} (
			${Object.keys(table.columns)
				.map((columnName) => {
					const column = table.getColumn(columnName);

					return getColumnSql(column.sql, column);
				})
				.join(',\n')}
		)`);
	}

	createTable(table) {
		this.up.push(table.sql);
		this.down.push(`DROP TABLE ${table.name}`);
	}

	dropColumn(table, column) {
		this.up.push(`ALTER TABLE ${table.name} DROP COLUMN ${column.name}`);
		this.down.push(`ALTER TABLE ${table.name} ADD COLUMN ${getColumnSql(column.sql, column)}`);
	}

	createColumn(table, column) {
		this.up.push(`ALTER TABLE ${table.name} ADD COLUMN ${getColumnSql(column.sql, column)}`);
		this.down.push(`ALTER TABLE ${table.name} DROP COLUMN ${column.name}`);
	}

	createConstraint(table, column, constraint) {
		switch (constraint.contype) {
		case CONSTRAINT_TYPE_NOT_NULL:
			this.up.push(`ALTER TABLE ${table.name} ALTER COLUMN ${column.name} SET NOT NULL`);
			this.down.push(`ALTER TABLE ${table.name} ALTER COLUMN ${column.name} DROP NOT NULL`);
			break;

		case CONSTRAINT_TYPE_DEFAULT:
			console.log(`Constraint: ${column.sql.substring(constraint.location)}`);

			this.up.push(`ALTER TABLE ${table.name} ALTER COLUMN ${column.name} SET DEFAULT`);
			this.down.push(`ALTER TABLE ${table.name} ALTER COLUMN ${column.name} DROP DEFAULT`);

			throw new Error(`Unknown constraint type ${constraint.contype}. ${JSON.stringify(constraint, null, 2)}`);
			break;

		default:
			throw new Error(`Unknown constraint type ${constraint.contype}. ${JSON.stringify(constraint, null, 2)}`);
		}
	}

	dropConstraint(table, column, constraint) {
		switch (constraint.contype) {
		case CONSTRAINT_TYPE_NOT_NULL:
			this.up.push(`ALTER TABLE ${table.name} ALTER COLUMN ${column.name} DROP NOT NULL`);
			this.down.push(`ALTER TABLE ${table.name} ALTER COLUMN ${column.name} SET NOT NULL`);
			break;

		// TODO: Add CONSTRAINT_TYPE_DEFAULT.

		default:
			throw new Error(`Unknown constraint type ${constraint.contype}. ${JSON.stringify(constraint, null, 2)}`);
		}
	}

	createTableMigrations() {
		const currentTables = this.currentSchema.tables;
		const targetTables = this.targetSchema.tables;
		const allTables = {
			...currentTables,
			...targetTables,
		};

		Object.keys(allTables).forEach((tableName) => {
			const table = allTables[tableName];

			const currentTable = currentTables[tableName];
			const targetTable = targetTables[tableName];

			const isRemoved = !targetTable;
			const isAdded = !currentTable;

			if (isRemoved) {
				this.dropTable(table);
			}
			else if (isAdded) {
				this.createTable(table);
			}
			else {
				const currentColumns = currentTable.columns;
				const targetColumns = targetTable.columns;
				const allColumns = {
					...currentColumns,
					...targetColumns,
				};

				Object.keys(allColumns).forEach((columnName) => {
					const column = allColumns[columnName];
					const currentColumn = currentColumns[columnName];
					const targetColumn = targetColumns[columnName];

					const isRemoved = !targetColumn;
					const isAdded = !currentColumn;

					if (isRemoved) {
						this.dropColumn(table, column);
					}
					else if (isAdded) {
						this.createColumn(table, column);
					}
					else {
						if (!isEqual(currentColumn.definition.typeName, targetColumn.definition.typeName)) {
							// TODO: This is a type change we should support.

							throw new Error(`Unsupported migration of column ${table.name}.${currentColumn.name}.\n\n${currentColumn.sql}\n\n${targetColumn.sql}`);
						}

						const currentConstraints = currentColumn.getConstraints();
						const targetConstraints = targetColumn.getConstraints();
						const allConstraints = {
							...currentConstraints,
							...targetConstraints,
						};

						Object.keys(allConstraints).forEach((constraintType) => {
							const constraint = allConstraints[constraintType];
							const targetConstraint = targetConstraints[constraintType];
							const currentConstraint = currentConstraints[constraintType];

							const isRemoved = !targetConstraint;
							const isAdded = !currentConstraint;

							// TODO: Instead of trying to alter the column per constraint, can we
							// alter the column with all constraints in mind e.g. set not null and set
							// default?

							if (isRemoved) {
								this.dropConstraint(table, column, constraint);
							}
							else if (isAdded) {
								this.createConstraint(table, column, constraint);
							}
							else {
								// TODO: Check if the constraint was changed. E.g. a default can
								// change it's value. If so, throw an error that this is not
								// supported yet.

								if (!isEqual(currentConstraint, targetConstraint)) {
									throw new Error(`Unsupported constraint change.`);
								}
							}
						});
					}
				});
			}
		});
	}

	createIndexMigrations() {
		const currentIndices = this.currentSchema.indices;
		const targetIndices = this.targetSchema.indices;
		const allIndices = {
			...currentIndices,
			...targetIndices,
		};

		Object.keys(allIndices).forEach((indexName) => {
			const index = allIndices[indexName];
			const currentIndex = currentIndices[indexName];
			const targetIndex = targetIndices[indexName];

			const isRemoved = !targetIndex;
			const isAdded = !currentIndex;

			if (isRemoved) {
				this.up.push(`DROP INDEX ${index.name}`);
				this.down.push(index.sql);
			}
			else if (isAdded) {
				this.up.push(index.sql);
				this.down.push(`DROP INDEX ${index.name}`);
			}
			else {
				// TODO: Check if the index changed. If so, we drop the index and re-create it?
			}
		});
	}

	createTypeMigrations() {
		const currentTypes = this.currentSchema.types;
		const targetTypes = this.targetSchema.types;
		const allTypes = {
			...currentTypes,
			...targetTypes,
		};

		Object.keys(allTypes).forEach((typeName) => {
			const type = allTypes[typeName];
			const currentType = currentTypes[typeName];
			const targetType = targetTypes[typeName];

			const isRemoved = !targetType;
			const isAdded = !currentType;

			if (isRemoved) {
				this.up.push(`DROP TYPE ${type.name}`);
				this.down.push(type.sql);
			}
			else if (isAdded) {
				this.up.push(type.sql);
				this.down.push(`DROP TYPE ${type.name}`);
			}
			else {
				// TODO: Check if the type changed.
			}
		});
	}

	create() {
		// Until there is some sorting in place, it's important we first migrate the types. Because
		// the types are likely used in the table migrations. So the types need to exist first.
		this.createTypeMigrations();

		this.createTableMigrations();

		this.createIndexMigrations();

		// TODO: Now sort the up and down queries to make sure the references are correct.
		// TODO: Validate all the generate queries if they are syntactically correct.

		return {
			up: this.up,
			down: this.down,
		};
	}
}
