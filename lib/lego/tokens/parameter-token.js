'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _token = require('./token.js');

var _token2 = _interopRequireDefault(_token);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ParameterToken = function (_Token) {
	_inherits(ParameterToken, _Token);

	function ParameterToken(parameter) {
		_classCallCheck(this, ParameterToken);

		var _this = _possibleConstructorReturn(this, (ParameterToken.__proto__ || Object.getPrototypeOf(ParameterToken)).call(this));

		_this.parameter = null;


		_this.parameter = parameter;
		return _this;
	}

	_createClass(ParameterToken, [{
		key: 'reduce',
		value: function reduce(state) {
			state.text.push('$' + (state.parameters.length + 1));
			state.parameters.push(this.parameter);
			return state;
		}
	}]);

	return ParameterToken;
}(_token2.default);

exports.default = ParameterToken;