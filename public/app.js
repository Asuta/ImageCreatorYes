const form = document.getElementById('image-form');
const submitButton = document.getElementById('submit-button');
const statusText = document.getElementById('status-text');
const results = document.getElementById('results');
const imageCardTemplate = document.getElementById('image-card-template');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    model: formData.get('model'),
    prompt: formData.get('prompt'),
    negativePrompt: formData.get('negativePrompt'),
    size: formData.get('size'),
    count: formData.get('count'),
    promptExtend: formData.get('promptExtend') === 'on',
    watermark: formData.get('watermark') === 'on',
  };

  setLoading(true);
  setStatus('正在生成图片，请稍候…');
  results.replaceChildren();

  try {
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
