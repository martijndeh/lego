// @flow

import pg from 'pg';
import url from 'url';

export function setPoolIdleTimeout(timeout: number) {
	pg.defaults.poolIdleTimeout = timeout;
}

type PgResult = {
	oid: ?number;
	fields: string[];
	rowCount: number;
	rows: Object[];
}

export type PgClient = {
	query: (text: string, parameters: any[]) => Promise<PgResult>;
	release: (error: ?Error) => void;
}

type PgPool = {
	connect: () => Promise<PgClient>;
}

export class PostgresDriver {
	pool: PgPool;
	constructor(databaseURL: string, options: Object) {
		this.createPool(databaseURL, options);
	}

	createPool(databaseUrl: string, options: Object) {
		const { auth, hostname, port, pathname } = url.parse(databaseUrl);
		const [ user, password ] = (auth || '').split(':');

		const config = {
			...options,
			user: user,
			password: password,
			host: hostname,
			port: port,
			database: (pathname || '').slice(1),
			ssl: process.env.LEGO_DISABLE_SSL !== 'true',
		};

		const internal = pg.native ? pg.native : pg;
		this.pool = new internal.Pool(config);

		this.pool.on('error', () => {
			//
		});
	}

	query(client: PgClient, text: string, parameters: any[]): Promise<number|any[]> {
		return client.query(text, parameters)
			.then((result) => {
				if ((result.oid === 0 || isNaN(result.oid) || result.oid === null) && (!result.fields || result.fields.length === 0)) {
					return result.rowCount;
				}
				else {
					return result.rows;
				}
			})
			.catch((error) => {
				error.query = text;
				return Promise.reject(error);
			});
	}

	exec(text: string, parameters: any[]) {
		return this.pool.connect()
			.then((client) => {
				return this.query(client, text, parameters)
					.then((result) => {
						client.release();

						return result;
					})
					.catch((error) => {
						client.release();

						return Promise.reject(error);
					});
			});
	}

	beginTransaction() {
		return this.pool.connect()
			.then((client) => {
				return this.query(client, 'BEGIN', [])
					.then(function () {
						return client;
					});
			});
	}

	commitTransaction(client: PgClient) {
		return this.query(client, 'COMMIT', []);
	}

	rollbackTransaction(client: PgClient) {
		return this.query(client, 'ROLLBACK', []);
	}
}
