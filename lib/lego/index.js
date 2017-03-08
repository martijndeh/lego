'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _index = require('../driver/index.js');

var _index2 = require('../transaction/index.js');

var _index3 = _interopRequireDefault(_index2);

var _parameter = require('./parameter.js');

var _parameter2 = _interopRequireDefault(_parameter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PREVENT_EXTRA_SPACE_CHARACTERS = new Set([' ', ')']);

var Lego = (function () {
	function Lego(strings, parameters) {
		_classCallCheck(this, Lego);

		this.transaction = null;
		this.query = [];
		this.parameters = [];
		this.value = null;

		this._append(strings, parameters);
	}

	_createClass(Lego, [{
		key: 'append',
		value: function append(strings) {
			for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				parameters[_key - 1] = arguments[_key];
			}

			return this._append(strings, parameters);
		}
	}, {
		key: '_pasteString',
		value: function _pasteString(string) {
			var shouldPreventSpace = PREVENT_EXTRA_SPACE_CHARACTERS.has(string[0]);

			this.query = [].concat(_toConsumableArray(this.query.slice(0, -1)), [this.query.slice(-1)[0] + (shouldPreventSpace ? '' : ' ') + string]);
		}
	}, {
		key: '_appendNext',
		value: function _appendNext(index, strings, parameters, isAppending) {
			var string = strings[index];
			var parameter = parameters[index];

			if (parameter === void 0 && index >= parameters.length) {
				// There is always one more string than the number of parameters. So, this is the last
				// string which we just need to add now.
				this.query.push(string);
			} else if (parameter instanceof _parameter2.default) {
				// TODO: Check the parameter's type. Currently only "raw" is supported.

				if (this.query.length > 0) {
					this._pasteString(string + String(parameter.value));
				} else {
					this.query.push(string + String(parameter.value));
				}

				// We add the next string, but we make sure it gets appended to this string.
				this._appendNext(index + 1, strings, parameters, true);
			} else {
				if (parameter instanceof Lego) {
					var _query, _parameters;

					(_query = this.query).push.apply(_query, [string + parameter.query[0]].concat(_toConsumableArray(parameter.query.slice(1))));
					(_parameters = this.parameters).push.apply(_parameters, _toConsumableArray(parameter.parameters));
				} else if (Array.isArray(parameter) && parameter.length > 0 && parameter[0] instanceof Lego) {
					// This assumes this is an array of Lego instances.

					var j = undefined;
					var jl = undefined;

					var first = string;

					for (j = 0, jl = parameter.length; j < jl; j++) {
						var _query2, _parameters2;

						var lego = parameter[j];
						(_query2 = this.query).push.apply(_query2, [first + lego.query[0]].concat(_toConsumableArray(lego.query.slice(1, -1))));

						if (lego.query.length > 1) {
							if (j + 1 < jl) {
								first = lego.query.slice(-1) + ', ';
							} else {
								first = lego.query.slice(-1);
							}
						} else {
							first = null;
						}

						(_parameters2 = this.parameters).push.apply(_parameters2, _toConsumableArray(lego.parameters));
					}

					if (first) {
						this.query.push(first);
					}
				} else {
					if (isAppending) {
						this._pasteString(string);
						this.query.push('');
					} else {
						this.query.push(string);
					}

					this.parameters.push(parameter);
				}

				// And we continue!
				this._appendNext(index + 1, strings, parameters, isAppending);
			}
		}
	}, {
		key: '_append',
		value: function _append(strings, parameters) {
			if (parameters.length) {
				var isAppending = this.query.length > 0;
				this._appendNext(0, strings, parameters, isAppending);
			} else {
				if (this.query.length) {
					var _query3, _parameters3;

					// TODO: Pop and add a new value instead?

					this._pasteString(strings[0]);
					(_query3 = this.query).push.apply(_query3, _toConsumableArray(strings.slice(1)));

					(_parameters3 = this.parameters).push.apply(_parameters3, _toConsumableArray(parameters));
				} else {
					this.query = strings;
					this.parameters = parameters;
				}
			}
		}
	}, {
		key: 'then',
		value: function then(callback, errback) {
			return this.exec().then(callback, errback);
		}
	}, {
		key: 'catch',
		value: function _catch(errback) {
			// TODO: Can we remove this?

			return this.exec().catch(errback);
		}
	}, {
		key: 'first',
		value: function first() {
			return this.exec().then(function (rows) {
				if (rows && rows.length > 0) {
					return rows[0];
				} else {
					return null;
				}
			});
		}
	}, {
		key: 'transacting',
		value: function transacting(transaction) {
			this.setTransaction(transaction);
		}
	}, {
		key: 'setTransaction',
		value: function setTransaction(transaction) {
			this.transaction = transaction;
		}
	}, {
		key: 'getTransaction',
		value: function getTransaction() {
			return this.transaction;
		}
	}, {
		key: 'toQuery',
		value: function toQuery() {
			var index = 1;

			var i = undefined;
			var il = undefined;

			var text = [];
			var query = this.query;
			var numberOfParameters = this.parameters.length;

			for (i = 0, il = query.length; i < il; i++) {
				text.push(query[i]);

				if (i + 1 < il && i < numberOfParameters) {
					text.push('$' + index++);
				}
			}

			return {
				text: text.join(''),
				parameters: this.parameters
			};
		}
	}, {
		key: 'exec',
		value: function exec() {
			if (this.value == null) {
				var query = this.toQuery();

				if (this.transaction) {
					this.value = this.transaction.getDriver().query(this.transaction && this.transaction.getClient(), query.text, query.parameters);
				} else {
					var driver = (0, _index.getSingleton)();
					this.value = driver.exec(query.text, query.parameters);
				}
			}

			return this.value;
		}
	}]);

	return Lego;
})();

exports.default = Lego;