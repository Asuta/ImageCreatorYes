# Background Removal Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a “cut out as PNG” action for generated images using a configurable local BrainDeadBackgroundRemover-compatible command.

**Architecture:** The browser sends a generated image URL to `/api/cutout`. The Node server downloads the image to a temporary file, invokes a configured local command, moves the produced transparent PNG into `generated/cutouts`, and serves it back as a static URL.

**Tech Stack:** Node.js built-in HTTP server, vanilla HTML/CSS/JS, Node test runner, Windows local executable integration

---

### Task 1: Add cutout command adapter

**Files:**
- Create: `src/cutoutService.js`
- Test: `test/cutoutService.test.js`

- [ ] **Step 1: Write failing tests**

Test config validation, expected output path, and command argument construction.

- [ ] **Step 2: Run tests**

Run: `node --test test/cutoutService.test.js`
Expected: FAIL because `src/cutoutService.js` does not exist.

- [ ] **Step 3: Implement adapter**

Create functions to validate config, resolve expected output path as `<input_stem>_nobg.png`, invoke a local command, and move the output into the public generated directory.

- [ ] **Step 4: Verify**

Run: `node --test test/cutoutService.test.js`
Expected: PASS.

### Task 2: Add server route and static output

**Files:**
- Modify: `server.js`
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Add route tests through service unit coverage**

Use service tests for failure branches and manually validate route starts.

- [ ] **Step 2: Implement route**

Add `POST /api/cutout`, serve `/generated/cutouts/*`, and return JSON with `imageUrl`.

- [ ] **Step 3: Verify**

Run: `node --test`
Expected: PASS.

### Task 3: Add result-card cutout UI

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Add generated image button**

Each generated image card gets a `抠成 PNG` button.

- [ ] **Step 2: Add click handler**

Click posts `{ imageUrl }` to `/api/cutout`, updates card status, then appends an output preview/download link.

- [ ] **Step 3: Verify**

Run script load tests and a browser smoke test.

### Task 4: Final verification and commit

**Files:**
- All modified files

- [ ] **Step 1: Run tests**

Run: `node --test`
Expected: PASS.

- [ ] **Step 2: Commit**

Commit implementation with message `Add local background removal integration`.
