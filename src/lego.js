'use strict';

const DATABASE_URL = process.env.DATABASE_URL;
const Driver = require('./driver')(DATABASE_URL);

import { NewlineToken, ParameterToken, SeparatorToken, StringToken } from './tokens';

function createLegoInstance(strings) {
	const lego = new LegoInstance();

	if (strings) {
		lego.append.apply(lego, [].slice.call(arguments, 0));
	}

	return lego;
}

class LegoInstance {
	constructor() {
		this._tokens = [];
		this._transaction = null;
	}

	append(strings, ...parameters) {
		if (strings instanceof LegoInstance) {
			throw new Error('Lego#sql: you cannot pass a LegoInstance anymore. Use Lego#add instead.');
		}

		if (parameters.length + 1 !== strings.length) {
			throw new Error('Invalid number of parameters in Lego#add.');
		}

		if (this._tokens.length) {
			this._tokens.push(new NewlineToken());
		}

		strings.forEach((string, index) => {
			this._tokens.push(new StringToken(string));

			if (index < parameters.length) {
				const parameter = parameters[index];

				if (parameter instanceof LegoInstance) {
					this._tokens = this._tokens.concat(parameter._tokens);
				}
				else if (Array.isArray(parameter) && parameter.every((val) => (val && val instanceof LegoInstance))) {
					const length = parameter.length;
					parameter.forEach((otherLego, i) => {
						if (i !== 0) {
							this._tokens.push(new SeparatorToken());
						}

						this._tokens = this._tokens.concat(otherLego._tokens);
					});
				}
				else {
					this._tokens.push(new ParameterToken(parameters[index]));
				}
			}
		});

		return this;
	}

	add(legoInstance) {
		if (!legoInstance instanceof LegoInstance) {
			throw new Error('Lego#add: you must pass a lego instance. If you want to append a string, use Lego#append, if you want to construct a new instance, use Lego#sql.');
		}

		if (this._tokens.length) {
			this._tokens.push(new NewlineToken());
		}

		this._tokens = this._tokens.concat(legoInstance._tokens);
	}

	first() {
		return this.exec()
			.then(function (rows) {
				if (rows.length) {
					return rows[0];
				}
				else {
					return null;
				}
			});
	}

	then(callback, errback) {
		return this.exec().then(callback, errback);
	}

	catch(errback) {
		return this.exec().catch(errback);
	}

	toQuery() {
		let index = 1;
		const query = [];
		const parameters = [];

		this._tokens.forEach((token, i) => {
			const type = token.type();

			if (type === 'ParameterToken') {
				parameters.push(token.value());
				query.push(`$${index++}`);
			}
			else if (type === 'StringToken') {
				query.push(token.value());
			}
			else if (type === 'NewlineToken') {
				query.push(token.value());
			}
			else if (type === 'SeparatorToken') {
				query.push(token.value());
			}
		});

		return {
			text: query.join(''),
			parameters: parameters,
		};
	}

	exec() {
		let query = this.toQuery();

		if (this._transaction) {
			return Driver.query(this._transaction, query.text, query.parameters);
		}
		else {
			return Driver.exec(query.text, query.parameters);
		}
	}

	transacting(transaction) {
		this._transaction = transaction;
		return this;
	}

	transaction(callback) {
		const lego = new LegoInstance();
		return Driver.beginTransaction()
			.then(function (driver) {
				lego.transacting(driver.client);

				var returnValue = callback(lego);

				if (!returnValue || !returnValue.then) {
					return Driver.rollbackTransaction(driver.client)
						.then(function () {
							driver.done();

							throw new Error('In Lego#transaction(..) you must return a Promise.');
						});
				}
				else {
					return returnValue
						.then(function (result) {
							return Driver.commitTransaction(driver.client)
								.then(function () {
									driver.done();
									lego.transacting(null);

									return result;
								});
						})
						.catch(function (error) {
							// Some thing failed. Uh-oh.
							return Driver.rollbackTransaction(driver.client)
								.then(function () {
									driver.done();
									lego.transacting(null);
									throw error;
								})
								.catch(function (error) {
									driver.done(error);
									lego.transacting(null);
									throw error;
								});
						});
				}
			});
	}

	sql() {
		const lego = createLegoInstance.apply(null, [].slice.call(arguments, 0));

		if (this._transaction) {
			lego.transacting(this._transaction);
		}

		return lego;
	}

	'new'() {
		throw new Error(`lego#new is deprecated. Use lego#sql instead.`);
	}

	static 'new'() {
		throw new Error(`Lego#new is deprecated. Use Lego#sql instead.`);
	}

	static sql() {
		return createLegoInstance.apply(null, [].slice.call(arguments, 0));
	}
}

const Lego = LegoInstance;
Lego.transaction = LegoInstance.prototype.transaction;

Lego.Driver 		= require('./driver');
Lego.DriverInstance = Driver;
Lego.LegoInstance 	= LegoInstance;
Lego.Migrations 	= require('./migrations')(Lego);
Lego.parse 			= require('./data-mapper');

exports = module.exports = Lego;
