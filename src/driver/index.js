import url from 'url';
import { PostgresDriver } from './postgres/index.js';

export function createDriver(databaseURL) {
	if (!databaseURL) {
		throw new Error('No DATABASE_URL provided.');
	}

	let parse = url.parse(databaseURL);
	let driver = null;

	switch (parse.protocol) {
	case 'pg:':
	case 'postgres:':
		driver = new PostgresDriver(databaseURL);
		break;
	}

	if (!driver) {
		throw new Error(`Unsupported driver '${parse.protocol}' in DATABASE_URL.`);
	}

	return driver;
}

let driver = null;

export function getSingleton() {
	if (driver === null) {
		const { DATABASE_URL } = process.env;
		driver = createDriver(DATABASE_URL);
	}

	return driver;
}
