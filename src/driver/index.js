const url = require('url');

exports = module.exports = DriverFactory;

function DriverFactory(databaseURL) {
	if(!databaseURL) {
		throw new Error('No DATABASE_URL provided.');
	}

	let parse = url.parse(databaseURL);
	let driverClass = null;

	switch(parse.protocol) {
		case 'pg:':
		case 'postgres:':
			driverClass = require('./postgres');
			break;
	}

	if(!driverClass) {
		throw new Error('Unsupported driver in DATABASE_URL.');
	}

	return new driverClass(databaseURL);
}

DriverFactory.Postgres = require('./postgres');
