const util = require('util');
const debug = require('debug')('lego:parse');

function createStateID(id, parents) {
	return ['object', ...parents, id].join(':');
}

exports = module.exports = function (rows, definition) {
	var isArray = Array.isArray(definition);
	var result = isArray ? [] : {};

	var columns = {};

	function parseColumn(object_, parents) {
		var object = Array.isArray(object_) ? object_[0] : object_;

		Object.keys(object).forEach(function(propertyName) {
			var column = object[propertyName];
			if(typeof column == 'string') {
				columns[column] = {
					name: propertyName,
					parents: parents,
					isArray: Array.isArray(object_)
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

	rows.forEach(function(row) {
		let rootState 		= null;
		let currentState 	= null;
		let currentStateID 	= null;
		let isNull 			= false;

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

			// If this is a primary key...
			if(column.name == 'id') {
				if(row[columnName] === null) {
					isNull = true;
				}
				else {
					isNull = false;

					const stateID = createStateID(row[columnName], column.parents);

					if(column.parents.length === 0) {
						// find the root state with id $id—or create something new
						rootState = findState(stateID);
						if(!rootState) {
							rootState = {};

							createState(stateID, rootState, {
								parents: column.parents,
								parent: result
							});

							if(isArray) {
								result.push(rootState);
							}
							else {
								if(result && Object.keys(result).length > 0) {
									throw new Error('The root object already exists, but a new object with a different id found. Should the root object in your definition be an array instead?');
								}

								result = rootState;
							}
						}

						currentState 	= rootState;
						currentStateID 	= stateID;
					}
					else {
						let state = findState(stateID);
						if(!state) {
							// We need to find the current state. Either as
							// 1) a parent state of the currentState,
							// 2) a child state of the currentState
							// 3) a child state of the rootState.
							let currentStateMetadata = findMetadata(currentStateID);
							let parentName = column.parents[column.parents.length - 1];

							if(column.parents.length == 1) {
								// Child of root state
								state = {};

								if(!rootState[parentName]) {
									if(column.isArray) {
										rootState[parentName] = [state];
									}
									else {
										rootState[parentName] = state;
									}
								}
								else {
									if(column.isArray) {
										rootState[parentName].push(state);
									}
									else {
										throw new Error();
									}
								}

								createState(stateID, state, {
									parents: column.parents,
									parent: rootState
								});
							}
							else if(currentStateMetadata.parents.length == column.parents.length - 1) {
								// This is a child
								state = {};

								if(!currentState[parentName]) {
									if(column.isArray) {
										currentState[parentName] = [state];
									}
									else {
										currentState[parentName] = state;
									}
								}
								else {
									if(column.isArray) {
										currentState[parentName].push(state);
									}
									else {
										throw new Error();
									}
								}

								createState(stateID, state, {
									parents: column.parents,
									parent: currentState
								});
							}
							else if(currentStateMetadata.parents.length - 1 == column.parents.length) {
								let offset = 1;

								while (column.parents[column.parents.length - offset] != currentStateMetadata.parents[currentStateMetadata.parents.length - 1 - 1]) {
									// OK, so we don't have the same relation.
									const parentStateID = createStateID(currentStateMetadata.parent.id, currentStateMetadata.parents.slice(0, -1));
									currentStateMetadata = findMetadata(parentStateID);

									offset = offset + 1;
								}

								// This is a parent.
								state = {};

								if(!currentStateMetadata.parent[parentName]) {
									if(column.isArray) {
										currentStateMetadata.parent[parentName] = [state];
									}
									else {
										currentStateMetadata.parent[parentName] = state;
									}
								}
								else {
									if(column.isArray) {
										currentStateMetadata.parent[parentName].push(state);
									}
									else {
										throw new Error();
									}
								}

								createState(stateID, state, {
									parents: column.parents,
									parent: currentStateMetadata.parent
								});
							}
							else {
								throw new Error('Unknown parent-child relationship.');
							}
						}

						currentState 	= state;
						currentStateID 	= stateID;
					}
				}
			}

			if(!isNull) {
				currentState[column.name] = row[columnName];
			}
		});
	});

	debug(util.inspect(result, {depth: null}));
	return result;
};
