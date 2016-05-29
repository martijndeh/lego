function createStateID(id, parents, row, columnNames) {
	if (row && columnNames) {
		return ['object', ...parents, ...columnNames.map((columnName) => row[columnName])].join(':');
	}

	return ['object', ...parents, id].join(':');
}

export default function parse(rows, definition) {
	const isArray = Array.isArray(definition);
	let result = isArray ? [] : {};

	const columns = {};

	function parseColumn(object_, parents) {
		const object = Array.isArray(object_) ? object_[0] : object_;

		Object.keys(object).forEach(function (propertyName) {
			const column = object[propertyName];

			const isString = typeof column === 'string';
			const isArrayOfStrings = Array.isArray(column) && column.every((column) => typeof column === 'string');
			const isFunction = Array.isArray(column) && column.length === 2 && typeof column[0] === 'string' && typeof column[1] === 'function';

			if (isString || isArrayOfStrings) {
				const columnName = isArrayOfStrings ? column[0] : column;
				columns[columnName] = {
					name: propertyName,
					columnNames: isArrayOfStrings ? column : [columnName],
					parents: parents,
					isArray: Array.isArray(object_),
				};
			}
			else if (isFunction) {
				const columnName = column[0];
				columns[columnName] = {
					name: propertyName,
					transformFunction: column[1],
					parents: parents,
					isArray: Array.isArray(object_),
				};
			}
			else {
				parseColumn(column, parents.concat(propertyName));
			}
		});
	}

	parseColumn(definition, []);

	let states = {};
	let metadata = {};

	rows.forEach(function (row) {
		let rootState		= null;
		let currentState	= null;
		let currentStateID	= null;
		let isNull			= false;

		function findMetadata(id) {
			return metadata[id];
		}

		function findState(id) {
			return states[id];
		}

		function createState(id, state, data) {
			states[id] = state;
			metadata[id] = data;
		}

		Object.keys(row).forEach((columnName) => {
			const column = columns[columnName];

			if (column) {
				// If this is a primary key...
				if (column.name == 'id') {
					if (row[columnName] === null) {
						isNull = true;
					}
					else {
						isNull = false;

						const stateID = createStateID(row[columnName], column.parents, row, column.columnNames);

						if (column.parents.length === 0) {
							// find the root state with id $id—or create something new
							rootState = findState(stateID);
							if (!rootState) {
								rootState = {};

								createState(stateID, rootState, {
									parents: column.parents,
									parent: result,
								});

								if (isArray) {
									result.push(rootState);
								}
								else {
									if (result && Object.keys(result).length > 0) {
										throw new Error('The root object already exists, but a new object with a different id found. Should the root object in your definition be an array instead?');
									}

									result = rootState;
								}
							}

							currentState	= rootState;
							currentStateID	= stateID;
						}
						else {
							let state = findState(stateID);
							if (!state) {
								// We need to find the current state. Either as
								// 1) a parent state of the currentState,
								// 2) a child state of the currentState
								// 3) a child state of the rootState.
								let currentStateMetadata = findMetadata(currentStateID);
								let parentName = column.parents[column.parents.length - 1];

								if (column.parents.length == 1) {
									// Child of root state
									state = {};

									if (!rootState[parentName]) {
										if (column.isArray) {
											rootState[parentName] = [state];
										}
										else {
											rootState[parentName] = state;
										}
									}
									else {
										if (column.isArray) {
											rootState[parentName].push(state);
										}
										else {
											throw new Error();
										}
									}

									createState(stateID, state, {
										parents: column.parents,
										parent: rootState,
									});
								}
								else if (currentStateMetadata.parents.length == column.parents.length - 1) {
									// This is a child
									state = {};

									if (!currentState[parentName]) {
										if (column.isArray) {
											currentState[parentName] = [state];
										}
										else {
											currentState[parentName] = state;
										}
									}
									else {
										if (column.isArray) {
											currentState[parentName].push(state);
										}
										else {
											throw new Error();
										}
									}

									createState(stateID, state, {
										parents: column.parents,
										parent: currentState,
									});
								}
								else if (currentStateMetadata.parents.length - 1 == column.parents.length) {
									let offset = 1;

									while (column.parents[column.parents.length - offset] != currentStateMetadata.parents[currentStateMetadata.parents.length - 1 - 1]) {
										// OK, so we don't have the same relation.
										const parentStateID = createStateID(currentStateMetadata.parent.id, currentStateMetadata.parents.slice(0, -1));
										currentStateMetadata = findMetadata(parentStateID);

										offset = offset + 1;
									}

									// This is a parent.
									state = {};

									if (!currentStateMetadata.parent[parentName]) {
										if (column.isArray) {
											currentStateMetadata.parent[parentName] = [state];
										}
										else {
											currentStateMetadata.parent[parentName] = state;
										}
									}
									else {
										if (column.isArray) {
											currentStateMetadata.parent[parentName].push(state);
										}
										else {
											throw new Error();
										}
									}

									createState(stateID, state, {
										parents: column.parents,
										parent: currentStateMetadata.parent,
									});
								}
								else {
									throw new Error('Unknown parent-child relationship.');
								}
							}

							currentState	= state;
							currentStateID	= stateID;
						}
					}
				}

				if (!isNull) {
					if (column.transformFunction) {
						currentState[column.name] = column.transformFunction(row[columnName], row);
					}
					else {
						currentState[column.name] = row[columnName];
					}
				}
			}
		});
	});

	return result;
}
