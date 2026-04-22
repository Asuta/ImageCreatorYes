(function initImageCreatorApp() {
  const form = document.getElementById('image-form');
  const submitButton = document.getElementById('submit-button');
  const statusText = document.getElementById('status-text');
  const results = document.getElementById('results');
  const imageCardTemplate = document.getElementById('image-card-template');
  const referenceInput = document.getElementById('reference-images');
  const referenceSummary = document.getElementById('reference-summary');
  const referenceDropzone = document.getElementById('reference-dropzone');
  const referencePreviewList = document.getElementById('reference-preview-list');
  const referencePreviewTemplate = document.getElementById('reference-preview-template');
  const referenceImageTools =
    window.referenceImageTools ||
    createFallbackReferenceImageTools();
  const {
    MAX_REFERENCE_IMAGES,
    addReferenceImages,
    moveReferenceImage,
    removeReferenceImage,
  } = referenceImageTools;

  let referenceItems = [];
  let draggedReferenceId = null;

  referenceInput.addEventListener('change', () => {
    ingestReferenceFiles(Array.from(referenceInput.files || []));
    referenceInput.value = '';
  });

  referenceDropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    referenceDropzone.classList.add('dragover');
  });

  referenceDropzone.addEventListener('dragleave', () => {
    referenceDropzone.classList.remove('dragover');
  });

  referenceDropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    referenceDropzone.classList.remove('dragover');
    ingestReferenceFiles(Array.from(event.dataTransfer?.files || []));
  });

  referencePreviewList.addEventListener('click', (event) => {
    const card = event.target.closest('.reference-card');
    if (!card) {
      return;
    }

    const index = Number(card.dataset.index);
    const id = card.dataset.id;

    if (event.target.matches('.remove-reference')) {
      clearPreviewUrl(id);
      referenceItems = removeReferenceImage(referenceItems, id);
      renderReferenceItems();
      return;
    }

    if (event.target.matches('.move-left')) {
      referenceItems = moveReferenceImage(referenceItems, index, index - 1);
      renderReferenceItems();
      return;
    }

    if (event.target.matches('.move-right')) {
      referenceItems = moveReferenceImage(referenceItems, index, index + 1);
      renderReferenceItems();
    }
  });

  referencePreviewList.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.reference-card');
    if (!card) {
      return;
    }

    draggedReferenceId = card.dataset.id;
    card.classList.add('dragging');
  });

  referencePreviewList.addEventListener('dragend', (event) => {
    const card = event.target.closest('.reference-card');
    if (card) {
      card.classList.remove('dragging');
    }
    draggedReferenceId = null;
  });

  referencePreviewList.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  referencePreviewList.addEventListener('drop', (event) => {
    event.preventDefault();
    const card = event.target.closest('.reference-card');
    if (!card || !draggedReferenceId) {
      return;
    }

    const fromIndex = referenceItems.findIndex((item) => item.id === draggedReferenceId);
    const toIndex = Number(card.dataset.index);

    if (fromIndex === -1 || Number.isNaN(toIndex)) {
      return;
    }

    referenceItems = moveReferenceImage(referenceItems, fromIndex, toIndex);
    renderReferenceItems();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    setLoading(true);
    setStatus('正在生成图片，请稍候…');
    results.replaceChildren();

    try {
      const payload = {
        model: formData.get('model'),
        prompt: formData.get('prompt'),
        negativePrompt: formData.get('negativePrompt'),
        size: formData.get('size'),
        count: formData.get('count'),
        promptExtend: formData.get('promptExtend') === 'on',
        watermark: formData.get('watermark') === 'on',
        referenceImages: await Promise.all(
          referenceItems.map((item) => readFileAsDataUrl(item.file)),
        ),
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.error || '生成失败');
      }

      const images = responseBody.images || [];

      if (!images.length) {
        setStatus('接口返回成功，但没有拿到图片地址。');
        return;
      }

      renderImages(images);
      setStatus(`生成完成，共 ${images.length} 张。`);
    } catch (error) {
      setStatus(`生成失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  });

  function renderImages(images) {
    const fragment = document.createDocumentFragment();

    for (const imageUrl of images) {
    const card = imageCardTemplate.content.cloneNode(true);
    const article = card.querySelector('.card');
    const img = card.querySelector('img');
    const link = card.querySelector('a');
    const cutoutButton = card.querySelector('.cutout-button');

    img.src = imageUrl;
    link.href = imageUrl;
    link.textContent = '打开原图';
    cutoutButton.addEventListener('click', () => createCutout(article, imageUrl));
    fragment.appendChild(card);
  }

    results.replaceChildren(fragment);
  }

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? '生成中…' : '开始生成';
  }

  function setStatus(message) {
    statusText.textContent = message;
  }

  async function createCutout(card, imageUrl) {
    const button = card.querySelector('.cutout-button');
    const status = card.querySelector('.cutout-status');
    const result = card.querySelector('.cutout-result');

    button.disabled = true;
    button.textContent = '抠图中…';
    status.textContent = '正在调用本地抠图工具，首次运行可能需要下载模型。';
    result.replaceChildren();

    try {
      const response = await fetch('/api/cutout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });
      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.error || '抠图失败');
      }

      renderCutoutResult(result, responseBody.imageUrl);
      status.textContent = '抠图完成。';
    } catch (error) {
      status.textContent = `抠图失败：${error.message}`;
    } finally {
      button.disabled = false;
      button.textContent = '重新抠图';
    }
  }

  function renderCutoutResult(container, imageUrl) {
    const image = document.createElement('img');
    const link = document.createElement('a');

    image.src = imageUrl;
    image.alt = '透明背景 PNG';
    image.loading = 'lazy';
    link.href = imageUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = '打开 PNG';

    container.replaceChildren(image, link);
  }

  function ingestReferenceFiles(files) {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (!imageFiles.length) {
      updateReferenceSummary('未选择参考图');
      return;
    }

    const newItems = imageFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${getRandomId()}`,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    try {
      referenceItems = addReferenceImages(referenceItems, newItems);
      renderReferenceItems();
    } catch (error) {
      newItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      updateReferenceSummary(error.message);
      setStatus(error.message);
    }
  }

  function renderReferenceItems() {
    const fragment = document.createDocumentFragment();

    referenceItems.forEach((item, index) => {
      const card = referencePreviewTemplate.content.cloneNode(true);
      const article = card.querySelector('.reference-card');
      const image = card.querySelector('img');
      const name = card.querySelector('.reference-name');
      const order = card.querySelector('.reference-order');
      const moveLeft = card.querySelector('.move-left');
      const moveRight = card.querySelector('.move-right');

      article.dataset.id = item.id;
      article.dataset.index = String(index);
      image.src = item.previewUrl;
      name.textContent = item.name;
      order.textContent = `第 ${index + 1} 张`;
      moveLeft.disabled = index === 0;
      moveRight.disabled = index === referenceItems.length - 1;

      fragment.appendChild(card);
    });

    referencePreviewList.replaceChildren(fragment);
    updateReferenceSummary(
      referenceItems.length
        ? `已选择 ${referenceItems.length} / ${MAX_REFERENCE_IMAGES} 张，可拖拽排序`
        : '未选择参考图',
    );
  }

  function clearPreviewUrl(id) {
    const target = referenceItems.find((item) => item.id === id);
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
  }

  function updateReferenceSummary(message) {
    referenceSummary.textContent = message;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`读取参考图失败：${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  function getRandomId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createFallbackReferenceImageTools() {
    return {
      MAX_REFERENCE_IMAGES: 3,
      addReferenceImages(currentItems, newItems) {
        const items = [...currentItems, ...newItems];

        if (items.length > 3) {
          throw new Error('最多只能选择 3 张参考图');
        }

        return items;
      },
      moveReferenceImage(items, fromIndex, toIndex) {
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
      },
      removeReferenceImage(items, id) {
        return items.filter((item) => item.id !== id);
      },
    };
  }
})();
