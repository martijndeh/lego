'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Driver = undefined;
exports.createDriver = createDriver;
exports.getSingleton = getSingleton;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _index = require('./postgres/index.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.Driver = _index.PostgresDriver;
function createDriver(databaseURL) {
	var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	if (!databaseURL) {
		throw new Error('No DATABASE_URL provided.');
	}

	var parse = _url2.default.parse(databaseURL);
	var driver = null;

	switch (parse.protocol) {
		case 'pg:':
		case 'postgres:':
			driver = new _index.PostgresDriver(databaseURL, options);
			break;
	}

	if (!driver) {
		throw new Error('Unsupported driver \'' + parse.protocol + '\' in DATABASE_URL.');
	}

	return driver;
}

var driver = null;

function getSingleton() {
	if (driver === null) {
		var _process$env = process.env,
		    DATABASE_URL = _process$env.DATABASE_URL,
		    LEGO_MIN_POOL_SIZE = _process$env.LEGO_MIN_POOL_SIZE,
		    LEGO_MAX_POOL_SIZE = _process$env.LEGO_MAX_POOL_SIZE;


		driver = createDriver(DATABASE_URL, {
			min: LEGO_MIN_POOL_SIZE,
			max: LEGO_MAX_POOL_SIZE
		});
	}

	return driver;
}