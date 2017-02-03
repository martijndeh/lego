// @flow

const PRIMARY_KEY = 'id';

export function compile(definition) {
	const columns = {};

	function parseColumn(object_, relationship, depth) {
		const isArray = Array.isArray(object_);
		const object = isArray ? object_[0] : object_;

		Object.keys(object).forEach((propertyName) => {
			// The column can either be a string, an array of strings, or an array with a string and
			// a function.
			const column = object[propertyName];

			const isString = typeof column === 'string';
			const isFunction = Array.isArray(column) && column.length === 2 && typeof column[0] === 'string' && typeof column[1] === 'function';

			if (isString || isFunction) {
				const columnName = isFunction ? column[0] : column;

				// TODO: Check if the column already exists. If so, the definition object is invalid.

				// TODO: Merge the primary key branch and the non-primary key branch as they behave
				// nearly the same now.
				if (propertyName === PRIMARY_KEY) {
					if (isArray) {
						columns[columnName] = function handler(nodes, value) {
							const parent = nodes[depth];

							if (value == null) {
								if (parent != null && !parent[relationship]) {
									parent[relationship] = [];
								}

								return null;
							}
							else {
								if (!parent) {
									throw new Error(`Lego#parse(${columnName}>${propertyName}): Could not find object at depth ${depth} (array).`);
								}

								if (!parent[relationship]) {
									const val = isFunction ? column[1](value) : value;
									const newObject = { [PRIMARY_KEY]: val };
									parent[relationship] = [newObject];
									return [ depth, newObject ];
								}
								else {
									const array = parent[relationship];
									const val = isFunction ? column[1](value) : value;

									// TODO: This likely performs inefficiently. We should create benchmarks
									// so we can gets some numbers and try to optimize this.
									const existingObject = array.find((object) => object[PRIMARY_KEY] === val);

									if (!existingObject) {
										const newObject = { [PRIMARY_KEY]: value };
										array.push(newObject);
										return [ depth, newObject ];
									}
									else {
										return [ depth, existingObject ];
									}
								}
							}
						};
					}
					else {
						columns[columnName] = function handler(nodes, value) {
							const parent = nodes[depth];

							if (value == null) {
								if (parent && !parent[relationship]) {
									parent[relationship] = null;
								}

								return null;
							}
							else {
								if (!parent) {
									throw new Error(`Lego#parse(${columnName}>${propertyName}): Could not find object at depth ${depth} (no array).`);
								}

								if (parent[relationship]) {
									return [ depth, parent[relationship] ];
								}
								else {
									const val = isFunction ? column[1](value) : value;
									const newObject = { [PRIMARY_KEY]: val };
									parent[relationship] = newObject;
									return [ depth, newObject ];
								}
							}
						};
					}
				}
				else {
					// Set the value on the properties of the current object.
					columns[columnName] = function handler(nodes, value) {
						const parent = nodes[depth + 1];

						if (parent) {
							const val = isFunction ? column[1](value) : value;
							parent[propertyName] = val;
						}
						else {
							const currentNode = nodes[depth];

							// If the relationship was explicitly set to null or an empty array, it
							// was a primary key-based object and the primary key doesn't exist.
							if (currentNode && currentNode[relationship] !== null && !Array.isArray(currentNode[relationship])) {
								// This is a nested object without a primary key. Just set it.
								const newObject = { [propertyName]: value };
								currentNode[relationship] = newObject;
								return [ depth, newObject ];
							}
						}
					};
				}
			}
			else {
				// This is a property name which should build a relation. E.g. category in categories.
				parseColumn(column, propertyName, depth + 1);
			}
		});
	}

	const flag = 'root';

	parseColumn(definition, flag, 0);

	return function (rows) {
		let root = {};

		rows.forEach((row) => {
			const nodes = [root];

			Object.keys(row).forEach((columnName) => {
				const handler = columns[columnName];

				if (handler) {
					const value = row[columnName];
					const result = handler(nodes, value);

					if (result) {
						const [ depth, node ] = result;
						const count = (nodes.length - 1) - depth;

						if (count > 0) {
							nodes.splice(nodes.length - count, count);
						}

						nodes.push(node);
					}
				}
			});
		});

		return root[flag];
	};
}

export default function parse(rows, definition) {
	// TODO: Cache the compiler.
	const compiler = compile(definition);

	return compiler(rows);
}
