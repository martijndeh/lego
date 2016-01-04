if(process.env.NODE_COV) {
	exports = module.exports = require('./lib-cov/lego.js');
}
else {
	exports = module.exports = require('./lib/lego.js');
}
