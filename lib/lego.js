'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DATABASE_URL = process.env.DATABASE_URL;
var Driver = require('./driver')(DATABASE_URL);

function createLegoInstance(strings) {
	var lego = new LegoInstance();

	if (strings) {
		lego.append.apply(lego, [].slice.call(arguments, 0));
	}

	return lego;
}

var Token = function Token() {
	_classCallCheck(this, Token);
};

var StringToken = (function (_Token) {
	_inherits(StringToken, _Token);

	_createClass(StringToken, [{
		key: 'type',
		value: function type() {
			return 'StringToken';
		}
	}, {
		key: 'value',
		value: function value() {
			return this.__value;
		}
	}]);

	function StringToken(value) {
		_classCallCheck(this, StringToken);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StringToken).call(this));

		_this.__value = value;
		return _this;
	}

	return StringToken;
})(Token);

var ParameterToken = (function (_Token2) {
	_inherits(ParameterToken, _Token2);

	_createClass(ParameterToken, [{
		key: 'type',
		value: function type() {
			return 'ParameterToken';
		}
	}, {
		key: 'value',
		value: function value() {
			return this.__value;
		}
	}]);

	function ParameterToken(value) {
		_classCallCheck(this, ParameterToken);

		var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(ParameterToken).call(this));

		_this2.__value = value;
		return _this2;
	}

	return ParameterToken;
})(Token);

var NewlineToken = (function (_Token3) {
	_inherits(NewlineToken, _Token3);

	function NewlineToken() {
		_classCallCheck(this, NewlineToken);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(NewlineToken).apply(this, arguments));
	}

	_createClass(NewlineToken, [{
		key: 'type',
		value: function type() {
			return 'NewlineToken';
		}
	}, {
		key: 'value',
		value: function value() {
			return '\n';
		}
	}]);

	return NewlineToken;
})(Token);

var SeparatorToken = (function (_Token4) {
	_inherits(SeparatorToken, _Token4);

	function SeparatorToken() {
		_classCallCheck(this, SeparatorToken);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(SeparatorToken).apply(this, arguments));
	}

	_createClass(SeparatorToken, [{
		key: 'type',
		value: function type() {
			return 'SeparatorToken';
		}
	}, {
		key: 'value',
		value: function value() {
			return ', ';
		}
	}]);

	return SeparatorToken;
})(Token);

var LegoInstance = (function () {
	function LegoInstance() {
		_classCallCheck(this, LegoInstance);

		this._tokens = [];
		this._transaction = null;
	}

	_createClass(LegoInstance, [{
		key: 'append',
		value: function append(strings) {
			var _this5 = this;

			for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				parameters[_key - 1] = arguments[_key];
			}

			if (strings instanceof LegoInstance) {
				throw new Error('Lego#sql: you cannot pass a LegoInstance anymore. Use Lego#add instead.');
			}

			if (parameters.length + 1 !== strings.length) {
				throw new Error('Invalid number of parameters in Lego#add.');
			}

			if (this._tokens.length) {
				this._tokens.push(new NewlineToken());
			}

			strings.forEach(function (string, index) {
				_this5._tokens.push(new StringToken(string));

				if (index < parameters.length) {
					var parameter = parameters[index];

					if (parameter instanceof LegoInstance) {
						_this5._tokens = _this5._tokens.concat(parameter._tokens);
					} else if (Array.isArray(parameter) && parameter.every(function (val) {
						return val && val instanceof LegoInstance;
					})) {
						var length = parameter.length;
						parameter.forEach(function (otherLego, i) {
							if (i !== 0) {
								_this5._tokens.push(new SeparatorToken());
							}

							_this5._tokens = _this5._tokens.concat(otherLego._tokens);
						});
					} else {
						_this5._tokens.push(new ParameterToken(parameters[index]));
					}
				}
			});

			return this;
		}
	}, {
		key: 'add',
		value: function add(legoInstance) {
			if (!legoInstance instanceof LegoInstance) {
				throw new Error('Lego#add: you must pass a lego instance. If you want to append a string, use Lego#append, if you want to construct a new instance, use Lego#sql.');
			}

			if (this._tokens.length) {
				this._tokens.push(new NewlineToken());
			}

			this._tokens = this._tokens.concat(legoInstance._tokens);
		}
	}, {
		key: 'first',
		value: function first() {
			return this.exec().then(function (rows) {
				if (rows.length) {
					return rows[0];
				} else {
					return null;
				}
			});
		}
	}, {
		key: 'then',
		value: function then(callback, errback) {
			return this.exec().then(callback, errback);
		}
	}, {
		key: 'catch',
		value: function _catch(errback) {
			return this.exec().catch(errback);
		}
	}, {
		key: 'toQuery',
		value: function toQuery() {
			var index = 1;
			var query = [];
			var parameters = [];

			this._tokens.forEach(function (token, i) {
				var type = token.type();

				if (type === 'ParameterToken') {
					parameters.push(token.value());
					query.push('$' + index++);
				} else if (type === 'StringToken') {
					query.push(token.value());
				} else if (type === 'NewlineToken') {
					query.push(token.value());
				} else if (type === 'SeparatorToken') {
					query.push(token.value());
				}
			});

			return {
				text: query.join(''),
				parameters: parameters
			};
		}
	}, {
		key: 'exec',
		value: function exec() {
			var query = this.toQuery();

			if (this._transaction) {
				return Driver.query(this._transaction, query.text, query.parameters);
			} else {
				return Driver.exec(query.text, query.parameters);
			}
		}
	}, {
		key: 'transacting',
		value: function transacting(transaction) {
			this._transaction = transaction;
			return this;
		}
	}, {
		key: 'transaction',
		value: function transaction(callback) {
			var lego = new LegoInstance();
			return Driver.beginTransaction().then(function (driver) {
				lego.transacting(driver.client);

				var returnValue = callback(lego);

				if (!returnValue || !returnValue.then) {
					return Driver.rollbackTransaction(driver.client).then(function () {
						driver.done();

						throw new Error('In Lego#transaction(..) you must return a Promise.');
					});
				} else {
					return returnValue.then(function (result) {
						return Driver.commitTransaction(driver.client).then(function () {
							driver.done();
							lego.transacting(null);

							return result;
						});
					}).catch(function (error) {
						// Some thing failed. Uh-oh.
						return Driver.rollbackTransaction(driver.client).then(function () {
							driver.done();
							lego.transacting(null);
							throw error;
						}).catch(function (error) {
							driver.done(error);
							lego.transacting(null);
							throw error;
						});
					});
				}
			});
		}
	}, {
		key: 'sql',
		value: function sql() {
			var lego = createLegoInstance.apply(null, [].slice.call(arguments, 0));

			if (this._transaction) {
				lego.transacting(this._transaction);
			}

			return lego;
		}
	}, {
		key: 'new',
		value: function _new() {
			throw new Error('lego#new is deprecated. Use lego#sql instead.');
		}
	}], [{
		key: 'new',
		value: function _new() {
			throw new Error('Lego#new is deprecated. Use Lego#sql instead.');
		}
	}, {
		key: 'sql',
		value: function sql() {
			return createLegoInstance.apply(null, [].slice.call(arguments, 0));
		}
	}]);

	return LegoInstance;
})();

var Lego = LegoInstance;
Lego.transaction = LegoInstance.prototype.transaction;

Lego.Driver = require('./driver');
Lego.DriverInstance = Driver;
Lego.LegoInstance = LegoInstance;
Lego.Migrations = require('./migrations')(Lego);
Lego.parse = require('./data-mapper');

exports = module.exports = Lego;