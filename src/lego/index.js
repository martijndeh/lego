// @flow

import { getSingleton } from '../driver/index.js';
import Transaction from '../transaction/index.js';
import parse from '../parse/index.js';

import Token from './tokens/token.js';
import StringToken from './tokens/string-token.js';
import ParameterToken from './tokens/parameter-token.js';

const PREVENT_EXTRA_SPACE_CHARACTERS_INPUT = new Set([' ', ')', ',']);
const PREVENT_EXTRA_SPACE_CHARACTERS_TOKENS = new Set([' ', '(']);

export default class Lego {
	transaction: ?Transaction = null;
	promise: ?Promise<*> = null;
	tokens: Token[] = [];

	constructor(strings: string[], parameters: any[]) {
		this._append(strings, parameters);
	}

	append(strings: string[], ...parameters: any[]) {
		if (strings.length > 0 && !PREVENT_EXTRA_SPACE_CHARACTERS_INPUT.has(strings[0][0]) && this.shouldAddSpace()) {
			this.tokens.push(new StringToken(' '));
		}

		return this._append(strings, parameters);
	}

	shouldAddSpace() {
		const [
			lastToken,
		] = this.tokens.slice(-1);

		if (lastToken) {
			const initialState = {
				text: [],
				parameters: [],
			};

			const state = lastToken.reduce(initialState);
			const [
				text,
			] = state.text;

			return !PREVENT_EXTRA_SPACE_CHARACTERS_TOKENS.has(text.slice(-1));
		}
		else {
			return false;
		}
	}

	_append(strings: string[], parameters: any[]) {
		for (let i = 0; i < strings.length; i += 1) {
			const string = strings[i];

			if (string.length > 0) {
				this.tokens.push(new StringToken(string));
			}

			if (i < parameters.length) {
				const parameter = parameters[i];

				if (parameter instanceof Lego) {
					const lego = parameter;
					const [
						token,
					] = lego.tokens;

					if (this.shouldAddSpace() && token && token.string && !PREVENT_EXTRA_SPACE_CHARACTERS_INPUT.has(token.string[0])) {
						this.tokens.push(new StringToken(' '));
					}

					this.tokens.push(...lego.tokens);
				}
				else if (parameter instanceof Token) {
					this.tokens.push(parameter);
				}
				else if (Array.isArray(parameter) && parameter.length > 0 && parameter[0] instanceof Lego) {
					for (let j = 0, jl = parameter.length; j < jl; j++) {
						const subinstance = parameter[j];

						this.tokens.push(...subinstance.tokens);

						if (j + 1< jl) {
							this.tokens.push(new StringToken(', '));
						}
					}
				}
				else {
					this.tokens.push(new ParameterToken(parameter));
				}
			}
		}
	}

	then(callback, errback) {
		return this.execute().then(callback, errback);
	}

	catch(errback) {
		// TODO: Can we remove this?

		return this.execute().catch(errback);
	}

	first() {
		return this.execute()
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
		return this.execute()
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
		const initialState = {
			text: [],
			parameters: [],
		};
		const state = this.tokens.reduce((state, token) => {
			return token.reduce(state);
		}, initialState);

		return {
			text: state.text.join(''),
			parameters: state.parameters,
		};
	}

	execute() {
		if (this.promise == null) {
			const query = this.toQuery();

			if (this.transaction) {
				this.promise = this.transaction.getDriver().query(this.transaction && this.transaction.getClient(), query.text, query.parameters);
			}
			else {
				const driver = getSingleton();
				this.promise = driver.exec(query.text, query.parameters);
			}
		}

		return this.promise;
	}
}
