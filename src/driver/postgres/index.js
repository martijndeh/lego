const pg = require('pg');

exports = module.exports = class PostgresDriver {
	constructor(databaseURL) {
		this._databaseURL = databaseURL;
	}

	query(text, parameters) {
		var self = this;
		return new Promise(function(resolve, reject) {
			pg.connect(self._databaseURL, function(error, client, done) {
				if(error) {
					reject(error);
				}
				else {
					client.query(text, parameters, function(error, result) {
						done();

						if(error) {
							reject(error);
						}
						else {
							resolve(result.rows);
						}
					});
				}
			});
		});
	}
};
