const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addReferenceImages,
  moveReferenceImage,
  removeReferenceImage,
} = require('../public/referenceImages');

test('adds reference image items up to the maximum', () => {
  const items = addReferenceImages(
    [{ id: 'one', name: 'one.png' }],
    [
      { id: 'two', name: 'two.png' },
      { id: 'three', name: 'three.png' },
    ],
  );

  assert.deepEqual(
    items.map((item) => item.name),
    ['one.png', 'two.png', 'three.png'],
  );
});

test('rejects adding more than three reference images', () => {
  assert.throws(
    () =>
      addReferenceImages(
        [
          { id: 'one', name: 'one.png' },
          { id: 'two', name: 'two.png' },
        ],
        [
          { id: 'three', name: 'three.png' },
          { id: 'four', name: 'four.png' },
        ],
      ),
    /最多只能选择 3 张参考图/,
  );
});

test('moves a reference image to a new position', () => {
  const items = moveReferenceImage(
    [
      { id: 'one', name: 'one.png' },
      { id: 'two', name: 'two.png' },
      { id: 'three', name: 'three.png' },
    ],
    0,
    2,
  );

  assert.deepEqual(
    items.map((item) => item.name),
    ['two.png', 'three.png', 'one.png'],
  );
});

test('removes a reference image by id', () => {
  const items = removeReferenceImage(
    [
      { id: 'one', name: 'one.png' },
      { id: 'two', name: 'two.png' },
    ],
    'one',
  );

  assert.deepEqual(items, [{ id: 'two', name: 'two.png' }]);
});
