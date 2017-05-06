// @flow

import Lego from '../lego/index.js';
import { getSingleton, Driver } from '../driver/index.js';
import type { PgClient } from '../driver/index.js';

export default class Transaction {
	driver: Driver;
	client: ?PgClient;
	queue: Lego[];
	constructor(driver: Driver) {
		this.driver = driver;
		this.client = null;
		this.queue = [];
	}

	getDriver() {
		return this.driver;
	}

	getClient() {
		return this.client;
	}

	begin() {
		return this.driver.beginTransaction()
			.then((client) => {
				this.client = client;
			});
	}

	commit() {
		if (this.client == null) {
			throw new Error();
		}

		return this.driver.commitTransaction(this.client)
			.then(() => {
				this.client.release();
			});
	}

	rollback() {
		if (this.client == null) {
			throw new Error();
		}

		return this.driver.rollbackTransaction(this.client)
			.then(() => {
				this.client.release();
			})
			.catch((error) => {
				this.client.release(error);
				return Promise.reject(error);
			});
	}

	sql(strings: string[], ...parameters: any[]) {
		const lego = new Lego(strings, parameters);
		lego.setTransaction(this);
		this.queue.push(lego);
		return lego;
	}

	numberOfPendingQueries() {
		return this.queue.length;
	}

	execAll() {
		let result = Promise.resolve(true);

		this.queue.forEach((lego) => {
			result = result.then(() => lego.execute());
		});
		this.queue = [];

		return result;
	}
}

export type TransactionCallback = (transaction: Transaction) => ?Promise<any>;

export function createTransaction(callback: TransactionCallback) {
	const driver = getSingleton();
	const transaction = new Transaction(driver);
	return transaction.begin()
		.then(() => {
			const returnValue = callback(transaction);

			if (!returnValue || !returnValue.then) {
				if (transaction.numberOfPendingQueries() === 0) {
					return Promise.reject(new Error('0 queries were found in Lego#transaction\'s callback.'));
				}

				return transaction.execAll();
			}
			else {
				// We need to handle the different passes: once the transaction callback returns, some
				// queries may have been queued. We execute the queued queries.
				return transaction.execAll()
					.then(() => returnValue)
					// Then we continue with the return value, which is a promise. After the promise,
					// new queries may be queued. We wait to resolve the promise and again execute
					// any queued queries. Previous queries were cleared by the
					.then(() => transaction.execAll())
					.then(() => {
						return returnValue;
					});
			}
		})
		.then((result) => {
			if (transaction.numberOfPendingQueries() > 0) {
				// TODO: Warn or error-out.
			}

			return transaction.commit()
				.then(() => {
					return result;
				});
		})
		.catch((error) => {
			return transaction.rollback()
				.then(() => {
					return Promise.reject(error);
				});
		});
}
