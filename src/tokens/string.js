import Token from './abstract.js';

export default class StringToken extends Token {
	type() {
		return 'StringToken';
	}

	value() {
		return this.__value;
	}

	constructor(value) {
		super();

		this.__value = value;
	}
}
