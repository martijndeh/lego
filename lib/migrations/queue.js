"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports = module.exports = (function () {
	function LegoQueue(lego) {
		_classCallCheck(this, LegoQueue);

		this._lego = lego;
		this._ = [];
	}

	_createClass(LegoQueue, [{
		key: "add",
		value: function add(stringsOrOtherLegoInstance) {
			for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				parameters[_key - 1] = arguments[_key];
			}

			var lego = null;

			if (stringsOrOtherLegoInstance instanceof this._lego.constructor) {
				lego = stringsOrOtherLegoInstance;
			} else {
				lego = this._lego.sql();

				var args = [].slice.call(arguments, 0);
				lego.append.apply(lego, args);
			}

			this._.push(lego);
			return this;
		}
	}]);

	return LegoQueue;
})();