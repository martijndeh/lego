// @flow

import url from 'url';
import { PostgresDriver as Driver } from './postgres/index.js';
import type { PgClient } from './postgres/index.js';

export { Driver };
export type { PgClient };

export function createDriver(databaseURL: ?string): Driver {
	if (!databaseURL) {
		throw new Error('No DATABASE_URL provided.');
	}

	let parse = url.parse(databaseURL);
	let driver = null;

	switch (parse.protocol) {
	case 'pg:':
	case 'postgres:':
		driver = new Driver(databaseURL);
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
