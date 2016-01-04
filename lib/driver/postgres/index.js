'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pg = require('pg');

exports = module.exports = (function () {
	function PostgresDriver(databaseURL) {
		_classCallCheck(this, PostgresDriver);

		this._databaseURL = databaseURL;
	}

	_createClass(PostgresDriver, [{
		key: 'query',
		value: function query(text, parameters) {
			var self = this;
			return new Promise(function (resolve, reject) {
				pg.connect(self._databaseURL, function (error, client, done) {
					if (error) {
						reject(error);
					} else {
						client.query(text, parameters, function (error, result) {
							done();

							if (error) {
								reject(error);
							} else {
								resolve(result.rows);
							}
						});
					}
				});
			});
		}
	}]);

	return PostgresDriver;
})();