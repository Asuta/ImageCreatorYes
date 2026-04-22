# Qwen 生图网页

一个最小可运行的网页项目，用于调用 `https://token.fun.tv/v1/images/generations` 生成图片。

## 使用方式

1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 中填写 `IMAGE_API_KEY`
3. 运行 `npm start`
4. 打开 `http://127.0.0.1:3000`

## 特性

- 支持 `qwen-image-2.0`
- 支持 `qwen-image-2.0-pro`
- 支持提示词、反向提示词、尺寸、张数
- 支持本地参考图上传（最多 3 张）
- 支持参考图缩略图预览、拖拽上传与排序调整
- 支持对生成结果调用本地抠图工具并输出透明 PNG
- 使用本地服务端代理，避免在浏览器暴露 API Key

## 本地抠图配置

1. 下载并准备本地抠图工具，或使用项目内的 `tools/braindead-cutout.cmd`
2. 在 `.env` 中设置 `BRAINDEAD_BG_REMOVER_PATH`
3. 可选设置 `BRAINDEAD_BG_MODEL`，默认 `birefnet-general-lite`
4. 生成图片后点击结果卡片里的“抠成 PNG”

注意：当前集成通过本地命令调用，并期望工具接收输入图片路径后在同目录生成 `_nobg.png`。项目现在已经内置了 `tools/braindead-cutout.cmd + tools/braindead_cutout.py` 包装器，使用与 BrainDead 自动模式一致的 `rembg + BiRefNet` 本地处理链路。
