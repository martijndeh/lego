'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templateObject = _taggedTemplateLiteral(['SELECT version FROM lego.migrations ORDER BY created_at DESC LIMIT 1'], ['SELECT version FROM lego.migrations ORDER BY created_at DESC LIMIT 1']),
    _templateObject2 = _taggedTemplateLiteral(['CREATE SCHEMA lego\n\t\t\tCREATE TABLE migrations (\n\t\t\t\tversion INTEGER,\n\t\t\t\tcreated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP\n\t\t\t)'], ['CREATE SCHEMA lego\n\t\t\tCREATE TABLE migrations (\n\t\t\t\tversion INTEGER,\n\t\t\t\tcreated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP\n\t\t\t)']),
    _templateObject3 = _taggedTemplateLiteral(['INSERT INTO lego.migrations (version) VALUES (', ')'], ['INSERT INTO lego.migrations (version) VALUES (', ')']);

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var path = require('path');


var zeroPad = function zeroPad(number, base) {
	var length = String(base).length - String(number).length + 1;
	return length > 0 ? new Array(length).join('0') + number : number;
};

var Migrations = function () {
	function Migrations() {
		_classCallCheck(this, Migrations);
	}

	_createClass(Migrations, null, [{
		key: 'getCurrentVersion',
		value: function getCurrentVersion() {
			return new Promise(function (resolve, reject) {
				fs.readdir(path.join(process.cwd(), 'migrations'), function (error, files) {
					if (error) {
						if (error.errno === -2) {
							// The directory does not exist.
							resolve(0);
						} else {
							reject(error);
						}
					} else {
						var currentVersion = files.map(function (fileName) {
							var baseName = path.basename(fileName);
							var matches = baseName.match(/^([0-9]+).*\.js$/);

							if (matches && matches.length > 1) {
								return parseInt(matches[1]);
							} else {
								reject(new Error('Unknown file `' + baseName + '` in migrations folder.'));
							}
						}).reduce(function (current, value) {
							if (value > current) {
								return value;
							} else {
								return current;
							}
						}, 0);
						resolve(currentVersion);
					}
				});
			});
		}
	}, {
		key: 'getDatabaseVersion',
		value: function getDatabaseVersion() {
			return _index2.default.sql(_templateObject).first().then(function (row) {
				if (row) {
					return row.version;
				} else {
					return 0;
				}
			}).catch(function (error) {
				var relationDoesNotExistErrorCode = '42P01';

				if (error.code === relationDoesNotExistErrorCode || error.sqlState === relationDoesNotExistErrorCode) {
					return 0;
				} else {
					return Promise.reject(error);
				}
			});
		}
	}, {
		key: 'createMigration',
		value: function createMigration(version) {
			return new Promise(function (resolve, reject) {
				var migrationsDir = path.join(process.cwd(), 'migrations');
				fs.mkdir(migrationsDir, function (error) {
					if (error && error.code != 'EEXIST') {
						reject(error);
					} else {
						var versionString = zeroPad(version, 100);
						var fileName = versionString + '.js';
						fs.writeFile(path.join(migrationsDir, versionString + '.js'), 'export function up(transaction) {\n\t//\n}\n\nexport function down(transaction) {\n\t//\n}', function (error) {
							if (error) {
								reject(error);
							} else {
								resolve(fileName);
							}
						});
					}
				});
			});
		}
	}, {
		key: 'createMigrationsTable',
		value: function createMigrationsTable() {
			return _index2.default.sql(_templateObject2).catch(function (error) {
				var schemaAlreadyExistsErrorCode = '42P06';

				if (error.code == schemaAlreadyExistsErrorCode || error.sqlState === schemaAlreadyExistsErrorCode) {
					// The schema already exists. That's fine.
				} else {
					return Promise.reject(error);
				}
			});
		}
	}, {
		key: 'loadMigration',
		value: function loadMigration(version) {
			return require(path.join(process.cwd(), 'migrations', zeroPad(version, 100) + '.js'));
		}
	}, {
		key: 'migrate',
		value: function migrate(from, to) {
			var _this = this;

			var _migrate = function _migrate(version, direction) {
				var migration = _this.loadMigration(version);

				return _index2.default.transaction(function (transaction) {
					var returnValue = migration[direction](transaction);
					var newVersion = direction == 'up' ? version : version - 1;

					if (!returnValue || !returnValue.then) {
						return transaction.sql(_templateObject3, newVersion);
					} else {
						return returnValue.then(function (result) {
							return _index2.default.sql(_templateObject3, newVersion).transacting(transaction).then(function () {
								return result;
							});
						});
					}
				});
			};

			var result = this.createMigrationsTable();
			var direction = '';

			var versions = [];

			if (from > to) {
				direction = 'down';

				for (var i = from - to; i > 0; i--) {
					var version = to + i;
					versions.push(version);
				}
			} else if (from < to) {
				direction = 'up';

				for (var _i = 0; _i < to - from; _i++) {
					var _version = from + 1 + _i;
					versions.push(_version);
				}
			}

			versions.forEach(function (version) {
				result = result.then(function () {
					return _migrate(version, direction);
				});
			});

			return result;
		}
	}]);

	return Migrations;
}();

exports.default = Migrations;
;