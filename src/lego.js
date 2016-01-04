'use strict';

const DATABASE_URL = process.env.DATABASE_URL;
const Driver = require('./driver')(DATABASE_URL);

class LegoInstance {
	constructor() {
		this._strings = [];
		this._parameters = [];
	}

	add(stringsOrOtherLegoInstance, ...parameters) {
		if(stringsOrOtherLegoInstance instanceof LegoInstance) {
			let otherLego = stringsOrOtherLegoInstance;

			this._strings 	= this._strings.concat(otherLego._strings);
			this._parameters = this._parameters.concat(otherLego._parameters);
		}
		else {
			let strings = stringsOrOtherLegoInstance;
			if(parameters.length + 1 !== strings.length) {
				throw new Error('Invalid number of parameters in Lego#add.');
			}

			this._strings.push(strings);
			this._parameters = this._parameters.concat(parameters);
		}

		return this;
	}

	first() {
		return this.exec()
			.then(function(rows) {
				if(rows.length) {
					return rows[0];
				}
				else {
					return null;
				}
			});
	}

	then(callback, errback) {
		return this.exec().then(callback, errback);
	}

	toQuery() {
		let index = 1;
		let parameters = this._parameters;
		let query = this._strings
			.map(function(strings) {
				let _ = '';

				strings.forEach(function(string, i) {
					if(i + 1 == strings.length) {
						_ += string;
					}
					else {
						_ += string + '$' + index++;
					}
				});

				return _;
			})
			.join('\n');

		return {
			text: query,
			parameters: parameters
		};
	}

	exec() {
		let query = this.toQuery();

		return Driver.query(query.text, query.parameters);
	}
}

var Lego = {
	new: function(strings) {
		var lego = new LegoInstance();

		if(strings) {
			var args = [].slice.call(arguments, 0);
			lego.add.apply(lego, args);
		}

		return lego;
	},

	Driver: require('./driver'),
	LegoInstance: LegoInstance
};

exports = module.exports = Lego;
