# Image MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-version MCP server that generates exactly one image, optionally removes the background, and returns the final image payload for downstream clients.

**Architecture:** Extract the current one-shot image generation flow into a shared service that both the web server and the MCP server can call. Add a small MCP-facing normalization layer to translate user-friendly inputs like aspect ratio, resolution, and reference-image URLs into the existing Qwen request shape, then expose a single `generate_image` MCP tool over stdio.

**Tech Stack:** Node.js, CommonJS app code, one ESM MCP entrypoint, official Model Context Protocol TypeScript SDK, existing local DirectML cutout pipeline.

---

### Task 1: Shared Single-Image Generation Service

**Files:**
- Create: `src/generationService.js`
- Modify: `server.js`
- Test: `test/generationService.test.js`

- [ ] Write the failing test for single-image generation success
- [ ] Run `node --test test/generationService.test.js` and confirm it fails because the module does not exist
- [ ] Implement a shared service that calls the upstream image API and returns the first generated image URL plus the raw response
- [ ] Update `server.js` to use the shared service for `/api/generate`
- [ ] Re-run `node --test test/generationService.test.js`

### Task 2: MCP Option Normalization

**Files:**
- Create: `src/mcpImageOptions.js`
- Test: `test/mcpImageOptions.test.js`

- [ ] Write failing tests for aspect-ratio/resolution mapping, reference-image URL normalization, and cutout defaults
- [ ] Run `node --test test/mcpImageOptions.test.js` and confirm it fails because the module does not exist
- [ ] Implement normalization helpers that:
- [ ] map `aspectRatio + resolution` to supported `size`
- [ ] accept up to three reference images from either `data:` URLs or `http(s)` URLs
- [ ] normalize the optional cutout model and default it only when cutout is enabled
- [ ] Re-run `node --test test/mcpImageOptions.test.js`

### Task 3: MCP Tool Execution Flow

**Files:**
- Create: `src/mcpImageTool.js`
- Modify: `src/generationService.js`
- Modify: `src/cutoutService.js`
- Test: `test/mcpImageTool.test.js`

- [ ] Write a failing test for the end-to-end tool flow: normalize input, generate one image, optionally run cutout, and return a final image payload descriptor
- [ ] Run `node --test test/mcpImageTool.test.js` and confirm it fails
- [ ] Implement the orchestration helper that downloads the final image bytes and produces MCP-ready metadata
- [ ] Re-run `node --test test/mcpImageTool.test.js`

### Task 4: stdio MCP Server Entry

**Files:**
- Create: `mcp/server.mjs`
- Modify: `package.json`
- Test: `test/mcpServer.test.js`

- [ ] Write a failing test for server metadata or exported tool registration helpers
- [ ] Add the official MCP SDK dependency and a `mcp:start` script
- [ ] Implement a stdio server exposing one `generate_image` tool
- [ ] Re-run the targeted MCP server test

### Task 5: Verification

**Files:**
- Verify: `test/*.js`
- Verify: local MCP invocation against `mcp/server.mjs`

- [ ] Run `npm test`
- [ ] Start the MCP server locally and issue one call without cutout
- [ ] Issue one call with cutout enabled
- [ ] Confirm the returned payload includes exactly one image and a short text summary
