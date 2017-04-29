// @flow

import { getSingleton } from '../driver/index.js';
import Transaction from '../transaction/index.js';
import Parameter from './parameter.js';
import parse from '../parse/index.js';

const PREVENT_EXTRA_SPACE_CHARACTERS = new Set([' ', ')']);

export default class Lego {
	transaction: ?Transaction;
	query: string[];
	parameters: any[];
	value: ?Promise<*>;

	constructor(strings: string[], parameters: any[]) {
		this.transaction	= null;
		this.query			= [];
		this.parameters		= [];
		this.value			= null;

		this._append(strings, parameters);
	}

	append(strings: string[], ...parameters: any[]) {
		return this._append(strings, parameters);
	}

	_pasteString(string: string) {
		const shouldPreventSpace = PREVENT_EXTRA_SPACE_CHARACTERS.has(string[0]);

		this.query = [
			...this.query.slice(0, -1),
			this.query.slice(-1)[0] + (shouldPreventSpace ? '' : ' ') + string,
		];
	}

	_appendNext(index: number, strings: string[], parameters: any[], isAppending: boolean) {
		const string = strings[index];
		const parameter = parameters[index];

		if (parameter === void 0 && index >= parameters.length) {
			// There is always one more string than the number of parameters. So, this is the last
			// string which we just need to add now.
			this.query.push(string);
		}
		else if (parameter instanceof Parameter) {
			// TODO: Check the parameter's type. Currently only "raw" is supported.

			if (this.query.length > 0) {
				this._pasteString(string + String(parameter.value));
			}
			else {
				this.query.push(string + String(parameter.value));
			}

			// We add the next string, but we make sure it gets appended to this string.
			this._appendNext(index + 1, strings, parameters, true);
		}
		else {
			if (parameter instanceof Lego) {
				this.query.push(string + parameter.query[0], ...parameter.query.slice(1));
				this.parameters.push(...parameter.parameters);
			}
			else if (Array.isArray(parameter) && parameter.length > 0 && parameter[0] instanceof Lego) {
				// This assumes this is an array of Lego instances.

				let j;
				let jl;

				let first = string;

				for (j = 0, jl = parameter.length; j < jl; j++) {
					const lego = parameter[j];

					this.query.push(first + lego.query[0], ...lego.query.slice(1, -1));

					if (lego.query.length > 1) {
						if (j + 1 < jl) {
							[ first ] = lego.query.slice(-1) + ', ';
						}
						else {
							[ first ] = lego.query.slice(-1);
						}
					}
					else {
						first = null;
					}

					this.parameters.push(...lego.parameters);
				}

				if (first) {
					this.query.push(first);
				}
			}
			else {
				if (isAppending) {
					this._pasteString(string);
					this.query.push('');
				}
				else {
					this.query.push(string);
				}

				this.parameters.push(parameter);
			}

			// And we continue!
			this._appendNext(index + 1, strings, parameters, isAppending);
		}
	}

	_append(strings: string[], parameters: any[]) {
		if (parameters.length) {
			const isAppending = this.query.length > 0;
			this._appendNext(0, strings, parameters, isAppending);
		}
		else {
			if (this.query.length) {
				// TODO: Pop and add a new value instead?

				this._pasteString(strings[0]);
				this.query.push(...strings.slice(1));

				this.parameters.push(...parameters);
			}
			else {
				this.query = strings;
				this.parameters = parameters;
			}
		}
	}

	then(callback, errback) {
		return this.exec().then(callback, errback);
	}

	catch(errback) {
		// TODO: Can we remove this?

		return this.exec().catch(errback);
	}

	first() {
		return this.exec()
			.then(function (rows) {
				if (rows && rows.length > 0) {
					return rows[0];
				}
				else {
					return null;
				}
			});
	}

	parse(definition) {
		return this.exec()
			.then((rows) => {
				return parse(rows, definition);
			});
	}

	transacting(transaction: Transaction) {
		this.setTransaction(transaction);
	}

	setTransaction(transaction: Transaction) {
		this.transaction = transaction;
	}

	getTransaction() {
		return this.transaction;
	}

	toQuery(): {text: string, parameters: any[]} {
		let index = 1;

		let i;
		let il;

		const text = [];
		const query = this.query;
		const numberOfParameters = this.parameters.length;

		for (i = 0, il = query.length; i < il; i++) {
			text.push(query[i]);

			if (i + 1 < il && i < numberOfParameters) {
				text.push(`$${index++}`);
			}
		}

		return {
			text: text.join(''),
			parameters: this.parameters,
		};
	}

	exec() {
		if (this.value == null) {
			const query = this.toQuery();

			if (this.transaction) {
				this.value = this.transaction.getDriver().query(this.transaction && this.transaction.getClient(), query.text, query.parameters);
			}
			else {
				const driver = getSingleton();
				this.value = driver.exec(query.text, query.parameters);
			}
		}

		return this.value;
	}
}
