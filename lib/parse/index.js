'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.compile = compile;
exports.default = parse;

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

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
				(function () {
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
										var _ret2 = (function () {
											var array = parent[relationship];
											var val = isFunction ? column[1](value) : value;

											// TODO: This likely performs inefficiently. We should create benchmarks
											// so we can gets some numbers and try to optimize this.
											var existingObject = array.find(function (object) {
												return object[PRIMARY_KEY] === val;
											});

											if (!existingObject) {
												var newObject = _defineProperty({}, PRIMARY_KEY, value);
												array.push(newObject);
												return {
													v: [depth, newObject]
												};
											} else {
												return {
													v: [depth, existingObject]
												};
											}
										})();

										if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
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
						// Set the value on the properties of the current object.
						columns[columnName] = function handler(nodes, value) {
							var parent = nodes[depth + 1];

							if (parent) {
								var val = isFunction ? column[1](value) : value;
								parent[propertyName] = val;
							} else {
								var currentNode = nodes[depth];

								// If the relationship was explicitly set to null or an empty array, it
								// was a primary key-based object and the primary key doesn't exist.
								if (currentNode && currentNode[relationship] !== null && !Array.isArray(currentNode[relationship])) {
									// This is a nested object without a primary key. Just set it.
									var newObject = _defineProperty({}, propertyName, value);
									currentNode[relationship] = newObject;
									return [depth, newObject];
								}
							}
						};
					}
				})();
			} else {
				// This is a property name which should build a relation. E.g. category in categories.
				parseColumn(column, propertyName, depth + 1);
			}
		});
	}

	var flag = 'root';

	parseColumn(definition, flag, 0);

	return function (rows) {
		var root = {};

		rows.forEach(function (row) {
			var nodes = [root];

			Object.keys(row).forEach(function (columnName) {
				var handler = columns[columnName];

				if (handler) {
					var value = row[columnName];
					var result = handler(nodes, value);

					if (result) {
						var _result = _slicedToArray(result, 2);

						var depth = _result[0];
						var node = _result[1];

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