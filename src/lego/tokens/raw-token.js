import Token from './token.js';

export default class RawToken extends Token {
	string = '';

	constructor(string: string) {
		super();

		this.string = string;
	}

	reduce(state) {
		state.text.push(this.string);
		return state;
	}
}
