'use strict';

var url = require('url');

exports = module.exports = DriverFactory;

function DriverFactory(databaseURL) {
	if (!databaseURL) {
		throw new Error('No DATABASE_URL provided.');
	}

	var parse = url.parse(databaseURL);
	var driverClass = null;

	switch (parse.protocol) {
		case 'pg:':
		case 'postgres:':
			driverClass = DriverFactory.Postgres;
			break;
	}

	if (!driverClass) {
		throw new Error('Unsupported driver in DATABASE_URL.');
	}

	return new driverClass(databaseURL);
}

DriverFactory.Postgres = require('./postgres');