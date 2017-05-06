import Token from './token.js';

export default class ParameterToken extends Token {
	parameter = null;

	constructor(parameter) {
		super();

		this.parameter = parameter;
	}

	reduce(state) {
		state.text.push(`$${state.parameters.length + 1}`);
		state.parameters.push(this.parameter);
		return state;
	}
}
