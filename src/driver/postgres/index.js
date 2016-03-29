const pg = require('pg');
const debug = require('debug')('lego:sql');

export function setPoolIdleTimeout(timeout) {
	pg.defaults.poolIdleTimeout = timeout;
}

export class PostgresDriver {
	constructor(databaseURL) {
		this.$$databaseURL = databaseURL;
	}

	connect() {
		return new Promise((resolve, reject) => {
			pg.connect(this.$$databaseURL, function (error, client, done) {
				if (error) {
					reject(error);
				}
				else {
					resolve({
						client: client,
						done: done,
					});
				}
			});
		});
	}

	query(client, text, parameters) {
		debug(text, parameters);

		return new Promise(function (resolve, reject) {
			client.query(text, parameters, function (error, result) {
				if (error) {
					error.query = text;
					reject(error);
				}
				else {
					if ((result.oid === 0 || isNaN(result.oid) || result.oid === null) && result.fields.length === 0) {
						resolve(result.rowCount);
					}
					else {
						resolve(result.rows);
					}
				}
			});
		});
	}

	exec(text, parameters) {
		return this.connect()
			.then((driver) => {
				return this.query(driver.client, text, parameters)
					.then((result) => {
						driver.done();

						return result;
					})
					.catch((error) => {
						driver.done();

						throw error;
					});
			});
	}

	beginTransaction() {
		return this.connect()
			.then((driver) => {
				return this.query(driver.client, 'BEGIN', [])
					.then(function () {
						return driver;
					});
			});
	}

	commitTransaction(client) {
		return this.query(client, 'COMMIT', []);
	}

	rollbackTransaction(client) {
		return this.query(client, 'ROLLBACK', []);
	}
};
