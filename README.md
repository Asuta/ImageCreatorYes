# Qwen 生图网页

一个最小可运行的网页项目，同时也提供一个 MCP Server，用于调用 `https://token.fun.tv/v1/images/generations` 生成图片。

## 使用方式

1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 中填写 `IMAGE_API_KEY`
3. 运行 `npm start`
4. 打开 `http://127.0.0.1:3000`

## MCP 使用方式

1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 中填写 `IMAGE_API_KEY`
3. 运行 `npm install`
4. 启动 MCP Server：`npm run mcp:start`

当前 MCP Server 暴露 1 个工具：`generate_image`

支持参数：

- `prompt`
- `referenceImages`：最多 3 张，支持 `data:` 或 `http(s)` 图片地址
- `cutout`
- `cutoutModel`
- `size`
- `aspectRatio`
- `resolution`
- `model`
- `negativePrompt`
- `promptExtend`
- `watermark`

返回结果：

- 固定返回 1 张图片
- `cutout = true` 时返回透明背景 PNG
- 工具结果里同时包含 `image` 内容和一段文本摘要

## 特性

- 支持 `qwen-image-2.0`
- 支持 `qwen-image-2.0-pro`
- 支持提示词、反向提示词、尺寸、张数
- 支持本地参考图上传（最多 3 张）
- 支持参考图缩略图预览、拖拽上传与排序调整
- 支持对生成结果调用本地抠图工具并输出透明 PNG
- 支持在页面里切换已验证可用的 DirectML 抠图模型
- 使用本地服务端代理，避免在浏览器暴露 API Key

## 本地抠图配置

1. 推荐直接使用项目内的 `tools/braindead-cutout-dml.cmd`
2. 在 `.env` 中设置 `BRAINDEAD_BG_REMOVER_PATH`
3. 可选设置 `BRAINDEAD_BG_MODEL`，当前推荐 `isnet-general-use`
4. 可选设置 `BRAINDEAD_BG_DEVICE`
5. 生成图片后点击结果卡片里的“抠成 PNG”

当前页面会展示这台机器上已验证可用的 DirectML 模型：

- `u2net_human_seg`
- `u2net`
- `u2netp`
- `isnet-general-use`
- `silueta`
- `u2net_cloth_seg`
- `birefnet-general-lite`

`BRAINDEAD_BG_DEVICE` 支持：

- `auto`：优先 CUDA / DirectML，不可用则退回 CPU
- `gpu`：强制使用 CUDA，不可用时报错
- `dml`：强制使用 DirectML，不可用时报错
- `cpu`：强制使用 CPU

注意：

- 当前集成通过本地命令调用，并期望工具接收输入图片路径后在同目录生成 `_nobg.png`
- 项目内置了 `tools/braindead-cutout.cmd` 与 `tools/braindead-cutout-dml.cmd` 两套包装器，统一调用 `tools/braindead_cutout.py`
- 在这台 Windows 机器上，CUDA 路径已经验证过存在兼容性问题；当前更稳的方案是 `DirectML + isnet-general-use`
- `tools/.venv-dml` 首次配置完成后会保留在本地，后续重启项目不会重复下载模型和依赖，除非你手动删除对应缓存或虚拟环境
