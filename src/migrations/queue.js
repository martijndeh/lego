exports = module.exports = class LegoQueue {
	constructor(lego) {
		this._lego = lego;
		this._ = [];
	}

	add(stringsOrOtherLegoInstance, ...parameters) { //jshint ignore:line
		let lego = null;

		if(stringsOrOtherLegoInstance instanceof this._lego.constructor) {
			lego = stringsOrOtherLegoInstance;
		}
		else {
			lego = this._lego.new();

			var args = [].slice.call(arguments, 0);
			lego.add.apply(lego, args);
		}

		this._.push(lego);
		return this;
	}
};
