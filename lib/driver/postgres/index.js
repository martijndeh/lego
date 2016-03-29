'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.setPoolIdleTimeout = setPoolIdleTimeout;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pg = require('pg');
var debug = require('debug')('lego:sql');

function setPoolIdleTimeout(timeout) {
	pg.defaults.poolIdleTimeout = timeout;
}

var PostgresDriver = exports.PostgresDriver = (function () {
	function PostgresDriver(databaseURL) {
		_classCallCheck(this, PostgresDriver);

		this.$$databaseURL = databaseURL;
	}

	_createClass(PostgresDriver, [{
		key: 'connect',
		value: function connect() {
			var _this = this;

			return new Promise(function (resolve, reject) {
				pg.connect(_this.$$databaseURL, function (error, client, done) {
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
						error.query = text;
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
			var _this2 = this;

			return this.connect().then(function (driver) {
				return _this2.query(driver.client, text, parameters).then(function (result) {
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
			var _this3 = this;

			return this.connect().then(function (driver) {
				return _this3.query(driver.client, 'BEGIN', []).then(function () {
					return driver;
				});
			});
		}
	}, {
		key: 'commitTransaction',
		value: function commitTransaction(client) {
			return this.query(client, 'COMMIT', []);
		}
	}, {
		key: 'rollbackTransaction',
		value: function rollbackTransaction(client) {
			return this.query(client, 'ROLLBACK', []);
		}
	}]);

	return PostgresDriver;
})();

;