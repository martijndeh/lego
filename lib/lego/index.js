'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _index = require('../driver/index.js');

var _index2 = require('../transaction/index.js');

var _index3 = _interopRequireDefault(_index2);

var _index4 = require('../parse/index.js');

var _index5 = _interopRequireDefault(_index4);

var _token = require('./tokens/token.js');

var _token2 = _interopRequireDefault(_token);

var _stringToken = require('./tokens/string-token.js');

var _stringToken2 = _interopRequireDefault(_stringToken);

var _parameterToken = require('./tokens/parameter-token.js');

var _parameterToken2 = _interopRequireDefault(_parameterToken);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PREVENT_EXTRA_SPACE_CHARACTERS_INPUT = new Set([' ', ')', ',']);
var PREVENT_EXTRA_SPACE_CHARACTERS_TOKENS = new Set([' ', '(']);

var Lego = function () {
	function Lego(strings, parameters) {
		_classCallCheck(this, Lego);

		this.transaction = null;
		this.promise = null;
		this.tokens = [];

		this._append(strings, parameters);
	}

	_createClass(Lego, [{
		key: 'append',
		value: function append(strings) {
			if (strings.length > 0 && !PREVENT_EXTRA_SPACE_CHARACTERS_INPUT.has(strings[0][0]) && this.shouldAddSpace()) {
				this.tokens.push(new _stringToken2.default(' '));
			}

			for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				parameters[_key - 1] = arguments[_key];
			}

			return this._append(strings, parameters);
		}
	}, {
		key: 'shouldAddSpace',
		value: function shouldAddSpace() {
			var _tokens$slice = this.tokens.slice(-1),
			    _tokens$slice2 = _slicedToArray(_tokens$slice, 1),
			    lastToken = _tokens$slice2[0];

			if (lastToken) {
				var initialState = {
					text: [],
					parameters: []
				};

				var state = lastToken.reduce(initialState);

				var _state$text = _slicedToArray(state.text, 1),
				    _text = _state$text[0];

				return !PREVENT_EXTRA_SPACE_CHARACTERS_TOKENS.has(_text.slice(-1));
			} else {
				return false;
			}
		}
	}, {
		key: '_append',
		value: function _append(strings, parameters) {
			for (var i = 0; i < strings.length; i += 1) {
				var string = strings[i];

				if (string.length > 0) {
					this.tokens.push(new _stringToken2.default(string));
				}

				if (i < parameters.length) {
					var parameter = parameters[i];

					if (parameter instanceof Lego) {
						var _tokens;

						var lego = parameter;

						var _lego$tokens = _slicedToArray(lego.tokens, 1),
						    token = _lego$tokens[0];

						if (this.shouldAddSpace() && token && token.string && !PREVENT_EXTRA_SPACE_CHARACTERS_INPUT.has(token.string[0])) {
							this.tokens.push(new _stringToken2.default(' '));
						}

						(_tokens = this.tokens).push.apply(_tokens, _toConsumableArray(lego.tokens));
					} else if (parameter instanceof _token2.default) {
						this.tokens.push(parameter);
					} else if (Array.isArray(parameter) && parameter.length > 0 && parameter[0] instanceof Lego) {
						for (var j = 0, jl = parameter.length; j < jl; j++) {
							var _tokens2;

							var subinstance = parameter[j];

							(_tokens2 = this.tokens).push.apply(_tokens2, _toConsumableArray(subinstance.tokens));

							if (j + 1 < jl) {
								this.tokens.push(new _stringToken2.default(', '));
							}
						}
					} else {
						this.tokens.push(new _parameterToken2.default(parameter));
					}
				}
			}
		}
	}, {
		key: 'then',
		value: function then(callback, errback) {
			return this.execute().then(callback, errback);
		}
	}, {
		key: 'catch',
		value: function _catch(errback) {
			// TODO: Can we remove this?

			return this.execute().catch(errback);
		}
	}, {
		key: 'first',
		value: function first() {
			return this.execute().then(function (rows) {
				if (rows && rows.length > 0) {
					return rows[0];
				} else {
					return null;
				}
			});
		}
	}, {
		key: 'parse',
		value: function parse(definition) {
			return this.execute().then(function (rows) {
				return (0, _index5.default)(rows, definition);
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
			var initialState = {
				text: [],
				parameters: []
			};
			var state = this.tokens.reduce(function (state, token) {
				return token.reduce(state);
			}, initialState);

			return {
				text: state.text.join(''),
				parameters: state.parameters
			};
		}
	}, {
		key: 'execute',
		value: function execute() {
			if (this.promise == null) {
				var query = this.toQuery();

				if (this.transaction) {
					this.promise = this.transaction.getDriver().query(this.transaction && this.transaction.getClient(), query.text, query.parameters);
				} else {
					var driver = (0, _index.getSingleton)();
					this.promise = driver.exec(query.text, query.parameters);
				}
			}

			return this.promise;
		}
	}]);

	return Lego;
}();

exports.default = Lego;