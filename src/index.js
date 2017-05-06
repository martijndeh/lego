import { createTransaction } from './transaction/index.js';
import type { TransactionCallback } from './transaction/index.js';
import parse, { compile } from './parse/index.js';
import Lego from './lego/index.js';
import RawToken from './lego/tokens/raw-token.js';

export default {
	sql: (strings: string[], ...parameters: any[]) => {
		if (!strings || !Array.isArray(strings)) {
			throw new Error('Lego#sql invoked with invalid arguments. This is likely because you are not using template strings e.g.: Lego.sql \`SELECT 1\`.');
		}

		return new Lego(strings, parameters);
	},

	transaction: (callback: TransactionCallback) => {
		return createTransaction(callback);
	},

	parse: (rows, definition) => {
		return parse(rows, definition);
	},

	compile: (definition) => {
		return compile(definition);
	},

	raw: (value) => {
		return new RawToken(value);
	},
};
