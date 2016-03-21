exports = module.exports = class LegoQueue {
	constructor(lego) {
		this._lego = lego;
		this._ = [];
	}

	add(stringsOrOtherLegoInstance, ...parameters) {
		let lego = null;

		if (stringsOrOtherLegoInstance instanceof this._lego.constructor) {
			lego = stringsOrOtherLegoInstance;
		}
		else {
			lego = this._lego.sql();

			const args = [].slice.call(arguments, 0);
			lego.append.apply(lego, args);
		}

		this._.push(lego);
		return this;
	}
};
