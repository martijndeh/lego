import Token from './abstract.js';

export default class ParameterToken extends Token {
	type() {
		return 'ParameterToken';
	}

	value() {
		return this.__value;
	}

	constructor(value) {
		super();

		this.__value = value;
	}
}
