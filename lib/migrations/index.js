'use strict';

var _templateObject = _taggedTemplateLiteral(['SELECT version FROM lego.migrations ORDER BY created_at DESC LIMIT 1'], ['SELECT version FROM lego.migrations ORDER BY created_at DESC LIMIT 1']),
    _templateObject2 = _taggedTemplateLiteral(['CREATE SCHEMA lego\n\t\t\t\tCREATE TABLE migrations (\n\t\t\t\t\tversion INTEGER,\n\t\t\t\t\tcreated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP\n\t\t\t\t)'], ['CREATE SCHEMA lego\n\t\t\t\tCREATE TABLE migrations (\n\t\t\t\t\tversion INTEGER,\n\t\t\t\t\tcreated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP\n\t\t\t\t)']),
    _templateObject3 = _taggedTemplateLiteral(['INSERT INTO lego.migrations (version) VALUES (', ')'], ['INSERT INTO lego.migrations (version) VALUES (', ')']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var fs = require('fs');
var path = require('path');

var zeroPad = function zeroPad(number, base) {
	var length = String(base).length - String(number).length + 1;
	return length > 0 ? new Array(length).join('0') + number : number;
};

var Queue = require('./queue.js');

exports = module.exports = function (Lego) {
	return {
		Queue: Queue,
		getCurrentVersion: function getCurrentVersion() {
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
		},

		getDatabaseVersion: function getDatabaseVersion() {
			return Lego.new(_templateObject).first().then(function (row) {
				return row.version;
			}).catch(function (error) {
				if (error.code == '42P01') {
					return 0;
				} else {
					throw error;
				}
			});
		},

		createMigration: function createMigration(version) {
			return new Promise(function (resolve, reject) {
				var migrationsDir = path.join(process.cwd(), 'migrations');
				fs.mkdir(migrationsDir, function (error) {
					if (error && error.code != 'EEXIST') {
						reject(error);
					} else {
						var versionString = zeroPad(version, 100);
						var fileName = versionString + '.js';
						fs.writeFile(path.join(migrationsDir, versionString + '.js'), '\'use strict\';\n\nexports = module.exports = {\n\tup: function(lego, queue) {\n\t\t//\n\t},\n\n\tdown: function(lego, queue) {\n\t\t//\n\t}\n};', function (error) {
							if (error) {
								reject(error);
							} else {
								resolve(fileName);
							}
						});
					}
				});
			});
		},

		createMigrationsTable: function createMigrationsTable() {
			return Lego.new(_templateObject2).catch(function (error) {
				if (error.code == '42P06') {
					// The schema already exists. That's fine.
				} else {
						throw error;
					}
			});
		},

		loadMigration: function loadMigration(version) {
			return require(path.join(process.cwd(), 'migrations', zeroPad(version, 100) + '.js'));
		},

		migrate: function migrate(from, to) {
			var self = this;
			var _migrate = function _migrate(version, direction) {
				return Lego.transaction(function (lego) {
					var queue = new Queue(lego);

					var migration = self.loadMigration(version);
					var returnValue = migration[direction](lego, queue);

					if (returnValue) {
						throw new Error('Returning in a migration is not possible yet. Migration `' + version + '`.');
					} else {
						return Promise.all(queue._).then(function () {
							var newVersion = direction == 'up' ? version : version - 1;
							return lego.new(_templateObject3, newVersion);
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
					var version = from + i - 1;
					versions.push(version);
				}
			} else if (from < to) {
				direction = 'up';

				for (var i = 0; i < to - from; i++) {
					var version = from + 1 + i;
					versions.push(version);
				}
			}

			versions.forEach(function (version) {
				result = result.then(function () {
					return _migrate(version, direction);
				});
			});

			return result;
		}
	};
};