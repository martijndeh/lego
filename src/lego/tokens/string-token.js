import Token from './token.js';

export default class StringToken extends Token {
	string = '';

	constructor(string) {
		super();

		this.string = string;
	}

	reduce(state) {
		state.text.push(this.string);
		return state;
	}
}
