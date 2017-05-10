import Lego from '../src';
import assert from 'assert';
import { compile } from '../src/parse/index.js';

describe('parse', function () {
	it('simple rows', function () {
		const rows = [{
			id: 1,
			name: 'Test 1',
		}, {
			id: 2,
			name: 'Test 2',
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			name: 'name',
		}]);

		assert.equal(objects.length, 2);
		assert.equal(objects[0].id, 1);
		assert.equal(objects[0].name, 'Test 1');
		assert.equal(objects[1].id, 2);
		assert.equal(objects[1].name, 'Test 2');
	});

	it('simple rows with unused fields', function () {
		const rows = [{
			id: 1,
			name: 'Test 1',
			isNotUsed: true,
		}, {
			id: 2,
			name: 'Test 2',
			isNotUsed: true,
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			name: 'name',
		}]);

		assert.equal(objects.length, 2);
		assert.equal(objects[0].id, 1);
		assert.equal(objects[0].name, 'Test 1');
		assert.equal(objects[1].id, 2);
		assert.equal(objects[1].name, 'Test 2');
	});

	it('objects with 1 relation', function () {
		const rows = [{
			id: 1,
			test_id: 1,
			name: 'Test 1'
		}, {
			id: 1,
			test_id: 2,
			name: 'Test 2'
		}];

		const objects = Lego.parse(rows, [{
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

	it('object with 2 relations', function () {
		const rows = [{
			id: 1,
			test_id: 1,
			name: 'Test 1',
			foo_id: 11,
			foo_name: 'Foo 1',
		}, {
			id: 1,
			test_id: 2,
			name: 'Test 2',
			foo_id: 21,
			foo_name: 'Foo 1',
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'name',
			}],
			foos: [{
				id: 'foo_id',
				name: 'foo_name',
			}],
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

	it('object with 3 relations and 1 null', function () {
		const rows = [{
			id: 1,
			test_id: 1,
			name: 'Test 1',
			foo_id: 11,
			foo_name: 'Foo 1',
			bar_id: 1337,
			bar_name: 'Bar 1',
		}, {
			id: 1,
			test_id: 2,
			name: 'Test 2',
			foo_id: 21,
			foo_name: 'Foo 1',
			bar_id: null,
			bar_name: null,
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			tests: [{
				id: 'test_id',
				name: 'name',
			}],
			foos: [{
				id: 'foo_id',
				name: 'foo_name',
			}],
			bars: [{
				id: 'bar_id',
				name: 'bar_name',
			}],
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

	it('object with 1 relation but multiple rows', function () {
		const rows = [{
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

		const objects = Lego.parse(rows, [{
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

	it('single object', function () {
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
			domain_id: 'c09c1033-81ed-4919-96fc-3cae046ee69b',
		}, {
			id: 'd15d8d11-2b1c-46b4-a832-f3e2958fa45f',
			test_id: 'a2aee9d5-5539-48c8-b474-3dd882e0e992',
			domain_id: 'd10c1033-81ed-4919-96fc-3cae046ee69f',
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			tests: [{
				id: 'test_id',
				domains: [{
					id: 'domain_id',
				}],
			}],
		});

		assert.equal(object.tests[0].domains.length, 2);
	});

	it('aggregate columns', () => {
		const rows = [{
			id: 'aa9a0f38-1ce3-4798-ae27-4b92519759aa',
			short_code: '2TD5',
			name: 'musketeer.ai',
			domain_id: 'badcafdd-b557-47ac-8194-56396c5e7fe2',
			domain_name: '127.0.0.1:3000',
			test_id: 'e5214a78-c51c-4359-b76c-17fef40bff28',
			test_name: 'MyFirstTest',
			test_participants: 0,
		}, {
			id: 'aa9a0f38-1ce3-4798-ae27-4b92519759aa',
			short_code: '2TD5',
			name: 'musketeer.ai',
			domain_id: '6acaf2f0-4b4b-4ff1-902c-59737c282e0b',
			domain_name: 'local.musketeer.ai:3000',
			test_id: 'e5214a78-c51c-4359-b76c-17fef40bff28',
			test_name: 'MyFirstTest',
			test_participants: 31041,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			name: 'name',
			short_code: 'short_code',
			domains: [{
				id: 'domain_id',
				name: 'domain_name',
				tests: [{
					id: 'test_id',
					name: 'test_name',
					participants: 'test_participants',
				}],
			}],
		});

		assert.equal(object.id, rows[0].id);
		assert.equal(object.domains && object.domains.length, 2);
		assert.equal(object.domains[0].tests && object.domains[0].tests.length, 1);
		assert.equal(object.domains[1].tests && object.domains[1].tests.length, 1);
	});

	it('functions', () => {
		const rows = [{
			id: 1,
			name: 'A',
			count: '1',
		}, {
			id: 2,
			name: 'B',
			count: '2',
		}, {
			id: 3,
			name: 'C',
			count: '3',
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			name: 'name',
			count: ['count', (count) => parseInt(count)],
		}]);

		assert.deepStrictEqual(objects, [{
			id: 1,
			name: 'A',
			count: 1,
		}, {
			id: 2,
			name: 'B',
			count: 2,
		}, {
			id: 3,
			name: 'C',
			count: 3,
		}]);
	});

	it('should handle duplicate child objects', () => {
		const rows = [{
			'id': '0c4dc991-c594-4460-9963-9904cd08f913',
			'subcategory_id': '8ee3d487-c12f-4a49-b8fa-b014c5a50073',
			'subcategory_name': 'A',
			'category_id': '58a409e0-7e8a-449a-8f7d-477055a92afd',
			'category_name': 'C',
		}, {
			'id': '507ae1a5-9907-4727-86f3-c24698515adc',
			'subcategory_id': 'e8dbeccb-bce1-4094-b265-195efea4774e',
			'subcategory_name': 'B',
			'category_id': '58a409e0-7e8a-449a-8f7d-477055a92afd',
			'category_name': 'C',
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			subcategory: {
				id: 'subcategory_id',
				name: 'subcategory_name',
			},
			category: {
				id: 'category_id',
				name: 'category_name',
			},
		}]);

		assert.notEqual(objects[0].category, null);
		assert.notEqual(objects[1].category, null);
	});

	it('should set empty array if there are no rows', () => {
		const rows = [];
		const objects = Lego.parse(rows, [{
			'id': 'id',
		}]);

		assert.deepEqual(objects, []);
	});

	it('should return the same results when using the compiler multiple times', () => {
		const rows = [{
			id: 1,
		}];

		const compiler = compile([{
			id: 'id',
		}]);

		assert.deepEqual(compiler(rows), compiler(rows));
	});

	it('should set empty array if no items exist', () => {
		const rows = [{
			id: 1,
			child_id: null,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			children: [{
				id: 'child_id',
			}],
		});

		assert.deepEqual(object, {
			id: 1,
			children: [],
		});
	});

	it('should not set property if item does not exist', () => {
		const rows = [{
			id: '90b3c2f3-e9c9-486c-9eaa-44dbfdcabe34',
			slug: 'test',
			item_id: null,
			quantity: null,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			slug: 'slug',
			items: [{
				id: 'item_id',
				quantity: 'quantity',
			}],
		});

		assert.deepEqual(object, {
			id: rows[0].id,
			slug: rows[0].slug,
			items: [],
		});
	});

	it('should not add children if parent does not exist', () => {
		const rows = [{
			id: 1,
			item_id: null,
			quantity: null,
			product_id: null,
			product_name: null,
			price_id: null,
			value: null,
			image_id: null,
			image_url: null,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			items: [{
				id: 'item_id',
				quantity: 'quantity',
				product: {
					id: 'product_id',
					name: 'product_name',
					prices: [{
						id: 'price_id',
						value: 'value',
					}],
					image: {
						id: 'image_id',
						name: 'image_name',
					},
				},
			}],
		});

		assert.deepEqual(object, {
			id: 1,
			items: [],
		});
	});

	it('should set property to null if column does not exist', () => {
		const rows = [{
			id: 1,
			item_id: null,
			item_name: null,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			item: {
				id: 'item_id',
				name: 'item_name',
			},
		});

		assert.deepEqual(object, {
			id: rows[0].id,
			item: null,
		});
	});

	it('nested object with 2 properties and no id', function () {
		const rows = [{
			id: 1,
			name: 'Test 1',
			foo: 'bar',
		}, {
			id: 2,
			name: 'Test 2',
			foo: 'baz',
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			test: {
				a: 'name',
				b: 'foo',
			},
		}]);


		assert.deepEqual(objects, [{
			id: 1,
			test: {
				a: 'Test 1',
				b: 'bar',
			},
		}, {
			id: 2,
			test: {
				a: 'Test 2',
				b: 'baz',
			},
		}]);
	});

	it('nested object with 1 property and no id', function () {
		const rows = [{
			id: 1,
			name: 'Test 1',
		}, {
			id: 2,
			name: 'Test 2',
		}];

		const objects = Lego.parse(rows, [{
			id: 'id',
			test: {
				a: 'name',
			},
		}]);


		assert.deepEqual(objects, [{
			id: 1,
			test: {
				a: 'Test 1',
			},
		}, {
			id: 2,
			test: {
				a: 'Test 2',
			},
		}]);
	});

	it('double nested object without id', function () {
		const rows = [{
			id: 1,
			account_id: 1,
			latitude: 52,
			longitude: 7,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			account: {
				id: 'account_id',
			},
			location: {
				latitude: 'latitude',
				longitude: 'longitude',
			},
		});

		assert.deepEqual(object, {
			id: 1,
			account: {
				id: 1,
			},
			location: {
				latitude: 52,
				longitude: 7,
			},
		});
	});

	it('nested object with id', function () {
		const rows = [{
			id: 1,
			account_id: 2,
			client_id: 3,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			account: {
				id: 'account_id',
			},
			client: {
				id: 'client_id',
			},
		});

		assert.deepEqual(object, {
			id: 1,
			account: {
				id: 2,
			},
			client: {
				id: 3,
			},
		});
	});

	it('nested object with function', function () {
		const rows = [{
			id: 1,
			value: 2,
		}];

		const object = Lego.parse(rows, {
			id: 'id',
			account: {
				value: ['value', (value) => value * 2],
			},
		});

		assert.deepEqual(object, {
			id: 1,
			account: {
				value: 4,
			},
		});
	});
});
