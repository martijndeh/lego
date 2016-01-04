'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DATABASE_URL = process.env.DATABASE_URL;
var Driver = require('./driver')(DATABASE_URL);

var LegoInstance = (function () {
	function LegoInstance() {
		_classCallCheck(this, LegoInstance);

		this._strings = [];
		this._parameters = [];
	}

	_createClass(LegoInstance, [{
		key: 'add',
		value: function add(stringsOrOtherLegoInstance) {
			if (stringsOrOtherLegoInstance instanceof LegoInstance) {
				var otherLego = stringsOrOtherLegoInstance;

				this._strings = this._strings.concat(otherLego._strings);
				this._parameters = this._parameters.concat(otherLego._parameters);
			} else {
				var strings = stringsOrOtherLegoInstance;

				for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
					parameters[_key - 1] = arguments[_key];
				}

				if (parameters.length + 1 !== strings.length) {
					throw new Error('Invalid number of parameters in Lego#add.');
				}

				this._strings.push(strings);
				this._parameters = this._parameters.concat(parameters);
			}

			return this;
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
		key: 'toQuery',
		value: function toQuery() {
			var index = 1;
			var parameters = this._parameters;
			var query = this._strings.map(function (strings) {
				var _ = '';

				strings.forEach(function (string, i) {
					if (i + 1 == strings.length) {
						_ += string;
					} else {
						_ += string + '$' + index++;
					}
				});

				return _;
			}).join('\n');

			return {
				text: query,
				parameters: parameters
			};
		}
	}, {
		key: 'exec',
		value: function exec() {
			var query = this.toQuery();

			return Driver.query(query.text, query.parameters);
		}
	}]);

	return LegoInstance;
})();

var Lego = {
	new: function _new(strings) {
		var lego = new LegoInstance();

		if (strings) {
			var args = [].slice.call(arguments, 0);
			lego.add.apply(lego, args);
		}

		return lego;
	},

	Driver: require('./driver'),
	LegoInstance: LegoInstance
};

exports = module.exports = Lego;