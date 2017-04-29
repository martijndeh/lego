export default class VirtualDriver {
	constructor(callback) {
		this.callback = callback;
	}

	query(client, sql) {
		this.callback(sql);

		// TODO: Should we return an always-pending promise?
	}
}
