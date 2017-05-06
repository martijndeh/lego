'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.createTransaction = createTransaction;

var _index = require('../lego/index.js');

var _index2 = _interopRequireDefault(_index);

var _index3 = require('../driver/index.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Transaction = function () {
	function Transaction(driver) {
		_classCallCheck(this, Transaction);

		this.driver = driver;
		this.client = null;
		this.queue = [];
	}

	_createClass(Transaction, [{
		key: 'getDriver',
		value: function getDriver() {
			return this.driver;
		}
	}, {
		key: 'getClient',
		value: function getClient() {
			return this.client;
		}
	}, {
		key: 'begin',
		value: function begin() {
			var _this = this;

			return this.driver.beginTransaction().then(function (client) {
				_this.client = client;
			});
		}
	}, {
		key: 'commit',
		value: function commit() {
			var _this2 = this;

			if (this.client == null) {
				throw new Error();
			}

			return this.driver.commitTransaction(this.client).then(function () {
				_this2.client.release();
			});
		}
	}, {
		key: 'rollback',
		value: function rollback() {
			var _this3 = this;

			if (this.client == null) {
				throw new Error();
			}

			return this.driver.rollbackTransaction(this.client).then(function () {
				_this3.client.release();
			}).catch(function (error) {
				_this3.client.release(error);
				return Promise.reject(error);
			});
		}
	}, {
		key: 'sql',
		value: function sql(strings) {
			for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				parameters[_key - 1] = arguments[_key];
			}

			var lego = new _index2.default(strings, parameters);
			lego.setTransaction(this);
			this.queue.push(lego);
			return lego;
		}
	}, {
		key: 'numberOfPendingQueries',
		value: function numberOfPendingQueries() {
			return this.queue.length;
		}
	}, {
		key: 'execAll',
		value: function execAll() {
			var result = Promise.resolve(true);

			this.queue.forEach(function (lego) {
				result = result.then(function () {
					return lego.execute();
				});
			});
			this.queue = [];

			return result;
		}
	}]);

	return Transaction;
}();

exports.default = Transaction;
function createTransaction(callback) {
	var driver = (0, _index3.getSingleton)();
	var transaction = new Transaction(driver);
	return transaction.begin().then(function () {
		var returnValue = callback(transaction);

		if (!returnValue || !returnValue.then) {
			if (transaction.numberOfPendingQueries() === 0) {
				return Promise.reject(new Error('0 queries were found in Lego#transaction\'s callback.'));
			}

			return transaction.execAll();
		} else {
			// We need to handle the different passes: once the transaction callback returns, some
			// queries may have been queued. We execute the queued queries.
			return transaction.execAll().then(function () {
				return returnValue;
			})
			// Then we continue with the return value, which is a promise. After the promise,
			// new queries may be queued. We wait to resolve the promise and again execute
			// any queued queries. Previous queries were cleared by the
			.then(function () {
				return transaction.execAll();
			}).then(function () {
				return returnValue;
			});
		}
	}).then(function (result) {
		if (transaction.numberOfPendingQueries() > 0) {
			// TODO: Warn or error-out.
		}

		return transaction.commit().then(function () {
			return result;
		});
	}).catch(function (error) {
		return transaction.rollback().then(function () {
			return Promise.reject(error);
		});
	});
}