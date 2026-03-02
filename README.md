# 員工打卡系統

具備 WiFi IP 驗證的員工打卡系統，防止員工偽造打卡。

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | HTML / CSS / JavaScript（原生） |
| 後端 API | Python（Vercel Serverless Functions） |
| 資料庫 | Firebase Firestore |
| 認證 | Firebase Authentication |
| 部署 | Vercel |
| 安全機制 | WiFi IP 白名單驗證 |

## 專案結構

```
employee-clock-system/
├── api/                          # Python 後端 API（Vercel Serverless）
│   ├── _lib/                     # 共用模組（不作為 API 端點）
│   │   ├── __init__.py
│   │   ├── firebase_client.py    # Firebase Admin SDK 初始化
│   │   ├── ip_guard.py           # WiFi IP 白名單驗證
│   │   ├── auth.py               # 認證與權限驗證
│   │   └── response.py           # HTTP 回應輔助
│   ├── clock_in.py               # POST /api/clock_in   打卡上班
│   ├── clock_out.py              # POST /api/clock_out  打卡下班
│   ├── get_records.py            # GET  /api/get_records 查詢紀錄
│   └── admin/
│       ├── employees.py          # GET/POST/DELETE /api/admin/employees
│       └── settings.py           # GET/POST /api/admin/settings
├── public/                       # 前端靜態檔案
│   ├── index.html                # 登入頁
│   ├── dashboard.html            # 員工儀表板
│   ├── admin.html                # 管理後台
│   ├── css/
│   │   └── style.css             # 全域樣式
│   └── js/
│       ├── config.js             # Firebase 設定
│       ├── auth.js               # 認證模組
│       ├── clock.js              # 打卡模組
│       ├── records.js            # 紀錄模組
│       ├── admin.js              # 管理模組
│       └── utils.js              # 通用工具
├── vercel.json                   # Vercel 部署設定
├── requirements.txt              # Python 依賴
├── package.json
├── .env.example                  # 環境變數範本
└── README.md
```

## 設定步驟

### 1. Firebase 專案設定

1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立新專案
2. 啟用 **Authentication** > **Email/Password** 登入方式
3. 建立 **Firestore Database**
4. 前往「專案設定」>「服務帳戶」，產生新的 JSON 私密金鑰

### 2. Firestore 初始資料

在 Firestore 中手動建立以下資料：

**建立管理員帳號：**

先在 Firebase Console > Authentication 手動新增一位使用者，取得其 UID，然後在 Firestore 建立：

```
集合：employees
文件 ID：{管理員的 UID}
欄位：
  - name: "管理員"
  - email: "admin@company.com"
  - department: "IT"
  - role: "admin"
  - created_at: "2024-01-01T00:00:00+08:00"
```

**設定 IP 白名單：**

```
集合：settings
文件 ID：ip_whitelist
欄位：
  - allowed_ips: ["你的公司 WiFi 公共 IP"]
  - updated_at: "2024-01-01T00:00:00+08:00"
```

> 查詢公司 WiFi 的公共 IP：在公司網路下訪問 https://api.ipify.org

### 3. 前端 Firebase 設定

編輯 `public/js/config.js`，填入你的 Firebase 專案設定值（可在 Firebase Console > 專案設定 > 一般 > 你的應用程式中找到）。

### 4. Vercel 部署

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 部署
vercel
```

在 Vercel 專案設定中加入環境變數：

| 變數名稱 | 值 |
|----------|-----|
| `FIREBASE_SERVICE_ACCOUNT` | 完整的 Firebase 服務帳戶 JSON 字串 |

## API 端點

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/clock_in` | 打卡上班 | 員工 |
| POST | `/api/clock_out` | 打卡下班 | 員工 |
| GET | `/api/get_records` | 查詢打卡紀錄 | 員工（自己）/ 管理員（所有人） |
| GET | `/api/admin/employees` | 取得員工列表 | 管理員 |
| POST | `/api/admin/employees` | 新增員工 | 管理員 |
| DELETE | `/api/admin/employees?uid=xxx` | 刪除員工 | 管理員 |
| GET | `/api/admin/settings` | 取得 IP 白名單 | 管理員 |
| POST | `/api/admin/settings` | 更新 IP 白名單 | 管理員 |

### 查詢紀錄參數

| 參數 | 說明 |
|------|------|
| `start` | 開始日期 (YYYY-MM-DD) |
| `end` | 結束日期 (YYYY-MM-DD) |
| `employee_id` | 員工 UID（僅管理員可用） |

## 安全機制

### WiFi IP 驗證流程

1. 員工點擊「打卡」按鈕
2. 伺服器從 `x-forwarded-for` / `x-real-ip` 標頭取得客戶端公共 IP
3. 與 Firestore `settings/ip_whitelist` 中的允許清單比對
4. 僅當 IP 匹配時才允許打卡

### 認證流程

1. 前端使用 Firebase Auth 進行帳號密碼登入
2. 取得 ID Token 後附加在 API 請求的 `Authorization: Bearer <token>` 標頭
3. 後端使用 Firebase Admin SDK 驗證 Token 有效性
4. 管理員操作額外檢查 Firestore 中的 `role` 欄位

## Firestore 資料結構

```
employees/{uid}
  ├── name: string
  ├── email: string
  ├── department: string
  ├── role: "admin" | "employee"
  └── created_at: string (ISO 8601)

attendance/{auto_id}
  ├── employee_id: string (uid)
  ├── date: string (YYYY-MM-DD)
  ├── clock_in: string (ISO 8601)
  ├── clock_out: string (ISO 8601) | null
  ├── ip: string
  └── created_at: string (ISO 8601)

settings/ip_whitelist
  ├── allowed_ips: string[]
  └── updated_at: string (ISO 8601)
```
