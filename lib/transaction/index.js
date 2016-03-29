'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;
exports.createTransaction = createTransaction;

var _index = require('../lego/index.js');

var _index2 = _interopRequireDefault(_index);

var _index3 = require('../driver/index.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Transaction = (function () {
	function Transaction(driver) {
		_classCallCheck(this, Transaction);

		this.$$driver = driver;
		this.$$client = null;
		this.$$done = null;
		this.$$legos = [];
	}

	_createClass(Transaction, [{
		key: '$getDriver',
		value: function $getDriver() {
			return this.$$driver;
		}
	}, {
		key: '$getClient',
		value: function $getClient() {
			return this.$$client;
		}
	}, {
		key: 'begin',
		value: function begin() {
			var _this = this;

			return this.$$driver.beginTransaction().then(function (driver) {
				_this.$$client = driver.client;
				_this.$$done = driver.done;
			});
		}
	}, {
		key: 'commit',
		value: function commit() {
			var _this2 = this;

			return this.$$driver.commitTransaction(this.$$client).then(function () {
				_this2.$$done();
			});
		}
	}, {
		key: 'rollback',
		value: function rollback() {
			var _this3 = this;

			return this.$$driver.rollbackTransaction(this.$$client).then(function () {
				_this3.$$done();
			}).catch(function (error) {
				_this3.$$done(error);
				throw error;
			});
		}
	}, {
		key: 'sql',
		value: function sql(strings) {
			for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				parameters[_key - 1] = arguments[_key];
			}

			var lego = new _index2.default(strings, parameters);
			lego.$setTransaction(this);
			this.$$legos.push(lego);
			return lego;
		}
	}, {
		key: '$execAll',
		value: function $execAll() {
			if (!this.$$legos.length) {
				throw new Error('0 queries were found in Lego#transaction\'s callback.');
			}

			var result = Promise.resolve(true);

			this.$$legos.forEach(function (lego) {
				result = result.then(function () {
					return lego.$exec();
				});
			});

			return result;
		}
	}]);

	return Transaction;
})();

exports.default = Transaction;
function createTransaction(callback) {
	var driver = (0, _index3.getSingleton)();
	var transaction = new Transaction(driver);
	return transaction.begin().then(function () {
		var returnValue = callback(transaction);

		if (!returnValue || !returnValue.then) {
			return transaction.$execAll();
		} else {
			if (transaction.$$legos.length > 1) {
				throw new Error('A promise was returned in Lego#transaction\'s callback, but multiple statements were invoked.');
			}

			return returnValue;
		}
	}).then(function (result) {
		return transaction.commit().then(function () {
			return result;
		});
	}).catch(function (error) {
		return transaction.rollback().then(function () {
			throw error;
		});
	});
}