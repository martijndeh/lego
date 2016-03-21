const pg = require('pg');
const debug = require('debug')('lego:sql');

exports = module.exports = class PostgresDriver {
	constructor(databaseURL) {
		this._databaseURL = databaseURL;
	}

	setPoolIdleTimeout(timeout) {
		pg.defaults.poolIdleTimeout = timeout;
	}

	connect() {
		var self = this;
		return new Promise(function(resolve, reject) {
			pg.connect(self._databaseURL, function(error, client, done) {
				if(error) {
					reject(error);
				}
				else {
					resolve({
						client: client,
						done: done
					});
				}
			});
		});
	}

	query(client, text, parameters) {
		debug(text, parameters);

		return new Promise(function(resolve, reject) {
			client.query(text, parameters, function(error, result) {
				if(error) {
					error.query = text;
					reject(error);
				}
				else {
					if((result.oid === 0 || isNaN(result.oid) || result.oid === null) && result.fields.length === 0) {
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
		var self = this;
		return this.connect()
			.then(function (driver) {
				return self.query(driver.client, text, parameters)
					.then(function (result) {
						driver.done();

						return result;
					})
					.catch(function (error) {
						driver.done();

						throw error;
					});
			});
	}

	beginTransaction() {
		var self = this;
		return this.connect()
			.then(function (driver) {
				return self.query(driver.client, 'BEGIN', [])
					.then(function () {
						return driver;
					});
			});
	}

	commitTransaction(transaction) {
		return this.query(transaction, 'COMMIT', []);
	}

	rollbackTransaction(transaction) {
		return this.query(transaction, 'ROLLBACK', []);
	}
};
