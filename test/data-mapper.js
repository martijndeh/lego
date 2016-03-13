const Lego = require('..');
const assert = require('assert');
const util = require('util');

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

	it('single object', function() {
		const rows = [{
			id: 'd15d8d11-2b1c-46b4-a832-f3e2958fa45f',
			name: 'musketeer.ai',
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			name: 'name',
		});

		assert.notEqual(object, null);
	});

	it('single nested object', function () {
		const rows = [{
			id: 'd15d8d11-2b1c-46b4-a832-f3e2958fa45f',
			test_id: 'a2aee9d5-5539-48c8-b474-3dd882e0e992',
			test_name: 'My First Test',
			variant_id: '2b2e2ffa-7246-48c6-8596-a2ee3b066fc7',
			variant_name: 'A',
			stats_id: '8cdae3d9-4ef0-4772-a36b-f6cf76d9105a',
			conversions: 10,
			participants: 10,
			current_conversion_rate: null,
			min_conversion_rate: null,
			max_conversion_rate: null,
			estimated_conversion_rate: null,
			domain_id: 'c09c1033-81ed-4919-96fc-3cae046ee69b',
			domain_created_at: new Date(),
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'test_name',
				variants: [{
					id: 'variant_id',
					name: 'variant_name',
					stats: {
						id: 'stats_id',
						conversions: 'conversions',
						participants: 'participants',
						current_conversion_rate: 'current_conversion_rate',
						min_conversion_rate: 'min_conversion_rate',
						max_conversion_rate: 'max_conversion_rate',
						estimated_conversion_rate: 'estimated_conversion_rate',
					},
				}],
				domain: {
					id: 'domain_id',
					created_at: 'domain_created_at',
				},
			}],
		});

		assert.equal(object.tests[0].domain.id, 'c09c1033-81ed-4919-96fc-3cae046ee69b');
	});

	it('multiple nested objects', function () {
		const rows = [{
			id: 'd15d8d11-2b1c-46b4-a832-f3e2958fa45f',
			test_id: 'a2aee9d5-5539-48c8-b474-3dd882e0e992',
			test_name: 'My First Test',
			variant_id: '2b2e2ffa-7246-48c6-8596-a2ee3b066fc7',
			variant_name: 'A',
			stats_id: '8cdae3d9-4ef0-4772-a36b-f6cf76d9105a',
			conversions: 10,
			participants: 10,
			current_conversion_rate: null,
			min_conversion_rate: null,
			max_conversion_rate: null,
			estimated_conversion_rate: null,
			domain_id: 'c09c1033-81ed-4919-96fc-3cae046ee69b',
			domain_created_at: new Date(),
		}, {
			id: 'd15d8d11-2b1c-46b4-a832-f3e2958fa45f',
			test_id: 'a2aee9d5-5539-48c8-b474-3dd882e0e992',
			test_name: 'My First Test',
			variant_id: '2b2e2ffa-7246-48c6-8596-a2ee3b066fc7',
			variant_name: 'A',
			stats_id: '8cdae3d9-4ef0-4772-a36b-f6cf76d9105a',
			conversions: 10,
			participants: 10,
			current_conversion_rate: null,
			min_conversion_rate: null,
			max_conversion_rate: null,
			estimated_conversion_rate: null,
			domain_id: 'd10c1033-81ed-4919-96fc-3cae046ee69f',
			domain_created_at: new Date(),
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'test_name',
				variants: [{
					id: 'variant_id',
					name: 'variant_name',
					stats: {
						id: 'stats_id',
						conversions: 'conversions',
						participants: 'participants',
						current_conversion_rate: 'current_conversion_rate',
						min_conversion_rate: 'min_conversion_rate',
						max_conversion_rate: 'max_conversion_rate',
						estimated_conversion_rate: 'estimated_conversion_rate',
					},
				}],
				domains: [{
					id: 'domain_id',
					created_at: 'domain_created_at',
				}],
			}],
		});

		assert.equal(object.tests[0].domains.length, 2);
	});
});
