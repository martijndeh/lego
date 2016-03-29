'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.createDriver = createDriver;
exports.getSingleton = getSingleton;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _index = require('./postgres/index.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createDriver(databaseURL) {
	if (!databaseURL) {
		throw new Error('No DATABASE_URL provided.');
	}

	var parse = _url2.default.parse(databaseURL);
	var driver = null;

	switch (parse.protocol) {
		case 'pg:':
		case 'postgres:':
			driver = new _index.PostgresDriver(databaseURL);
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
		var DATABASE_URL = process.env.DATABASE_URL;

		driver = createDriver(DATABASE_URL);
	}

	return driver;
}