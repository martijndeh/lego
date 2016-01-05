'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pg = require('pg');
var debug = require('debug')('lego:sql');

exports = module.exports = (function () {
	function PostgresDriver(databaseURL) {
		_classCallCheck(this, PostgresDriver);

		this._databaseURL = databaseURL;
	}

	_createClass(PostgresDriver, [{
		key: 'setPoolIdleTimeout',
		value: function setPoolIdleTimeout(timeout) {
			pg.defaults.poolIdleTimeout = timeout;
		}
	}, {
		key: 'connect',
		value: function connect() {
			var self = this;
			return new Promise(function (resolve, reject) {
				pg.connect(self._databaseURL, function (error, client, done) {
					if (error) {
						reject(error);
					} else {
						resolve({
							client: client,
							done: done
						});
					}
				});
			});
		}
	}, {
		key: 'query',
		value: function query(client, text, parameters) {
			debug(text, parameters);

			return new Promise(function (resolve, reject) {
				client.query(text, parameters, function (error, result) {
					if (error) {
						reject(error);
					} else {
						if ((result.oid === 0 || isNaN(result.oid) || result.oid === null) && result.fields.length === 0) {
							resolve(result.rowCount);
						} else {
							resolve(result.rows);
						}
					}
				});
			});
		}
	}, {
		key: 'exec',
		value: function exec(text, parameters) {
			var self = this;
			return this.connect().then(function (driver) {
				return self.query(driver.client, text, parameters).then(function (result) {
					driver.done();

					return result;
				}).catch(function (error) {
					driver.done();

					throw error;
				});
			});
		}
	}, {
		key: 'beginTransaction',
		value: function beginTransaction() {
			var self = this;
			return this.connect().then(function (driver) {
				return self.query(driver.client, 'BEGIN', []).then(function () {
					return driver;
				});
			});
		}
	}, {
		key: 'commitTransaction',
		value: function commitTransaction(transaction) {
			return this.query(transaction, 'COMMIT', []);
		}
	}, {
		key: 'rollbackTransaction',
		value: function rollbackTransaction(transaction) {
			return this.query(transaction, 'ROLLBACK', []);
		}
	}]);

	return PostgresDriver;
})();