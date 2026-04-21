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
- 使用本地服务端代理，避免在浏览器暴露 API Key
