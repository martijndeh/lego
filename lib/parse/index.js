'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.compile = compile;
exports.default = parse;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var PRIMARY_KEY = 'id';

function compile(definition) {
	var columns = {};

	function parseColumn(object_, relationship, depth) {
		var isArray = Array.isArray(object_);
		var object = isArray ? object_[0] : object_;

		Object.keys(object).forEach(function (propertyName) {
			// The column can either be a string, an array of strings, or an array with a string and
			// a function.
			var column = object[propertyName];

			var isString = typeof column === 'string';
			var isFunction = Array.isArray(column) && column.length === 2 && typeof column[0] === 'string' && typeof column[1] === 'function';

			if (isString || isFunction) {
				var columnName = isFunction ? column[0] : column;

				// TODO: Check if the column already exists. If so, the definition object is invalid.

				// TODO: Merge the primary key branch and the non-primary key branch as they behave
				// nearly the same now.
				if (propertyName === PRIMARY_KEY) {
					if (isArray) {
						columns[columnName] = function handler(nodes, value) {
							var parent = nodes[depth];

							if (value == null) {
								if (parent != null && !parent[relationship]) {
									parent[relationship] = [];
								}

								return null;
							} else {
								if (!parent) {
									throw new Error('Lego#parse(' + columnName + '>' + propertyName + '): Could not find object at depth ' + depth + ' (array).');
								}

								if (!parent[relationship]) {
									var val = isFunction ? column[1](value) : value;
									var newObject = _defineProperty({}, PRIMARY_KEY, val);
									parent[relationship] = [newObject];
									return [depth, newObject];
								} else {
									var array = parent[relationship];
									var _val = isFunction ? column[1](value) : value;

									// TODO: This likely performs inefficiently. We should create benchmarks
									// so we can gets some numbers and try to optimize this.
									var existingObject = array.find(function (object) {
										return object[PRIMARY_KEY] === _val;
									});

									if (!existingObject) {
										var _newObject2 = _defineProperty({}, PRIMARY_KEY, value);
										array.push(_newObject2);
										return [depth, _newObject2];
									} else {
										return [depth, existingObject];
									}
								}
							}
						};
					} else {
						columns[columnName] = function handler(nodes, value) {
							var parent = nodes[depth];

							if (value == null) {
								if (parent && !parent[relationship]) {
									parent[relationship] = null;
								}

								return null;
							} else {
								if (!parent) {
									throw new Error('Lego#parse(' + columnName + '>' + propertyName + '): Could not find object at depth ' + depth + ' (no array).');
								}

								if (parent[relationship]) {
									return [depth, parent[relationship]];
								} else {
									var val = isFunction ? column[1](value) : value;
									var newObject = _defineProperty({}, PRIMARY_KEY, val);
									parent[relationship] = newObject;
									return [depth, newObject];
								}
							}
						};
					}
				} else {
					// TODO: Check the isArray outside the handler which should speed things up.

					// Set the value on the properties of the current object.
					columns[columnName] = function handler(nodes, value) {
						if (isArray) {
							var parent = nodes[depth + 1];

							if (parent) {
								var val = isFunction ? column[1](value) : value;
								parent[propertyName] = val;
							}
						} else {
							var currentNode = nodes[depth];
							var _parent = currentNode && currentNode[relationship];

							if (_parent) {
								var _val2 = isFunction ? column[1](value) : value;
								_parent[propertyName] = _val2;
							} else {
								// If the relationship was explicitly set to null or an empty array, it
								// was a primary key-based object and the primary key doesn't exist.
								if (currentNode && _parent !== null && !Array.isArray(_parent)) {
									// Now we assume the parent is void 0.
									// This is a nested object without a primary key. Just set it.
									var _val3 = isFunction ? column[1](value) : value;
									var newObject = _defineProperty({}, propertyName, _val3);
									currentNode[relationship] = newObject;
									return [depth, newObject];
								} else {
									// console.log('Nothing we can set');
								}
							}
						}
					};
				}
			} else {
				// This is a property name which should build a relation. E.g. category in categories.
				parseColumn(column, propertyName, depth + 1);
			}
		});
	}

	var flag = 'root';
	var initialValue = Array.isArray(definition) ? [] : null;

	parseColumn(definition, flag, 0);

	return function (rows) {
		var root = _defineProperty({}, flag, initialValue);

		rows.forEach(function (row) {
			var nodes = [root];

			Object.keys(row).forEach(function (columnName) {
				var handler = columns[columnName];

				if (handler) {
					var value = row[columnName];
					var result = handler(nodes, value);

					if (result) {
						var _result = _slicedToArray(result, 2),
						    depth = _result[0],
						    node = _result[1];

						var count = nodes.length - 1 - depth;

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

function parse(rows, definition) {
	// TODO: Cache the compiler.
	var compiler = compile(definition);

	return compiler(rows);
}