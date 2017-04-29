import SchemaManager from './schema.js';
import path from 'path';
import fs from 'fs';

function getSchemaFileNames() {
	return new Promise((resolve, reject) => {
		fs.readdir(path.join(process.cwd(), 'schema'), (error, fileNames) => {
			if (error) {
				if (error.errno === -2) {
					// The directory does not exist.

					resolve([]);
				}
				else {
					reject(error);
				}
			}
			else {
				resolve(fileNames);
			}
		});
	});
}

export default async function generateMigration(migrationFileNames) {
	const schemaManager = new SchemaManager();
	const schemaFileNames = await getSchemaFileNames();

	for (let i = 0, il = migrationFileNames.length; i < il; i++) {
		const migrationFileName = migrationFileNames[i];
		const {
			up,
		} = require(path.join(process.cwd(), 'migrations', migrationFileName));

		await schemaManager.addMigration(up);
	}

	for (let i = 0, il = schemaFileNames.length; i < il; i++) {
		const schemaFileName = schemaFileNames[i];
		const file = require(path.join(process.cwd(), 'schema', schemaFileName));

		if (file.default) {
			await schemaManager.defineSchema(file.default);
		}
	}

	return schemaManager.createMigration();
}
