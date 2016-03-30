import { getSingleton } from '../driver/index.js';

export default class Lego {
	constructor(strings, parameters) {
		this.$$transaction = null;
		this.$$query = [];
		this.$$parameters = [];

		this.$append(strings, parameters);
	}

	append(strings, ...parameters) {
		return this.$append(strings, parameters);
	}

	$append(strings, parameters) {
		if (parameters.length) {
			let i;
			let il;

			const isAppending = this.$$query.length;

			// If there are parameters we need to check what type every item is. Some types, like
			// a Lego instance or an array of Lego instances, should be treated differently.

			for (i = 0, il = parameters.length; i < il; i++) {
				const string = strings[i];
				const parameter = parameters[i];

				if (parameter instanceof Lego) {
					this.$$query.push(string + parameter.$$query[0], ...parameter.$$query.slice(1));
					this.$$parameters.push(...parameter.$$parameters);
				}
				else if (Array.isArray(parameter) && parameter.length && parameter[0] instanceof Lego) {
					let j;
					let jl;

					let first = string;

					for (j = 0, jl = parameter.length; j < jl; j++) {
						const lego = parameter[j];
						this.$$query.push(first + lego.$$query[0], ...lego.$$query.slice(1, -1));

						if (lego.$$query.length > 1) {
							if (j + 1 < jl) {
								first = lego.$$query.slice(-1) + ', ';
							}
							else {
								first = lego.$$query.slice(-1);
							}
						}
						else {
							first = null;
						}

						this.$$parameters.push(...lego.$$parameters);
					}

					if (first) {
						this.$$query.push(first);
					}
				}
				else {
					if (this.$$query.length && isAppending) {
						this.$$query = [...this.$$query.slice(0, -1), this.$$query.slice(-1) + ' ' + string];
					}
					else {
						this.$$query.push(string);
					}

					this.$$parameters.push(parameter);
				}
			}

			const string = strings[i];
			this.$$query.push(string);
		}
		else {
			if (this.$$query.length) {
				this.$$query = [...this.$$query.slice(0, -1), this.$$query.slice(-1) + ' ' + strings[0], ...strings.slice(1)];
				this.$$parameters.push(...parameters);
			}
			else {
				this.$$query = strings;
				this.$$parameters = parameters;
			}
		}
	}

	then(callback, errback) {
		return this.$exec().then(callback, errback);
	}

	catch(errback) {
		return this.$exec().catch(errback);
	}

	first() {
		return this.$exec()
			.then(function (rows) {
				if (rows && rows.length) {
					return rows[0];
				}
				else {
					return null;
				}
			});
	}

	transacting(transaction) {
		this.$setTransaction(transaction);
	}

	$setTransaction(transaction) {
		this.$$transaction = transaction;
	}

	$getTransaction() {
		return this.$$transaction;
	}

	$toQuery() {
		let index = 1;

		let i;
		let il;

		const text = [];
		const $$query = this.$$query;
		const numberOfParameters = this.$$parameters.length;

		for (i = 0, il = $$query.length; i < il; i++) {
			const query = $$query[i];

			text.push(query);

			if (i + 1 < il && i < numberOfParameters) {
				text.push(`$${index++}`);
			}
		}

		return {
			text: text.join(''),
			parameters: this.$$parameters,
		};
	}

	$exec() {
		const query = this.$toQuery();

		if (this.$$transaction) {
			return this.$$transaction.$getDriver().query(this.$$transaction.$getClient(), query.text, query.parameters);
		}
		else {
			const driver = getSingleton();
			return driver.exec(query.text, query.parameters);
		}
	}
}
