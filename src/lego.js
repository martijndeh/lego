'use strict';

const DATABASE_URL = process.env.DATABASE_URL;
const Driver = require('./driver')(DATABASE_URL);

function createLegoInstance(strings) {
	var lego = new LegoInstance();

	if(strings) {
		var args = [].slice.call(arguments, 0);
		lego.add.apply(lego, args);
	}

	return lego;
}

class LegoInstance {
	constructor() {
		this._strings = [];
		this._parameters = [];
		this._transaction = null;
	}

	add(stringsOrOtherLegoInstance, ...parameters) {
		if(stringsOrOtherLegoInstance instanceof LegoInstance) {
			let otherLego = stringsOrOtherLegoInstance;

			this._strings 	= this._strings.concat(otherLego._strings);
			this._parameters = this._parameters.concat(otherLego._parameters);
		}
		else {
			let strings = stringsOrOtherLegoInstance;
			if(parameters.length + 1 !== strings.length) {
				throw new Error('Invalid number of parameters in Lego#add.');
			}

			this._strings.push(strings);
			this._parameters = this._parameters.concat(parameters);
		}

		return this;
	}

	first() {
		return this.exec()
			.then(function(rows) {
				if(rows.length) {
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
		let parameters = this._parameters;
		let query = this._strings
			.map(function(strings) {
				let _ = '';

				strings.forEach(function(string, i) {
					if(i + 1 == strings.length) {
						_ += string;
					}
					else {
						_ += string + '$' + index++;
					}
				});

				return _;
			})
			.join('\n');

		return {
			text: query,
			parameters: parameters
		};
	}

	exec() {
		let query = this.toQuery();

		if(this._transaction) {
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
		var lego = new LegoInstance();
		return Driver.beginTransaction()
			.then(function(driver) {
				lego.transacting(driver.client);

				var returnValue = callback(lego);

				if(!returnValue || !returnValue.then) {
					return Driver.rollbackTransaction(driver.client)
						.then(function() {
							driver.done();

							throw new Error('In Lego#transaction(..) you must return a Promise.');
						});
				}
				else {
					return returnValue
						.then(function(result) {
							return Driver.commitTransaction(driver.client)
								.then(function() {
									driver.done();
									lego.transacting(null);

									return result;
								});
						})
						.catch(function(error) {
							// Some thing failed. Uh-oh.
							return Driver.rollbackTransaction(driver.client)
								.then(function() {
									driver.done();
									lego.transacting(null);
									throw error;
								})
								.catch(function(error) {
									driver.done(error);
									lego.transacting(null);
									throw error;
								});
						});
				}
			});
	}

	'new'() {
		var args = [].slice.call(arguments, 0);
		var lego = createLegoInstance.apply(null, args);

		if(this._transaction) {
			lego.transacting(this._transaction);
		}

		return lego;
	}
}

var Lego = LegoInstance;
Lego.new = createLegoInstance;
Lego.transaction = LegoInstance.prototype.transaction;

Lego.Driver 		= require('./driver');
Lego.DriverInstance = Driver;
Lego.LegoInstance 	= LegoInstance;
Lego.Migrations 	= require('./migrations')(Lego);
Lego.parse 			= require('./data-mapper');

exports = module.exports = Lego;
