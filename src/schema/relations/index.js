export default class Index {
	name = null;
	definition = null;
	sql = null;

	constructor(name, definition, sql) {
		this.name = name;
		this.definition = definition;
		this.sql = sql;
	}
}
