# RMIT Hack 26 — Next.js & TideCloak Security Stack

Ứng dụng Next.js tích hợp nền tảng xác thực phi tập trung và quản trị bảo mật **TideCloak** (công nghệ Never-Whole-Key, DPoP, IGA và E2EE của Tide Foundation).

Dự án đã tích hợp sẵn **Raziel MCP Server** (`@tideorg/mcp`) để AI coding assistant (Google Antigravity, Cursor, Claude Code, Windsurf, Zed, v.v.) tự động hỗ trợ audit bảo mật, phân tích rủi ro và tích hợp auth.

---

## 📋 Mục lục
1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt môi trường & Docker](#2-cài-đặt-môi-trường--docker)
3. [Khởi động TideCloak Server](#3-khởi-động-tidecloak-server)
4. [Cấu hình & Khởi chạy ứng dụng Next.js](#4-cấu-hình--khởi-chạy-ứng-dụng-nextjs)
5. [Hướng dẫn sử dụng MCP (Tide Raziel)](#5-hướng-dẫn-sử-dụng-mcp-tide-raziel)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [Xử lý sự cố thường gặp (Troubleshooting)](#7-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Yêu cầu hệ thống
- **Hệ điều hành**: WSL2 (Ubuntu 22.04 / 24.04 / 26.04) trên Windows, hoặc Linux / macOS.
- **Node.js**: Phiên bản LTS (`v18.x`, `v20.x` hoặc `v22.x`) khuyên dùng cài qua **NVM**.
- **Docker**: Docker Engine + CLI đã được cài đặt và đang chạy.
- **Công cụ bổ trợ**: `curl`, `jq`, `sed`, `git`.

---

## 2. Cài đặt môi trường & Docker

### 2.1. Cài đặt Node.js qua NVM (Khuyên dùng)
```bash
# Cài đặt NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Cài đặt và kích hoạt Node.js LTS
nvm install --lts
nvm use --lts
node -v
npm -v
```

### 2.2. Cài đặt Docker trên Ubuntu / WSL
> ⚠️ **Lưu ý**: Chú ý dùng đúng repository cho **Ubuntu** (`https://download.docker.com/linux/ubuntu`), tránh nhầm với `linux/debian`.

```bash
# 1. Cài đặt công cụ cần thiết
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg jq

# 2. Thêm GPG key của Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 3. Thêm repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Cài đặt Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Phân quyền và khởi động dịch vụ Docker
sudo usermod -aG docker $USER
sudo service docker start

# 6. Kiểm tra
docker run --rm hello-world
```

---

## 3. Khởi động TideCloak Server

TideCloak chạy dưới dạng container Docker độc lập với database lưu trữ cục bộ.

Chạy các lệnh sau từ thư mục gốc của repo (ngang hàng với `my-app`):

```bash
# 1. Tạo thư mục lưu database H2 và phân quyền (UID 1000 cho container keycloak)
mkdir -p ./data
sudo chown -R 1000:1000 ./data

# 2. Kéo image TideCloak Development
sudo docker pull tideorg/tidecloak-dev:latest

# 3. Khởi chạy container
sudo docker run -d --name tidecloak \
  -v "$(pwd)/data:/opt/keycloak/data/h2" \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=password \
  tideorg/tidecloak-dev:latest
```

> **Ghi chú**:
> - TideCloak mất khoảng 30–60 giây để khởi động xong.
> - Kiểm tra log khởi động: `sudo docker logs -f tidecloak`.
> - Kiểm tra trạng thái: Mở trình duyệt vào [http://localhost:8080](http://localhost:8080) (sẽ chuyển hướng vào giao diện quản trị Tide Console).

---

## 4. Cấu hình & Khởi chạy ứng dụng Next.js

Sau khi TideCloak đã sẵn sàng ở cổng `8080`:

```bash
# Di chuyển vào thư mục ứng dụng
cd my-app

# 1. Cài đặt dependencies
npm ci

# 2. Khởi tạo Realm & Client TideCloak tự động
npm run init
```

### Script `npm run init` thực hiện những gì?
1. Kết nối vào TideCloak tại `http://localhost:8080`.
2. Tạo Realm mới (mặc định: `nextjs-test`) và Client (mặc định: `myclient`).
3. Kích hoạt tính năng **Tide IGA (Identity Governance & Administration)** và cấu hình chính sách.
4. Tự động xuất file cấu hình adapter **`my-app/tidecloak.json`**. File này chứa các public key (`jwk`), endpoint của mạng ORK (`homeOrkUrl`) và chữ ký nguồn gốc `client-origin-auth` cho `http://localhost:3000`.

### 3. Khởi chạy ứng dụng ở môi trường Development
```bash
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để trải nghiệm:
- **Trang chủ & Đăng nhập**: Xác thực qua TideCloak với cơ chế PRISM (không lưu mật khẩu dạng hash).
- **Protected Routes**: Kiểm tra session và vai trò người dùng (`/protected`).
- **DPoP Authentication**: Trình diễn gắn token với trình duyệt thông qua khóa bất đối xứng (`/tide_dpop`).

---

## 5. Hướng dẫn sử dụng MCP (Tide Raziel)

Dự án đã được trang bị **Raziel: Tide's MCP Server** (`@tideorg/mcp`). MCP cho phép các AI Assistant (Antigravity IDE, Cursor, Claude Code, Windsurf, Zed, v.v.) có toàn bộ tài liệu kỹ thuật, doctrine, security invariant và các playbook chuẩn của TideCloak.

### 5.1. File cấu hình MCP
File `.mcp.json` đã có sẵn tại root của repo:
```json
{
  "mcpServers": {
    "tide-pack": {
      "command": "npx",
      "args": ["-y", "@tideorg/mcp"]
    }
  }
}
```

- **Antigravity IDE**: Đã cấu hình thêm trong `~/.gemini/config/mcp_config.json`.
- **Claude Code**: Chạy lệnh `claude mcp add tide-pack -- npx -y @tideorg/mcp`.
- **Cursor / Windsurf**: Đọc tự động từ `.mcp.json` hoặc thêm trong Settings > MCP Servers.

### 5.2. Các câu lệnh và Prompt hữu ích khi làm việc cùng AI

| Mục tiêu | Câu hỏi / Prompt mẫu cho AI | Hành động của AI via MCP |
| :--- | :--- | :--- |
| **Quét rủi ro hệ thống (Blast Radius)** | *"Quét dự án của tôi và phân tích Blast Radius để xem nếu rò rỉ token/khóa thì điều gì sẽ bị lộ?"* | Gọi `tide_blast_radius` & `tide_security_analysis` để rà soát toàn bộ route, session và database. |
| **Bảo vệ API Route với DPoP** | *"Hướng dẫn và viết code bảo vệ Next.js API route `/api/wallet` bằng JWT + DPoP verification"* | Tra cứu playbook `verify-jwt-server-side`, kiểm tra claim `cnf.jkt` và tạo middleware. |
| **Phân quyền vai trò (RBAC / IGA)** | *"Thiết lập role-based access cho nhóm 'admin' và 'user' qua TideCloak IGA"* | Cung cấp các bước gán role và phê duyệt change request thông qua IGA API. |
| **Mã hóa E2EE (Hermetic E2EE)** | *"Hướng dẫn cách mã hóa dữ liệu end-to-end giữa 2 người dùng bằng Forseti Relationship Attestation"* | Gọi canon `relationship-attestation` và sinh mã hóa E2EE sử dụng khóa phân tán ORK. |
| **Khắc phục sự cố Auth** | *"Gặp lỗi redirect loop sau khi đăng nhập qua TideCloak, hãy chuẩn đoán nguyên nhân"* | Gọi `tide_doctor` và kiểm tra redirect-handler canon để tìm sai sót cấu hình URL. |

---

## 6. Cấu trúc thư mục

```text
├── .mcp.json               # Cấu hình MCP Server (tide-pack)
├── data/                   # Thư mục lưu database H2 của Docker TideCloak (gitignored)
└── my-app/
    ├── app/                # Next.js App Router (auth, home, protected, tide_dpop, api)
    ├── init/
    │   ├── tcinit.sh       # Script tự động khởi tạo realm, client, IGA
    │   ├── realm.json      # Template cấu hình realm mẫu
    │   └── .env.example    # Cấu hình mẫu các URL & tài khoản admin
    ├── scripts/
    │   └── ensure-config.mjs # Script kiểm tra tidecloak.json trước khi build/dev
    ├── tidecloak.json      # File adapter do tcinit.sh xuất ra (gitignored)
    ├── package.json        # Dependencies Next.js 16, React 19, @tidecloak/nextjs
    └── README.md           # Hướng dẫn dự án này
```

---

## 7. Xử lý sự cố thường gặp (Troubleshooting)

### 1. `docker: read: connection timed out` khi pull image
- **Nguyên nhân**: Quá trình kéo image lớn từ Docker Hub bị đứt kết nối mạng giữa chừng.
- **Khắc phục**: Chạy lệnh pull độc lập để tải lại các layer còn thiếu:
  ```bash
  sudo docker pull tideorg/tidecloak-dev:latest
  ```

### 2. `tidecloak.json` chưa được khởi tạo hoặc bị rỗng `{}`
- **Nguyên nhân**: Bạn chạy `npm run dev` trước khi chạy `npm run init`.
- **Khắc phục**:
  1. Đảm bảo container `tidecloak` đang chạy ở port 8080 (`docker ps`).
  2. Chạy `npm run init` bên trong thư mục `my-app`.
  3. Khởi động lại app bằng `npm run dev`.

### 3. Container `tidecloak` báo lỗi cổng 8080 đã được sử dụng
- **Khắc phục**:
  ```bash
  # Tìm và dừng container hoặc tiến trình đang chiếm cổng 8080
  sudo docker stop $(sudo docker ps -q --filter publish=8080)
  ```

### 4. Muốn reset hoàn toàn dữ liệu TideCloak để làm lại từ đầu
```bash
sudo docker stop tidecloak && sudo docker rm tidecloak
sudo rm -rf ./data/*
sudo chown -R 1000:1000 ./data
# Sau đó chạy lại lệnh docker run ở Mục 3 và npm run init ở Mục 4
```
