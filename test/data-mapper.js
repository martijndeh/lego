const Lego = require('..');
const assert = require('assert');

describe('data mapper', function() {
	it('simple rows', function() {
		var rows = [{
			id: 1,
			name: 'Test 1'
		}, {
			id: 2,
			name: 'Test 2'
		}];

		var objects = Lego.parse(rows, [{
			id: 'id',
			name: 'name'
		}]);

		assert.equal(objects.length, 2);
		assert.equal(objects[0].id, 1);
		assert.equal(objects[0].name, 'Test 1');
		assert.equal(objects[1].id, 2);
		assert.equal(objects[1].name, 'Test 2');
	});


	it('objects with 1 relation', function() {
		var rows = [{
			id: 1,
			test_id: 1,
			name: 'Test 1'
		}, {
			id: 1,
			test_id: 2,
			name: 'Test 2'
		}];

		var objects = Lego.parse(rows, [{
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'name'
			}]
		}]);

		assert.equal(objects.length, 1);
		assert.equal(objects[0].id, 1);
		assert.equal(objects[0].tests.length, 2);
	});

	it('object with 2 relations', function() {
		var rows = [{
			id: 1,
			test_id: 1,
			name: 'Test 1',
			foo_id: 11,
			foo_name: 'Foo 1'
		}, {
			id: 1,
			test_id: 2,
			name: 'Test 2',
			foo_id: 21,
			foo_name: 'Foo 1'
		}];

		var objects = Lego.parse(rows, [{
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'name'
			}],
			foos: [{
				id: 'foo_id',
				name: 'foo_name'
			}]
		}]);

		assert.equal(objects.length, 1);
		assert.equal(objects[0].id, 1);
		assert.equal(objects[0].tests.length, 2);
		assert.equal(objects[0].tests[0].id, 1);
		assert.equal(objects[0].tests[1].id, 2);

		assert.equal(objects[0].foos.length, 2);
		assert.equal(objects[0].foos[0].id, 11);
		assert.equal(objects[0].foos[1].id, 21);
	});

	it('object with 3 relations and 1 null', function() {
		var rows = [{
			id: 1,
			test_id: 1,
			name: 'Test 1',
			foo_id: 11,
			foo_name: 'Foo 1',
			bar_id: 1337,
			bar_name: 'Bar 1'
		}, {
			id: 1,
			test_id: 2,
			name: 'Test 2',
			foo_id: 21,
			foo_name: 'Foo 1',
			bar_id: null,
			bar_name: null
		}];

		var objects = Lego.parse(rows, [{
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'name'
			}],
			foos: [{
				id: 'foo_id',
				name: 'foo_name'
			}],
			bars: [{
				id: 'bar_id',
				name: 'bar_name'
			}]
		}]);

		assert.equal(objects.length, 1);
		assert.equal(objects[0].id, 1);
		assert.equal(objects[0].tests.length, 2);
		assert.equal(objects[0].tests[0].id, 1);
		assert.equal(objects[0].tests[1].id, 2);

		assert.equal(objects[0].foos.length, 2);
		assert.equal(objects[0].foos[0].id, 11);
		assert.equal(objects[0].foos[1].id, 21);

		assert.equal(objects[0].bars.length, 1);
	});

	it('object with 1 relation but multiple rows', function() {
		var rows = [{
			id: 1,
			test_id: 1,
			name: 'Test 1'
		}, {
			id: 2,
			test_id: 2,
			name: 'Test 2'
		}, {
			id: 1,
			test_id: 3,
			name: 'Test 3'
		}, {
			id: 2,
			test_id: 4,
			name: 'Test 4'
		}];

		var objects = Lego.parse(rows, [{
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'name'
			}]
		}]);

		assert.equal(objects.length, 2);
		assert.equal(objects[0].id, 1);
		assert.equal(objects[0].tests.length, 2);

		assert.equal(objects[1].id, 2);
		assert.equal(objects[1].tests.length, 2);
	});
});
