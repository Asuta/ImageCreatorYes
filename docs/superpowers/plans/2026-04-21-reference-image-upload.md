# Reference Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local reference-image upload to the existing Qwen image generation web app so users can send up to three local images together with the text prompt.

**Architecture:** Keep the current browser + local Node proxy architecture. The browser reads selected image files as Data URLs and submits them in JSON; the server validates and forwards them in Alibaba Bailian-compatible `content` arrays with one trailing text item.

**Tech Stack:** Node.js built-in HTTP server, vanilla HTML/CSS/JS, Node test runner

---

### Task 1: Extend payload builder tests

**Files:**
- Modify: `test/imageApi.test.js`
- Test: `test/imageApi.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('adds reference images before prompt text in content array', () => {
  const payload = buildGenerationPayload({
    model: 'qwen-image-2.0-pro',
    prompt: '做成玻璃花房风格',
    referenceImages: ['data:image/png;base64,aaa', 'data:image/jpeg;base64,bbb'],
  });

  assert.deepEqual(payload.input.messages[0].content, [
    { image: 'data:image/png;base64,aaa' },
    { image: 'data:image/jpeg;base64,bbb' },
    { text: '做成玻璃花房风格' },
  ]);
});

test('rejects more than three reference images', () => {
  assert.throws(
    () =>
      buildGenerationPayload({
        model: 'qwen-image-2.0',
        prompt: 'test',
        referenceImages: ['1', '2', '3', '4'],
      }),
    /at most 3 reference images/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/imageApi.test.js`
Expected: FAIL because `referenceImages` is ignored and over-limit input is not rejected.

- [ ] **Step 3: Write minimal implementation**

```js
function normalizeReferenceImages(referenceImages) {
  if (!Array.isArray(referenceImages) || !referenceImages.length) {
    return [];
  }

  if (referenceImages.length > 3) {
    throw new Error('You can upload at most 3 reference images');
  }

  return referenceImages.map((image) => ({ image }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/imageApi.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/imageApi.test.js src/imageApi.js
git commit -m "Add reference image payload support"
```

### Task 2: Add browser file upload flow

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Write the failing test**

No automated browser harness exists in this repo. Create a narrow server-side test instead and use manual verification for the DOM interaction.

- [ ] **Step 2: Run test to verify it fails**

Skip for DOM-only changes; covered by Task 3 server validation plus manual verification.

- [ ] **Step 3: Write minimal implementation**

```html
<label class="full">
  参考图（最多 3 张）
  <input name="referenceImages" id="reference-images" type="file" accept="image/*" multiple />
</label>
<div id="reference-summary" class="hint">未选择参考图</div>
```

```js
const referenceInput = document.getElementById('reference-images');
const referenceSummary = document.getElementById('reference-summary');

referenceInput.addEventListener('change', () => {
  const files = Array.from(referenceInput.files || []);
  referenceSummary.textContent = files.length
    ? `已选择 ${files.length} 张：${files.map((file) => file.name).join('、')}`
    : '未选择参考图';
});
```

- [ ] **Step 4: Run manual verification**

Run: `npm start`
Expected: Page shows file picker, selected files are summarized, more than three files is blocked before request submission.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/app.js public/styles.css
git commit -m "Add reference image upload UI"
```

### Task 3: Validate request and forward images

**Files:**
- Modify: `server.js`
- Test: `test/imageApi.test.js`

- [ ] **Step 1: Write the failing test**

Add a validation test:

```js
test('rejects empty reference image entries', () => {
  assert.throws(
    () =>
      buildGenerationPayload({
        model: 'qwen-image-2.0',
        prompt: 'test',
        referenceImages: [''],
      }),
    /Invalid reference image/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/imageApi.test.js`
Expected: FAIL because empty entries are currently accepted.

- [ ] **Step 3: Write minimal implementation**

```js
return referenceImages.map((image) => {
  const value = String(image || '').trim();
  if (!value.startsWith('data:image/')) {
    throw new Error('Invalid reference image');
  }
  return { image: value };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/imageApi.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/imageApi.js test/imageApi.test.js server.js
git commit -m "Validate reference image inputs"
```

### Task 4: Update docs and final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update usage docs**

```md
- 支持本地参考图上传（最多 3 张）
```

- [ ] **Step 2: Run verification**

Run: `node --test`
Expected: PASS

Run: `npm start`
Expected: Local server starts and serves `http://127.0.0.1:3000`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document reference image upload"
```
