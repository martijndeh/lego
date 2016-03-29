import Lego from '../lego/index.js';
import { getSingleton } from '../driver/index.js';

export default class Transaction {
	constructor(driver) {
		this.$$driver = driver;
		this.$$client = null;
		this.$$done = null;
		this.$$legos = [];
	}

	$getDriver() {
		return this.$$driver;
	}

	$getClient() {
		return this.$$client;
	}

	begin() {
		return this.$$driver.beginTransaction()
			.then((driver) => {
				this.$$client = driver.client;
				this.$$done = driver.done;
			});
	}

	commit() {
		return this.$$driver.commitTransaction(this.$$client)
			.then(() => {
				this.$$done();
			});
	}

	rollback() {
		return this.$$driver.rollbackTransaction(this.$$client)
			.then(() => {
				this.$$done();
			})
			.catch((error) => {
				this.$$done(error);
				throw error;
			});
	}

	sql(strings, ...parameters) {
		const lego = new Lego(strings, parameters);
		lego.$setTransaction(this);
		this.$$legos.push(lego);
		return lego;
	}

	$execAll() {
		if (!this.$$legos.length) {
			throw new Error('0 queries were found in Lego#transaction\'s callback.');
		}

		let result = Promise.resolve(true);

		this.$$legos.forEach((lego) => {
			result = result.then(() => lego.$exec());
		});

		return result;
	}
}

export function createTransaction(callback) {
	const driver = getSingleton();
	const transaction = new Transaction(driver);
	return transaction.begin()
		.then(() => {
			const returnValue = callback(transaction);

			if (!returnValue || !returnValue.then) {
				return transaction.$execAll();
			}
			else {
				if (transaction.$$legos.length > 1) {
					throw new Error('A promise was returned in Lego#transaction\'s callback, but multiple statements were invoked.');
				}

				return returnValue;
			}
		})
		.then((result) => {
			return transaction.commit()
				.then(() => {
					return result;
				});
		})
		.catch((error) => {
			return transaction.rollback()
				.then(() => {
					throw error;
				});
		});
}
