'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

require('dotenv').load({ silent: true });

var path = require('path');
var argv = require('minimist')(process.argv.slice(2));

var Lego = require('./../lego.js');
var migrations = Lego.Migrations;
var chalk = require('chalk');

if (Lego.DriverInstance.setPoolIdleTimeout) {
	Lego.DriverInstance.setPoolIdleTimeout(500);
}

function _space(count) {
	return new Array(count + 1).join(' ');
}

var _show = function _show(message) {
	return message + _space(32 - message.length);
};

var commandMaps = {
	'migrate:make': {
		description: 'Creates a new migration file.',
		action: function action() {
			return migrations.getCurrentVersion().then(function (version) {
				return migrations.createMigration(version + 1);
			});
		}
	},
	'migrate:latest': {
		description: 'Migrates to the latest migration.',
		action: function action() {
			return migrations.getCurrentVersion().then(function (localVersion) {
				if (localVersion === 0) {
					// We're done. We don't have any migrations.
					console.log(chalk.bgGreen('There are 0 local migrations.'));
				} else {
					return migrations.getDatabaseVersion().then(function (databaseVersion) {
						if (localVersion > databaseVersion) {
							console.log(chalk.bgGreen('Migrating from ' + databaseVersion + ' to ' + localVersion));

							return migrations.migrate(databaseVersion, localVersion).then(function () {
								console.log(chalk.bgGreen('Successfully migrated to ' + localVersion + '.'));
							});
						} else if (databaseVersion < localVersion) {
							// Local migrations behind database migrations.
							throw new Error('Your local migrations are behind your database\'s migrations.');
						} else {
							// Everything up-to-date!
							console.log(chalk.bgGreen('Everything is up-to-date!'));
						}
					});
				}
			});
		}
	},
	'migrate:rollback': {
		description: 'Rolls back the previous migration.',
		action: function action() {
			return migrations.getDatabaseVersion().then(function (databaseVersion) {
				if (databaseVersion === 0) {
					console.log(chalk.bgGreen('Already at version 0!'));
				} else {
					console.log(chalk.bgGreen('Rolling back from ' + databaseVersion + ' to ' + databaseVersion - 1));

					return migrations.migrate(databaseVersion, databaseVersion - 1);
				}
			});
		}
	},
	'migrate:<version>': {
		description: 'Migrates or rolls back to the target migration <version>.',
		action: function action(version) {
			return migrations.getCurrentVersion().then(function (localVersion) {
				return migrations.migrate(localVersion, version);
			});
		}
	},
	'version': {
		action: function action() {
			var packageJSON = require(path.join(__dirname, '..', '..', 'package.json'));
			console.log(packageJSON.version);
		}
	},
	'help': {
		description: 'Shows this help message.',
		action: function action() {
			console.log('Usage: lego TOPIC[:ACTION]');
			console.log('');
			console.log('List of topics and actions:');
			console.log('');

			Object.keys(commandMaps).forEach(function (commandKey) {
				var description = commandMaps[commandKey].description;
				if (description) {
					console.log(_space(2) + _show(commandKey) + description);
				}
			});
			console.log('');
		}
	}
};

if (argv._.length) {
	var command = argv._[0].split(':');

	var _Object$keys$filter = Object.keys(commandMaps).filter(function (commandKey) {
		var _ = commandKey.split(':');
		return command[0] === _[0] && (command[1] === _[1] || _[1][0] === '<');
	});

	var _Object$keys$filter2 = _slicedToArray(_Object$keys$filter, 1);

	var activeCommandKey = _Object$keys$filter2[0];

	var activeCommand = activeCommandKey ? commandMaps[activeCommandKey] : null;

	if (activeCommand) {
		activeCommand.action(command[1], command[0]).then(function () {
			// Done!
		}).catch(function (error) {
			if (error.code === '42601') {
				console.log('');
				console.log('Error: ' + error.message);
				console.log('');

				var lines = error.query.split('\n');
				var errorPosition = parseInt(error.position);

				var pos = 0;

				for (var i = 0, il = lines.length; i < il; i++) {
					var numberOfTabs = (lines[i].match(/\t/g) || []).length;
					var lineLength = lines[i].length + 1;

					var line = lines[i].replace(/\t/g, '    ');

					console.log(chalk.bgRed(line));

					if (errorPosition > pos && errorPosition < pos + lineLength) {
						var left = errorPosition - pos;
						console.log(_space(left + numberOfTabs * 3 - 1) + '^');
					}

					pos += lineLength;
				}
			} else {
				console.log(error);
			}
		});
	} else {
		console.log('Unknown command `' + argv._[0] + '`.');
	}
} else {
	commandMaps.help.action();
}