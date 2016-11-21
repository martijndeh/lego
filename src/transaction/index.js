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
		if (this.queue.length === 0) {
			return Promise.reject(new Error('0 queries were found in Lego#transaction\'s callback.'));
		}

		let result = Promise.resolve(true);

		this.queue.forEach((lego) => {
			result = result.then(() => lego.exec());
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
				return transaction.execAll();
			}
			else {
				return transaction.execAll()
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
