--[[
    Key System - Lua Client Loader
    
    This is an example loader for Roblox exploits/scripts.
    Adjust the HTTP request method based on your executor.
    
    Usage:
    1. Replace YOUR_SERVER_URL with your deployed server URL
    2. Integrate this into your script loader
]]

-- Configuration
local CONFIG = {
    SERVER_URL = "http://localhost:3000", -- Change to your server URL
    VALIDATE_ENDPOINT = "/api/validate",
    RESET_HWID_ENDPOINT = "/api/validate/reset-hwid",
}

-- Get Hardware ID (executor-specific, adjust as needed)
local function getHWID()
    -- Different executors have different HWID functions
    -- Synapse X: syn.crypto.hash("sha256", game:GetService("RbxAnalyticsService"):GetClientId())
    -- Script-Ware: identifyexecutor() .. getinfo(2).what
    -- Generic fallback:
    
    if syn and syn.crypto then
        return syn.crypto.hash("sha256", game:GetService("RbxAnalyticsService"):GetClientId())
    elseif getexecutorname then
        return game:GetService("RbxAnalyticsService"):GetClientId()
    else
        -- Fallback - use player ID as HWID (less secure)
        local player = game:GetService("Players").LocalPlayer
        return "PLAYER_" .. tostring(player.UserId)
    end
end

-- Make HTTP request (executor-specific)
local function httpPost(url, data)
    local HttpService = game:GetService("HttpService")
    local jsonData = HttpService:JSONEncode(data)
    
    -- Try different HTTP methods based on executor
    if syn and syn.request then
        -- Synapse X
        local response = syn.request({
            Url = url,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = jsonData
        })
        return HttpService:JSONDecode(response.Body)
        
    elseif http and http.request then
        -- Script-Ware / Fluxus
        local response = http.request({
            Url = url,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = jsonData
        })
        return HttpService:JSONDecode(response.Body)
        
    elseif request then
        -- Generic request function
        local response = request({
            Url = url,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = jsonData
        })
        return HttpService:JSONDecode(response.Body)
        
    else
        error("No HTTP request function available. Your executor may not support HTTP requests.")
    end
end

-- Validate a license key
local function validateKey(key)
    local hwid = getHWID()
    
    local success, result = pcall(function()
        return httpPost(CONFIG.SERVER_URL .. CONFIG.VALIDATE_ENDPOINT, {
            key = key,
            hwid = hwid
        })
    end)
    
    if not success then
        return {
            success = false,
            message = "Failed to connect to key server: " .. tostring(result)
        }
    end
    
    return result
end

-- Reset HWID for a key
local function resetHWID(key)
    local success, result = pcall(function()
        return httpPost(CONFIG.SERVER_URL .. CONFIG.RESET_HWID_ENDPOINT, {
            key = key
        })
    end)
    
    if not success then
        return {
            success = false,
            message = "Failed to connect to key server: " .. tostring(result)
        }
    end
    
    return result
end

-- Create a simple key input UI
local function createKeyUI(onValidated)
    local ScreenGui = Instance.new("ScreenGui")
    local Frame = Instance.new("Frame")
    local Title = Instance.new("TextLabel")
    local KeyInput = Instance.new("TextBox")
    local SubmitButton = Instance.new("TextButton")
    local StatusLabel = Instance.new("TextLabel")
    
    ScreenGui.Name = "KeySystemUI"
    ScreenGui.ResetOnSpawn = false
    ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    
    Frame.Name = "MainFrame"
    Frame.Parent = ScreenGui
    Frame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    Frame.BorderSizePixel = 0
    Frame.Position = UDim2.new(0.5, -150, 0.5, -100)
    Frame.Size = UDim2.new(0, 300, 0, 200)
    
    -- Add rounded corners
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 10)
    corner.Parent = Frame
    
    Title.Name = "Title"
    Title.Parent = Frame
    Title.BackgroundTransparency = 1
    Title.Position = UDim2.new(0, 0, 0, 10)
    Title.Size = UDim2.new(1, 0, 0, 30)
    Title.Font = Enum.Font.GothamBold
    Title.Text = "🔑 License Key"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.TextSize = 18
    
    KeyInput.Name = "KeyInput"
    KeyInput.Parent = Frame
    KeyInput.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
    KeyInput.BorderSizePixel = 0
    KeyInput.Position = UDim2.new(0.1, 0, 0.25, 0)
    KeyInput.Size = UDim2.new(0.8, 0, 0, 35)
    KeyInput.Font = Enum.Font.Gotham
    KeyInput.PlaceholderText = "Enter your key..."
    KeyInput.Text = ""
    KeyInput.TextColor3 = Color3.fromRGB(255, 255, 255)
    KeyInput.TextSize = 14
    
    local inputCorner = Instance.new("UICorner")
    inputCorner.CornerRadius = UDim.new(0, 6)
    inputCorner.Parent = KeyInput
    
    SubmitButton.Name = "SubmitButton"
    SubmitButton.Parent = Frame
    SubmitButton.BackgroundColor3 = Color3.fromRGB(0, 170, 127)
    SubmitButton.BorderSizePixel = 0
    SubmitButton.Position = UDim2.new(0.1, 0, 0.5, 0)
    SubmitButton.Size = UDim2.new(0.8, 0, 0, 35)
    SubmitButton.Font = Enum.Font.GothamBold
    SubmitButton.Text = "Validate Key"
    SubmitButton.TextColor3 = Color3.fromRGB(255, 255, 255)
    SubmitButton.TextSize = 14
    
    local buttonCorner = Instance.new("UICorner")
    buttonCorner.CornerRadius = UDim.new(0, 6)
    buttonCorner.Parent = SubmitButton
    
    StatusLabel.Name = "StatusLabel"
    StatusLabel.Parent = Frame
    StatusLabel.BackgroundTransparency = 1
    StatusLabel.Position = UDim2.new(0, 0, 0.7, 0)
    StatusLabel.Size = UDim2.new(1, 0, 0, 50)
    StatusLabel.Font = Enum.Font.Gotham
    StatusLabel.Text = ""
    StatusLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
    StatusLabel.TextSize = 12
    StatusLabel.TextWrapped = true
    
    -- Button click handler
    SubmitButton.MouseButton1Click:Connect(function()
        local key = KeyInput.Text
        
        if key == "" then
            StatusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
            StatusLabel.Text = "Please enter a key"
            return
        end
        
        StatusLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
        StatusLabel.Text = "Validating..."
        SubmitButton.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
        
        local result = validateKey(key)
        
        if result.success then
            StatusLabel.TextColor3 = Color3.fromRGB(100, 255, 100)
            StatusLabel.Text = "✓ " .. result.message
            
            -- Wait a moment then close UI and run callback
            wait(1)
            ScreenGui:Destroy()
            
            if onValidated then
                onValidated(result)
            end
        else
            StatusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
            StatusLabel.Text = "✗ " .. result.message
            SubmitButton.BackgroundColor3 = Color3.fromRGB(0, 170, 127)
        end
    end)
    
    -- Parent to PlayerGui or CoreGui
    local player = game:GetService("Players").LocalPlayer
    if gethui then
        ScreenGui.Parent = gethui()
    elseif syn and syn.protect_gui then
        syn.protect_gui(ScreenGui)
        ScreenGui.Parent = game:GetService("CoreGui")
    else
        ScreenGui.Parent = player:WaitForChild("PlayerGui")
    end
    
    return ScreenGui
end

--[[
    ========================================
    USAGE EXAMPLE
    ========================================
    
    -- Simple validation (no UI):
    local result = validateKey("KEY-XXXX-XXXX-XXXX")
    if result.success then
        print("Key valid! Loading script...")
        -- Load your main script here
    else
        print("Invalid key: " .. result.message)
    end
    
    -- With UI:
    createKeyUI(function(result)
        print("Key validated! Expires:", result.data and result.data.expiresAt or "Never")
        -- Load your main script here
        loadstring(game:HttpGet("https://your-script-url.com/main.lua"))()
    end)
]]

-- Export functions for use in other scripts
return {
    validateKey = validateKey,
    resetHWID = resetHWID,
    createKeyUI = createKeyUI,
    getHWID = getHWID,
}
