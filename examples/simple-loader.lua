--[[
    Simple Key Loader Example
    Copy this into your script's beginning
]]

local KEY_SERVER = "http://localhost:3000" -- Change to your server

-- Simple HTTP POST (adjust for your executor)
local function post(url, data)
    local HttpService = game:GetService("HttpService")
    local response = (syn and syn.request or http and http.request or request)({
        Url = url,
        Method = "POST",
        Headers = {["Content-Type"] = "application/json"},
        Body = HttpService:JSONEncode(data)
    })
    return HttpService:JSONDecode(response.Body)
end

-- Get HWID
local function getHWID()
    if syn and syn.crypto then
        return syn.crypto.hash("sha256", game:GetService("RbxAnalyticsService"):GetClientId())
    end
    return "PLAYER_" .. game:GetService("Players").LocalPlayer.UserId
end

-- Check key
local function checkKey(key)
    local result = post(KEY_SERVER .. "/api/validate", {
        key = key,
        hwid = getHWID()
    })
    return result.success, result.message
end

-- ============ USAGE ============

local KEY = "KEY-XXXX-XXXX-XXXX" -- User's key goes here

local valid, message = checkKey(KEY)

if valid then
    print("[KEY SYSTEM] ✓ Access granted!")
    
    -- Your main script code goes here
    -- Or load from URL:
    -- loadstring(game:HttpGet("https://your-script.com/main.lua"))()
    
else
    print("[KEY SYSTEM] ✗ " .. message)
    return -- Stop execution
end
