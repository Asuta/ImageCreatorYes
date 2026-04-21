(function setupReferenceImageTools(globalScope) {
  const MAX_REFERENCE_IMAGES = 3;

  function addReferenceImages(currentItems, newItems) {
    const items = [...currentItems, ...newItems];

    if (items.length > MAX_REFERENCE_IMAGES) {
      throw new Error('最多只能选择 3 张参考图');
    }

    return items;
  }

  function moveReferenceImage(items, fromIndex, toIndex) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= items.length ||
      toIndex >= items.length
    ) {
      return [...items];
    }

    const nextItems = [...items];
    const [item] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, item);
    return nextItems;
  }

  function removeReferenceImage(items, id) {
    return items.filter((item) => item.id !== id);
  }

  const api = {
    MAX_REFERENCE_IMAGES,
    addReferenceImages,
    moveReferenceImage,
    removeReferenceImage,
  };

  if (typeof window !== 'undefined') {
    window.referenceImageTools = api;
  }

  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
