const fs = require('fs');
const path = require('path');

const zeroPad = function(number, base) {
	var length = (String(base).length - String(number).length) + 1;
	return length > 0 ? new Array(length).join('0') + number : number;
};

const Queue = require('./queue.js');

exports = module.exports = function(Lego) {
	return {
		Queue: Queue,
		getCurrentVersion: function() {
			return new Promise(function(resolve, reject) {
				fs.readdir(path.join(process.cwd(), 'migrations'), function(error, files) {
					if(error) {
						if(error.errno === -2) {
							// The directory does not exist.
							resolve(0);
						}
						else {
							reject(error);
						}
					}
					else {
						var currentVersion = files
							.map(function(fileName) {
								var baseName = path.basename(fileName);
								var matches = baseName.match(/^([0-9]+).*\.js$/);

								if(matches && matches.length > 1) {
									return parseInt(matches[1]);
								}
								else {
									reject(new Error('Unknown file `' + baseName + '` in migrations folder.'));
								}
							})
							.reduce(function(current, value) {
								if(value > current) {
									return value;
								}
								else {
									return current;
								}
							}, 0);
						resolve(currentVersion);
					}
				});
			});
		},

		getDatabaseVersion: function() {
			return Lego.new `SELECT version FROM lego.migrations ORDER BY created_at DESC LIMIT 1`.first()
				.then(function(row) {
					if(row) {
						return row.version;
					}
					else {
						return 0;
					}
				})
				.catch(function(error) {
					if(error.code == '42P01') {
						return 0;
					}
					else {
						throw error;
					}
				});
		},

		createMigration: function(version) {
			return new Promise(function(resolve, reject) {
				let migrationsDir = path.join(process.cwd(), 'migrations');
				fs.mkdir(migrationsDir, function(error) {
					if(error && error.code != 'EEXIST') {
						reject(error);
					}
					else {
						var versionString = zeroPad(version, 100);
						var fileName = versionString + '.js';
						fs.writeFile(path.join(migrationsDir, versionString + '.js'), `'use strict';

exports = module.exports = {
	up: function(lego, queue) {
		//
	},

	down: function(lego, queue) {
		//
	}
};`,
						function(error) {
							if(error) {
								reject(error);
							}
							else {
								resolve(fileName);
							}
						});
					}
				});
			});
		},

		createMigrationsTable: function() {
			return Lego.new `CREATE SCHEMA lego
				CREATE TABLE migrations (
					version INTEGER,
					created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
				)`
				.catch(function(error) {
					if(error.code == '42P06') {
						// The schema already exists. That's fine.
					}
					else {
						throw error;
					}
				});
		},

		loadMigration: function(version) {
			return require(path.join(process.cwd(), 'migrations', zeroPad(version, 100) + '.js'));
		},

		migrate: function(from, to) {
			var self = this;
			var _migrate = function(version, direction) {
				return Lego.transaction(function(lego) {
					var queue = new Queue(lego);

					var migration = self.loadMigration(version);
					var returnValue = migration[direction](lego, queue);

					if(returnValue) {
						throw new Error('Returning in a migration is not possible yet. Migration `' + version + '`.');
					}
					else {
						return Promise.all(queue._)
							.then(function() {
								var newVersion = direction == 'up' ? version : version - 1;
								return lego.new `INSERT INTO lego.migrations (version) VALUES (${newVersion})`;
							});
					}
				});
			};

			var result = this.createMigrationsTable();
			var direction = '';
			var versions = [];

			if(from > to) {
				direction = 'down';

				for(let i = from - to; i > 0; i--) {
					let version = to + i;
					versions.push(version);
				}
			}
			else if(from < to) {
				direction = 'up';

				for(let i = 0; i < (to - from); i++) {
					let version = from + 1 + i;
					versions.push(version);
				}
			}

			versions.forEach(function(version) {
				result = result.then(function() {
					return _migrate(version, direction);
				});
			});

			return result;
		}
	};
};
