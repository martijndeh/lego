export default class Table {
	name = null;
	sql = null;
	columns = {};

	constructor(name, sql) {
		this.name = name;
		this.sql = sql;
	}

	addColumn(column) {
		this.columns[column.name] = column;
	}

	removeColumn(columnName) {
		delete this.columns[columnName];
	}

	getColumn(name) {
		return this.columns[name];
	}

	forEachColumn(callback) {
		Object.keys(this.columns).forEach((columnName) => {
			const column = this.columns[columnName];

			callback(column);
		});
	}
}
