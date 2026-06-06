# 信號與系統考前刷題網站

> 考前高效複習 Fourier Transform、LTI Systems、DTFT 等重要考題，支援 LaTeX 公式渲染、隨機出題、作答紀錄追蹤。

## ✨ 功能

- **🎲 隨機刷題** — 從題庫中隨機抽題練習
- **🔁 答錯重練** — 只刷曾答錯過的題目
- **📖 依章節刷題** — 選擇特定章節練習
- **🏷️ 依題型刷題** — 選擇特定題型練習
- **📐 LaTeX 公式** — 使用 KaTeX 即時渲染數學公式
- **📋 作答紀錄** — 自動記錄每次作答，支援篩選
- **📊 統計分析** — 即時顯示正確率、答對/答錯數
- **📱 響應式設計** — 手機、平板、電腦皆可正常使用

## 🚀 快速啟動

### 方法一：使用 Python HTTP Server（推薦）

```bash
cd /Users/lly/Desktop/signal
python3 -m http.server 8080
```

然後開啟瀏覽器前往 http://localhost:8080

### 方法二：使用 Node.js

```bash
npx -y serve .
```

### 方法三：使用 VS Code Live Server

安裝 VS Code 的 Live Server 擴充套件，右鍵點擊 `index.html` → Open with Live Server。

## 📁 檔案結構

```
signal/
├── index.html                                           # 主頁面
├── style.css                                            # 樣式設計
├── app.js                                               # 應用邏輯
├── exam_practice_questions_with_solutions_pretty.json   # 題庫資料
└── README.md                                            # 本文件
```

## 📝 題庫格式

題庫為 JSON 格式，每一題包含以下欄位：

| 欄位 | 說明 |
|------|------|
| `id` | 題目編號 |
| `title` | 題目標題 |
| `prompt` | 題目原文 |
| `chapter` | 章節 |
| `sections` | 相關小節 |
| `type` | 題型 |
| `difficulty` | 難度 (easy / medium / hard) |
| `latex` | LaTeX 公式 |
| `final_answer` | 最終答案 |
| `solution_steps` | 解題步驟 |
| `key_formulas` | 使用公式 |
| `tags` | 標籤 |

## 🔧 自訂題庫

如果要替換題庫，只要將新的 JSON 檔案命名為 `exam_practice_questions_with_solutions_pretty.json`，或修改 `app.js` 中的 `fetch` 路徑即可。系統會自動適配不同的欄位名稱。

## 技術

- **HTML / CSS / JavaScript** — 純前端，無需建置工具
- **KaTeX** — 數學公式渲染（CDN 載入）
- **localStorage** — 本地儲存作答紀錄
