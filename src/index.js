import { createTransaction } from './transaction/index.js';
import parse from './parse/index.js';
import Lego from './lego/index.js';

export default {
	sql: (strings, ...parameters) => {
		if (!strings || !Array.isArray(strings)) {
			throw new Error(`Lego#sql invoked with invalid arguments. This is likely because you are not using template strings e.g.: Lego.sql \`SELECT 1\`.`);
		}

		return new Lego(strings, parameters);
	},

	transaction: (callback) => {
		return createTransaction(callback);
	},

	parse: (rows, definition) => {
		return parse(rows, definition);
	},
};
