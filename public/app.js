const form = document.getElementById('image-form');
const submitButton = document.getElementById('submit-button');
const statusText = document.getElementById('status-text');
const results = document.getElementById('results');
const imageCardTemplate = document.getElementById('image-card-template');
const referenceInput = document.getElementById('reference-images');
const referenceSummary = document.getElementById('reference-summary');

referenceInput.addEventListener('change', () => {
  const files = Array.from(referenceInput.files || []);

  if (files.length > 3) {
    referenceInput.value = '';
    referenceSummary.textContent = '最多只能选择 3 张参考图。';
    return;
  }

  referenceSummary.textContent = files.length
    ? `已选择 ${files.length} 张：${files.map((file) => file.name).join('、')}`
    : '未选择参考图';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const referenceFiles = Array.from(referenceInput.files || []);

  if (referenceFiles.length > 3) {
    setStatus('最多只能上传 3 张参考图。');
    return;
  }

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
      referenceImages: await Promise.all(referenceFiles.map(readFileAsDataUrl)),
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
    const img = card.querySelector('img');
    const link = card.querySelector('a');

    img.src = imageUrl;
    link.href = imageUrl;
    link.textContent = '打开原图';
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`读取参考图失败：${file.name}`));
    reader.readAsDataURL(file);
  });
}
