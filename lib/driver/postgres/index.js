'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.PostgresDriver = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.setPoolIdleTimeout = setPoolIdleTimeout;

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function setPoolIdleTimeout(timeout) {
	_pg2.default.defaults.poolIdleTimeout = timeout;
}

var PostgresDriver = exports.PostgresDriver = function () {
	function PostgresDriver(databaseURL, options) {
		_classCallCheck(this, PostgresDriver);

		this.createPool(databaseURL, options);
	}

	_createClass(PostgresDriver, [{
		key: 'createPool',
		value: function createPool(databaseUrl, options) {
			var _url$parse = _url2.default.parse(databaseUrl),
			    auth = _url$parse.auth,
			    hostname = _url$parse.hostname,
			    port = _url$parse.port,
			    pathname = _url$parse.pathname;

			var _split = (auth || '').split(':'),
			    _split2 = _slicedToArray(_split, 2),
			    user = _split2[0],
			    password = _split2[1];

			var config = _extends({}, options, {
				user: user,
				password: password,
				host: hostname,
				port: port,
				database: (pathname || '').slice(1),
				ssl: process.env.LEGO_DISABLE_SSL !== 'true'
			});

			var internal = _pg2.default.native ? _pg2.default.native : _pg2.default;
			this.pool = new internal.Pool(config);

			this.pool.on('error', function () {
				//
			});
		}
	}, {
		key: 'query',
		value: function query(client, text, parameters) {
			return client.query(text, parameters).then(function (result) {
				if ((result.oid === 0 || isNaN(result.oid) || result.oid === null) && (!result.fields || result.fields.length === 0)) {
					return result.rowCount;
				} else {
					return result.rows;
				}
			}).catch(function (error) {
				error.query = text;
				return Promise.reject(error);
			});
		}
	}, {
		key: 'exec',
		value: function exec(text, parameters) {
			var _this = this;

			return this.pool.connect().then(function (client) {
				return _this.query(client, text, parameters).then(function (result) {
					client.release();

					return result;
				}).catch(function (error) {
					client.release();

					return Promise.reject(error);
				});
			});
		}
	}, {
		key: 'beginTransaction',
		value: function beginTransaction() {
			var _this2 = this;

			return this.pool.connect().then(function (client) {
				return _this2.query(client, 'BEGIN', []).then(function () {
					return client;
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
}();