import Token from './abstract.js';

export default class SeparatorToken extends Token {
	type() {
		return 'SeparatorToken';
	}

	value() {
		return ', ';
	}
}
