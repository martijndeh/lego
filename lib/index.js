'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _index = require('./transaction/index.js');

var _index2 = require('./parse/index.js');

var _index3 = _interopRequireDefault(_index2);

var _index4 = require('./lego/index.js');

var _index5 = _interopRequireDefault(_index4);

var _rawToken = require('./lego/tokens/raw-token.js');

var _rawToken2 = _interopRequireDefault(_rawToken);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
	sql: function sql(strings) {
		for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
			parameters[_key - 1] = arguments[_key];
		}

		if (!strings || !Array.isArray(strings)) {
			throw new Error('Lego#sql invoked with invalid arguments. This is likely because you are not using template strings e.g.: Lego.sql \`SELECT 1\`.');
		}

		return new _index5.default(strings, parameters);
	},

	transaction: function transaction(callback) {
		return (0, _index.createTransaction)(callback);
	},

	parse: function parse(rows, definition) {
		return (0, _index3.default)(rows, definition);
	},

	compile: function compile(definition) {
		return (0, _index2.compile)(definition);
	},

	raw: function raw(value) {
		return new _rawToken2.default(value);
	}
};