local username = get("username-input")
local password = get("password-input")

local loginbutton = get("login")
local registerbutton = get("register")

local result = get("result")
local messagesitem = get("messages")

local sendUsername = get("send-username")
local sendMessage = get("send-message")
local privateSendButton = get("privatesend")

local publicMessage = get("publicsend-message")
local publicSendButton = get("publicsend")

local token

local function formatMessages(data)
    local formattedData = {}
    for _, message in ipairs(data) do
        local success, formattedMessage = pcall(function()
            return string.format(
                "[%d] - Sender: %s, Receiver: %s, Message: %s, Timestamp: %s\n",
                message.id,
                message.sender,
                message.receiver,
                message.message,
                message.timestamp
            )
        end)
        if success then
            table.insert(formattedData, formattedMessage)
        else
            print("Error formatting message:", formattedMessage)
        end
    end
    return table.concat(formattedData)
end

loginbutton.on_click(function()
    local body = "{"
        .. '"username": "'
        .. username.get_content()
        .. '", '
        .. '"password": "'
        .. password.get_content()
        .. '"'
        .. "}"
    print(body)
    local res = fetch({
        url = "http://127.0.0.1:3000/api/login",
        method = "POST",
        headers = { ["Content-Type"] = "application/json" },
        body = body,
    })
    print(res)
    if res and res.status then
        if res.status == 429 then
            result.set_content("Failed due to ratelimit.")
        else
            result.set_content("Failed due to error: " .. res.status)
        end
    elseif res and res.token then
        token = res.token
        result.set_content("Login successful")
        local messages = fetch({
            url = "http://127.0.0.1:3000/api/messages",
            method = "GET",
            headers = { 
                ["Content-Type"] = "application/json",
                ["Authorization"] = token 
            },
        })
        messagesitem.set_content(formatMessages(messages.messages))
    else
        result.set_content("Failed due to unknown error.")
    end
end)

registerbutton.on_click(function()
    local body = "{"
        .. '"username": "'
        .. username.get_content()
        .. '", '
        .. '"password": "'
        .. password.get_content()
        .. '"'
        .. "}"
    print(body)
    local res = fetch({
        url = "http://127.0.0.1:3000/api/register",
        method = "POST",
        headers = { ["Content-Type"] = "application/json" },
        body = body,
    })
    if res.status == 201 then
        result.set_content("You registered successfully, you can now login")
    else
        result.set_content("Username taken")
    end
end)

privateSendButton.on_click(function()
    local body = "{"
        .. '"receiver": "'
        .. sendUsername.get_content()
        .. '", '
        .. '"message": "'
        .. sendMessage.get_content()
        .. '"'
        .. "}"
    print(body)
    local res = fetch({
        url = "http://127.0.0.1:3000/api/send",
        method = "POST",
        headers = { 
            ["Content-Type"] = "application/json",
            ["Authorization"] = token 
        },
        body = body,
    })
    if res.status == 200 then
        result.set_content("Message sent successfully")
        local messages = fetch({
            url = "http://127.0.0.1:3000/api/messages",
            method = "GET",
            headers = { 
                ["Content-Type"] = "application/json",
                ["Authorization"] = token 
            },
        })
        messagesitem.set_content(formatMessages(messages.messages))
    else
        result.set_content("Cannot send message")
    end
end)

publicSendButton.on_click(function()
    local body = "{"
        .. '"message": "'
        .. publicMessage.get_content()
        .. '"'
        .. "}"
    print(body)
    local res = fetch({
        url = "http://127.0.0.1:3000/api/public-message",
        method = "POST",
        headers = { 
            ["Content-Type"] = "application/json",
            ["Authorization"] = token 
        },
        body = body,
    })
    if res.status == 200 then
        result.set_content("Public message sent successfully")
        local messages = fetch({
            url = "http://127.0.0.1:3000/api/public-messages",
            method = "GET",
            headers = { 
                ["Content-Type"] = "application/json",
                ["Authorization"] = token 
            },
        })
        messagesitem.set_content(formatMessages(messages.messages))
    else
        result.set_content("Cannot send public message")
    end
end)
