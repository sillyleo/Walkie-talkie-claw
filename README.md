# 🎙️ Walkie-Talkie — OpenClaw 語音對講機

一個 PTT（Push-to-Talk）語音對講機網頁應用，連接 [OpenClaw](https://github.com/openclaw/openclaw) AI Agent。按住按鈕說話，AI 用語音回答你。

## 架構總覽

```
┌─────────────────────────────────────────────────┐
│  瀏覽器 (PWA)                                    │
│  Next.js + shadcn/ui + Tailwind CSS             │
│  按住 → 錄音 → 放開                              │
└──────┬──────────┬──────────────┬────────────────┘
       │          │              │
       ▼          ▼              ▼
  /api/transcribe  /api/chat    /api/tts
  (Whisper STT)   (OpenClaw)   (OpenAI / Gemini TTS)
       │          │              │
       ▼          ▼              ▼
   OpenAI API   OpenClaw       OpenAI API
                Gateway        or Gemini API
                   │
                   ▼
              AI Agent (Claude / GPT / Gemini...)
```

**流程：**
1. 用戶按住按鈕 → 瀏覽器錄音（WebM/Opus）
2. 放開 → 音檔送到 `/api/transcribe` → OpenAI Whisper 語音轉文字
3. 文字送到 `/api/chat` → 透過 OpenClaw Gateway 打 AI Agent
4. Agent 回覆文字 → 前端顯示氣泡
5. 文字送到 `/api/tts` → OpenAI 或 Gemini 語音合成 → 瀏覽器播放

## 快速開始

### 前置需求

- [Node.js](https://nodejs.org/) 18+
- [Vercel CLI](https://vercel.com/docs/cli) 或 Vercel 帳號
- [OpenClaw](https://github.com/openclaw/openclaw) 已安裝並運行
- OpenAI API Key（用於 Whisper STT + TTS）
- （可選）Google Gemini API Key（用於 Gemini TTS）

### 步驟 1：Clone 並安裝

```bash
git clone https://github.com/YOUR_USERNAME/Walkie-talkie-claw.git
cd Walkie-talkie-claw
npm install
```

### 步驟 2：設定環境變數

在 Vercel Dashboard 或 `.env.local` 設定以下環境變數：

| 變數名 | 必填 | 說明 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API Key，用於 Whisper STT 和 TTS |
| `OPENCLAW_GATEWAY_URL` | ✅ | OpenClaw Gateway 的公開 URL（如 Cloudflare Tunnel URL） |
| `OPENCLAW_GATEWAY_TOKEN` | ✅ | OpenClaw Gateway 的認證 Token |
| `JWT_SECRET` | ✅ | 用於簽署前端 session token 的密鑰（任意字串） |
| `PASSPHRASE_HASH` | ⚠️ | 通關密語的 SHA-256 hash（首次使用時會自動生成，見下方說明） |
| `GEMINI_API_KEY` | ❌ | Google Gemini API Key（如果要用 Gemini TTS） |

### 步驟 3：設定 OpenClaw Agent

你需要一個獨立的 OpenClaw Agent 來處理對講機訊息。

```bash
# 建立 walkie agent
openclaw agents add walkie

# 設定 agent 的 API key（讓 agent 能用 AI model）
# 這會在互動式介面中引導你設定
```

Agent 的 workspace 目錄結構：

```
~/.openclaw/workspace-walkie/
├── SOUL.md        # Agent 的人格設定（口語化、簡潔）
├── AGENTS.md      # Agent 行為指引
├── TOOLS.md       # 工具使用筆記
└── walkie-deploy/ # 這個 repo（前端程式碼）
```

**SOUL.md 範例：**

```markdown
# SOUL.md — 對講機 Agent

你是一個語音對講機助手。你的訊息來自用戶透過網頁對講機介面說的話（語音轉文字）。

## 行為準則
- **簡潔口語回答**，像對講機對話一樣，1-3 句為主
- 用**繁體中文**回答（或配合用戶語言）
- 當用戶進入「指令模式」時，盡力協助執行請求的任務

## 風格
- 輕鬆、友善、像朋友聊天
- 不要太正式，不要用敬語
```

### 步驟 4：設定 OpenClaw Gateway

確保 OpenClaw Gateway 有對外的 URL。推薦用 Cloudflare Tunnel：

```bash
# 安裝 cloudflared
# 建立 tunnel 指向 OpenClaw Gateway port（預設 3578）
cloudflared tunnel --url http://localhost:3578
```

把 tunnel URL 設為 Vercel 的 `OPENCLAW_GATEWAY_URL` 環境變數。

Gateway Token 可以在 OpenClaw 設定中找到：

```bash
openclaw gateway config
# 找到 auth.token 欄位
```

### 步驟 5：部署到 Vercel

```bash
# 方法 A：透過 Vercel CLI
vercel deploy --prod

# 方法 B：連接 GitHub repo
# 1. 在 Vercel Dashboard import GitHub repo
# 2. 設定環境變數
# 3. 自動部署
```

**Vercel 專案設定：**
- Framework Preset: **Next.js**
- Build Command: `npm run build`
- Output Directory: `.next`
- Node.js Version: 18+

### 步驟 6：設定通關密語

首次訪問網頁時會要求設定通關密語：

1. 打開部署好的 URL
2. 輸入你想要的密語並按「設定密語」
3. 頁面會回傳一個 hash 值
4. **重要：** 把這個 hash 設為 Vercel 環境變數 `PASSPHRASE_HASH`
5. 重新部署

之後每次使用都要輸入密語解鎖（session 有效 4 小時）。

## 專案結構

```
walkie-deploy/
├── app/
│   ├── layout.tsx                 # Root layout + PWA metadata
│   ├── page.tsx                   # 主頁面（載入 WalkieTalkie 組件）
│   ├── globals.css                # Tailwind + shadcn 主題（Braun 暗色風格）
│   ├── manifest.webmanifest/      # PWA manifest route
│   └── api/
│       ├── chat/route.ts          # 對話 API → OpenClaw Gateway
│       ├── transcribe/route.ts    # 語音辨識 API → OpenAI Whisper
│       ├── tts/route.ts           # 語音合成 API → OpenAI / Gemini
│       ├── status/route.ts        # 密語狀態檢查
│       ├── setup-passphrase/route.ts  # 首次設定密語
│       └── unlock/route.ts        # 密語解鎖
├── components/
│   ├── WalkieTalkie.tsx           # 主要對講機 UI 組件
│   └── ui/                        # shadcn/ui 組件
│       ├── button.tsx
│       ├── input.tsx
│       └── select.tsx
├── lib/
│   ├── auth.ts                    # JWT token + 密語 hash 工具
│   └── utils.ts                   # cn() helper (tailwind-merge)
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

## API Routes 說明

### `POST /api/transcribe`
- **輸入：** Raw audio body（WebM/Opus）
- **輸出：** `{ text: "辨識結果" }`
- **後端：** OpenAI Whisper API (`whisper-1`)
- **語言：** 預設中文（`zh`）

### `POST /api/chat`
- **輸入：** `{ text: "用戶訊息", token: "JWT token" }`
- **輸出：** `{ reply: "AI 回覆" }`
- **後端：** OpenClaw Gateway `/v1/chat/completions`
- **認證：** JWT token 驗證
- **Header：** `x-openclaw-agent-id: walkie`（指定使用哪個 agent）

### `POST /api/tts`
- **輸入：** `{ text: "要朗讀的文字", model: "openai/tts-1", voice: "shimmer" }`
- **輸出：** Audio binary（MP3 或其他格式）
- **支援的 model：**
  - `openai/tts-1` — OpenAI TTS（較快）
  - `openai/tts-1-hd` — OpenAI TTS HD（較高品質）
  - `gemini/gemini-2.5-flash` — Google Gemini TTS

### `GET /api/status`
- **輸出：** `{ hasPassphrase: true/false }`

### `POST /api/unlock`
- **輸入：** `{ passphrase: "密語" }`
- **輸出：** `{ ok: true, token: "JWT" }` 或 `{ error: "密語錯誤" }`

### `POST /api/setup-passphrase`
- **輸入：** `{ passphrase: "新密語" }`
- **輸出：** `{ ok: true, token: "JWT", hash: "sha256-hash" }`

## 認證機制

1. **通關密語：** 使用 SHA-256 hash + salt 驗證
2. **Session Token：** JWT-like token（HMAC-SHA256 簽署），4 小時有效
3. **Salt：** `openclaw-walkie-salt`（寫死在 `lib/auth.ts`）

Token 格式：`base64(payload).hmac_signature`

## 設計風格

採用 **Braun / Dieter Rams** 極簡設計：
- 暗色主題（近黑背景 `#111`，近白文字 `#eee`）
- 大量留白，功能導向
- 大圓形 PTT 按鈕，中心狀態指示燈
- 錄音紅、處理黃、連線綠 三色狀態
- shadcn/ui 組件系統
- 支援 PWA 安裝

## 前端功能

- **PTT 按住說話：** 支援滑鼠和觸控（mousedown/touchstart）
- **語音設定：** 可選 TTS model 和聲音
- **TTS 開關：** 可關閉語音播放，只看文字
- **播放按鈕：** 每則 AI 回覆旁有 ▶ 可重播語音
- **自動捲動：** 新訊息自動捲到底
- **PWA 支援：** 可安裝到手機桌面

## 自動部署（CI/CD）

如果用 deploy key push（不會觸發 Vercel webhook），需要手動觸發：

```bash
# 設定 Vercel Deploy Hook（在 Vercel Dashboard → Settings → Git → Deploy Hooks）
curl -X POST "https://api.vercel.com/v1/integrations/deploy/YOUR_PROJECT/YOUR_HOOK"
```

完整部署流程：

```bash
git add -A
git commit -m "your changes"
git push
# 如果用 deploy key，手動觸發：
curl -X POST "YOUR_DEPLOY_HOOK_URL"
```

## OpenClaw Agent 配置細節

### Agent 與主系統的關係

```
OpenClaw Gateway
├── main agent        # 主 agent（其他用途）
├── walkie agent      # 對講機專用 agent ← 這個
└── other agents...
```

- 每個 agent 有獨立的 workspace、SOUL.md、工具權限
- 對講機前端透過 `x-openclaw-agent-id: walkie` header 指定 agent
- Agent 可以有自己的 API keys（在 `~/.openclaw/agents/walkie/agent/auth-profiles.json`）

### Agent Auth 設定

```bash
# 加入 Gemini key（讓 agent 本身也能用 Gemini）
openclaw agents add walkie --gemini-api-key YOUR_KEY

# 或手動編輯
# ~/.openclaw/agents/walkie/agent/auth-profiles.json
```

### Gateway 設定要點

確保 Gateway config 中：
- 有 `walkie` agent 的定義
- Gateway auth token 已設定
- 對外 URL 可存取（Cloudflare Tunnel / Nginx / 直接暴露）

## 常見問題

### Q: 密語設定後重新部署就失效了？
A: 因為 `process.env.PASSPHRASE_HASH` 在 serverless 環境中不會持久化。你必須把首次設定時回傳的 hash 值手動加到 Vercel 環境變數 `PASSPHRASE_HASH`，然後重新部署。

### Q: 語音辨識不準確？
A: 預設使用 OpenAI Whisper `whisper-1`，語言設為中文（`zh`）。如果需要其他語言，修改 `/api/transcribe/route.ts` 中的 `language` 參數。

### Q: Gemini TTS 沒有聲音選項？
A: Gemini TTS 使用內建聲音（預設 `Kore`）。如需更換，修改 `/api/tts/route.ts` 中的 `voiceName`。可用聲音請參考 [Gemini API 文件](https://ai.google.dev/gemini-api/docs/text-to-speech)。

### Q: 手機上按鈕沒反應？
A: 確保瀏覽器已授予麥克風權限。iOS Safari 需要 HTTPS 才能使用 `getUserMedia`。

### Q: Gateway 連不上？
A: 檢查：
1. `OPENCLAW_GATEWAY_URL` 是否正確（含 protocol，如 `https://your-tunnel.trycloudflare.com`）
2. `OPENCLAW_GATEWAY_TOKEN` 是否正確
3. OpenClaw Gateway 是否在運行
4. Cloudflare Tunnel 是否在運行

## 技術棧

- **前端：** Next.js 16 + React 19 + TypeScript
- **UI 組件：** shadcn/ui + Radix UI
- **樣式：** Tailwind CSS 3
- **語音辨識：** OpenAI Whisper API
- **語音合成：** OpenAI TTS / Google Gemini TTS
- **AI 後端：** OpenClaw Gateway（支援 Claude, GPT, Gemini 等）
- **部署：** Vercel
- **認證：** 自製 JWT + SHA-256 passphrase hash

## License

MIT
