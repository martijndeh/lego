require('dotenv').load({silent: true});

import minimist from 'minimist';
import path from 'path';
import Migrations from '../migrations/index.js';
import { setPoolIdleTimeout } from '../driver/postgres/index.js';
import chalk from 'chalk';

setPoolIdleTimeout(500);

const argv = minimist(process.argv.slice(2));

function _space(count) {
	return new Array(count + 1).join(' ');
}

function _show(message) {
	return message + _space(32 - message.length);
}

const commandMaps = {
	'migrate:make': {
		description: 'Creates a new migration file.',
		action: function () {
			return Migrations.getCurrentVersion()
				.then(function (version) {
					return Migrations.createMigration(version + 1);
				});
		},
	},
	'migrate:latest': {
		description: 'Migrates to the latest migration.',
		action: function () {
			return Migrations.getCurrentVersion()
				.then(function (localVersion) {
					if (localVersion === 0) {
						// We're done. We don't have any Migrations.
						console.log(chalk.bgGreen('There are 0 local Migrations.'));
					}
					else {
						return Migrations.getDatabaseVersion()
							.then(function (databaseVersion) {
								if (localVersion > databaseVersion) {
									console.log(chalk.bgGreen('Migrating from ' + databaseVersion + ' to ' + localVersion));

									return Migrations.migrate(databaseVersion, localVersion)
										.then(function () {
											console.log(chalk.bgGreen('Successfully migrated to ' + localVersion + '.'));
										});
								}
								else if (databaseVersion < localVersion) {
									// Local migrations behind database Migrations.
									throw new Error('Your local migrations are behind your database\'s Migrations.');
								}
								else {
									// Everything up-to-date!
									console.log(chalk.bgGreen('Everything is up-to-date!'));
								}
							});
					}
				});
		},
	},
	'migrate:rollback': {
		description: 'Rolls back the previous migration.',
		action: function () {
			return Migrations.getDatabaseVersion()
				.then(function (databaseVersion) {
					if (databaseVersion === 0) {
						console.log(chalk.bgGreen('Already at version 0!'));
					}
					else {
						console.log(chalk.bgGreen('Rolling back from ' + databaseVersion + ' to ' + databaseVersion - 1));

						return Migrations.migrate(databaseVersion, databaseVersion - 1);
					}
				});
		},
	},
	'migrate:<version>': {
		description: 'Migrates or rolls back to the target migration <version>.',
		action: function (version) {
			return Migrations.getCurrentVersion()
				.then(function (localVersion) {
					return Migrations.migrate(localVersion, version);
				});
		},
	},
	'version': {
		action: function () {
			const packageJSON = require(path.join(__dirname, '..', '..', 'package.json'));
			console.log(packageJSON.version);
		},
	},
	'help': {
		description: 'Shows this help message.',
		action: function () {
			console.log('Usage: lego TOPIC[:ACTION]');
			console.log('');
			console.log('List of topics and actions:');
			console.log('');

			Object.keys(commandMaps).forEach(function (commandKey) {
				const description = commandMaps[commandKey].description;
				if (description) {
					console.log(_space(2) + _show(commandKey) + description);
				}
			});
			console.log('');
		}
	}
};

if(argv._.length) {
	var command = argv._[0].split(':');

	var [activeCommandKey] = Object.keys(commandMaps).filter(function(commandKey) {
		var _ = commandKey.split(':');
		return (command[0] === _[0] && (command[1] === _[1] || _[1][0] === '<'));
	});
	var activeCommand = activeCommandKey ? commandMaps[activeCommandKey] : null;

	if(activeCommand) {
		activeCommand.action(command[1], command[0])
			.then(function () {
				// Done!
			})
			.catch(function (error) {
				if(error.code === '42601' || error.sqlState === '42601') {
					console.log('');
					console.log('Error: ' + error.message);
					console.log('');

					var lines = error.query.split('\n');
					var errorPosition = parseInt(error.position);

					var pos = 0;

					for(let i = 0, il = lines.length; i < il; i++) {
						let numberOfTabs = (lines[i].match(/\t/g) || []).length;
						let lineLength = lines[i].length + 1;

						let line = lines[i].replace(/\t/g, '    ');

						console.log(chalk.bgRed(line));

						if(errorPosition > pos && errorPosition < pos + lineLength) {
							var left = (errorPosition - pos);
							console.log(_space(left + numberOfTabs * 3 - 1) + '^');
						}

						pos += lineLength;
					}
				}
				else {
					console.log(error);
				}
			});
	}
	else {
		console.log('Unknown command `' + argv._[0] + '`.');
	}
}
else {
	commandMaps.help.action();
}
