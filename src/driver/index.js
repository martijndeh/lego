// @flow

import url from 'url';
import { PostgresDriver as Driver } from './postgres/index.js';
import type { PgClient } from './postgres/index.js';

export { Driver };
export type { PgClient };

export function createDriver(databaseURL: ?string, options: any = {}): Driver {
	if (!databaseURL) {
		throw new Error('No DATABASE_URL provided.');
	}

	let parse = url.parse(databaseURL);
	let driver = null;

	switch (parse.protocol) {
	case 'pg:':
	case 'postgres:':
		driver = new Driver(databaseURL, options);
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
		const { DATABASE_URL, LEGO_MIN_POOL_SIZE, LEGO_MAX_POOL_SIZE } = process.env;

		driver = createDriver(DATABASE_URL, {
			min: LEGO_MIN_POOL_SIZE,
			max: LEGO_MAX_POOL_SIZE,
		});
	}

	return driver;
}
