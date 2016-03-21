import Token from './abstract.js';

export default class NewlineToken extends Token {
	type() {
		return 'NewlineToken';
	}

	value() {
		return '\n';
	}
}
