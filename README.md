# 🔑 Key System

A self-hosted license key system similar to LuaArmor, built for personal use. Perfect for protecting Lua scripts, Roblox exploits, or any application that needs license validation.

## Features

- ✅ **Key Generation** - Secure, readable keys (e.g., `KEY-A2B3-C4D5-E6F7`)
- ✅ **Time-based Expiry** - Keys expire X days after first activation
- ✅ **HWID Binding** - Lock keys to specific hardware/devices
- ✅ **Usage Limits** - Limit how many times a key can be validated
- ✅ **HWID Resets** - Allow users to reset their bound device
- ✅ **Admin API** - Create, revoke, extend, and manage keys
- ✅ **Validation Logs** - Track all validation attempts
- ✅ **Rate Limiting** - Protect against abuse
- ✅ **Lua Client Examples** - Ready-to-use loaders for Roblox

## Quick Start

### 1. Prerequisites

- Node.js 18+ 
- PostgreSQL database

### 2. Installation

```bash
# Clone/download the project
cd key-system

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` with your settings:

```env
# Your PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/keysystem

# Server port
PORT=3000

# IMPORTANT: Generate a secure admin API key
ADMIN_API_KEY=your-super-secret-key-here

# Optional: Custom key prefix
KEY_PREFIX=MYAPP
```

### 4. Setup Database

```bash
# Run migrations to create tables
npm run db:migrate

# (Optional) Seed with test keys
npm run db:seed
```

### 5. Start Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm run build
npm start
```

## API Reference

### Public Endpoints

#### Validate Key
```http
POST /api/validate
Content-Type: application/json

{
  "key": "KEY-XXXX-XXXX-XXXX",
  "hwid": "optional-hardware-id"
}
```

Response:
```json
{
  "success": true,
  "message": "Key validated successfully",
  "data": {
    "expiresAt": "2024-02-15T00:00:00.000Z",
    "usesRemaining": null,
    "hwidBound": true
  }
}
```

#### Reset HWID (User)
```http
POST /api/validate/reset-hwid
Content-Type: application/json

{
  "key": "KEY-XXXX-XXXX-XXXX"
}
```

### Admin Endpoints

All admin endpoints require the `X-API-Key` header:

```http
X-API-Key: your-admin-api-key
```

#### Get Statistics
```http
GET /api/admin/stats
```

#### List All Keys
```http
GET /api/admin/keys?active=true&limit=50&offset=0
```

#### Create Single Key
```http
POST /api/admin/keys
Content-Type: application/json

{
  "note": "For user John",
  "durationDays": 30,
  "maxHwidResets": 2,
  "maxUses": null
}
```

#### Create Multiple Keys
```http
POST /api/admin/keys/batch
Content-Type: application/json

{
  "count": 10,
  "note": "Giveaway batch",
  "durationDays": 7
}
```

#### Get Key Details
```http
GET /api/admin/keys/KEY-XXXX-XXXX-XXXX
```

#### Revoke Key
```http
POST /api/admin/keys/KEY-XXXX-XXXX-XXXX/revoke
```

#### Reactivate Key
```http
POST /api/admin/keys/KEY-XXXX-XXXX-XXXX/activate
```

#### Extend Key
```http
POST /api/admin/keys/KEY-XXXX-XXXX-XXXX/extend
Content-Type: application/json

{
  "days": 30
}
```

#### Admin HWID Reset
```http
POST /api/admin/keys/KEY-XXXX-XXXX-XXXX/reset-hwid
```

#### Delete Key
```http
DELETE /api/admin/keys/KEY-XXXX-XXXX-XXXX
```

#### Get Validation Logs
```http
GET /api/admin/keys/KEY-XXXX-XXXX-XXXX/logs
```

## Lua Integration

### Simple Loader

```lua
local KEY_SERVER = "https://your-server.com"

local function checkKey(key)
    local HttpService = game:GetService("HttpService")
    local response = request({
        Url = KEY_SERVER .. "/api/validate",
        Method = "POST",
        Headers = {["Content-Type"] = "application/json"},
        Body = HttpService:JSONEncode({
            key = key,
            hwid = game:GetService("RbxAnalyticsService"):GetClientId()
        })
    })
    local data = HttpService:JSONDecode(response.Body)
    return data.success, data.message
end

-- Usage
local valid, msg = checkKey("KEY-XXXX-XXXX-XXXX")
if valid then
    -- Load your script
else
    print("Invalid: " .. msg)
end
```

See `/examples` folder for full loader examples with UI.

## Deployment

### Railway (Recommended)

1. Push code to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Add PostgreSQL plugin
4. Set environment variables
5. Deploy!

### Render

1. Create Web Service from GitHub repo
2. Create PostgreSQL database
3. Set environment variables
4. Deploy

### VPS (Manual)

```bash
# Install Node.js and PostgreSQL
# Clone your repo
npm install
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name key-system
```

## Key Types Guide

| Type | Config | Use Case |
|------|--------|----------|
| Lifetime | `durationDays: null` | Permanent access |
| Trial | `durationDays: 1, maxUses: 10` | Limited trial |
| Weekly | `durationDays: 7` | Weekly subscription |
| Monthly | `durationDays: 30` | Monthly subscription |
| Single-use | `maxUses: 1` | One-time activation |

## Security Tips

1. **Use HTTPS** - Always deploy with SSL
2. **Strong Admin Key** - Generate a long random string
3. **Rate Limiting** - Already configured, adjust in config
4. **HWID** - Implement proper HWID generation on client
5. **Obfuscation** - Obfuscate your Lua loader code

## License

MIT - Use however you want for personal or commercial projects.
