/**
 * Google Apps Script (GAS) - OpenRouter API 倉鼠客服機器人後端
 * 
 * 【設定步驟】
 * 1. 開啟 Google Apps Script (https://script.google.com/) 新增專案，將此程式碼貼入 Code.gs。
 * 2. 點擊左側「專案設定 (齒輪圖示)」-> 滑到最下方「指令碼屬性 (Script Properties)」->「新增指令碼屬性」：
 *    - 屬性 (Property)：OPENROUTER_API_KEY
 *    - 值 (Value)：填入您的 OpenRouter API Key (例如 sk-or-v1-...)
 * 3. 點擊右上角「部署 (Deploy)」->「新增部署作業 (New deployment)」。
 * 4. 類型選擇「網頁應用程式 (Web app)」。
 * 5. 執行身分選擇「我 (Me)」，誰可以存取選擇「任何人 (Anyone)」（重要！）。
 * 6. 部署後複製「網頁應用程式網址」，貼到網站右下角倉鼠客服的「⚙️ 設定」中即可連線！
 */

var OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
var MODEL_NAME = "anthropic/claude-haiku-5.5";

var SYSTEM_PROMPT = [
  "你是個人網站右下角的可愛倉鼠客服小管家「Hammy」🐹。",
  "網站主人是「Wenny Chiu」，一位擅長現代前端、後端雲端與 AI/GAS 自動化的全端開發工程師。",
  "請用親切、可愛、偶爾帶點「吱吱」或葵花子 🌻 元素的繁體中文語氣回覆訪客問題，同時保持專業與簡潔。"
].join("\n");

function doPost(e) {
  try {
    var requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    // 處理前端「測試連線」按鈕的 ping 請求（不消耗 API 額度）
    if (requestData.test === true) {
      var hasKey = !!PropertiesService.getScriptProperties().getProperty("OPENROUTER_API_KEY");
      return createJsonResponse({
        status: "success",
        reply: hasKey
          ? "🐹 連線成功！已偵測到 OPENROUTER_API_KEY，倉鼠大腦準備就緒！"
          : "⚠️ 連線成功，但尚未在「指令碼屬性」設定 OPENROUTER_API_KEY 唷！"
      });
    }

    var userMessage = requestData.message || "";
    var history = Array.isArray(requestData.history) ? requestData.history : [];

    var apiKey = PropertiesService.getScriptProperties().getProperty("OPENROUTER_API_KEY");
    if (!apiKey) {
      return createJsonResponse({
        status: "error",
        reply: "🐹 吱吱！找不到 API Key，請先到 GAS「專案設定 -> 指令碼屬性」新增 OPENROUTER_API_KEY 唷！"
      });
    }

    // 組裝傳給 OpenRouter 的 messages（保留歷史對話與 reasoning_details）
    var messages = [{ role: "system", content: SYSTEM_PROMPT }];

    for (var i = 0; i < history.length; i++) {
      var item = history[i];
      if (!item || !item.role) continue;

      if (item.role === "assistant") {
        var assistantMsg = {
          role: "assistant",
          content: item.content || ""
        };
        // 原封不動傳回 reasoning_details 以延續推理上下文
        if (item.reasoning_details !== undefined && item.reasoning_details !== null) {
          assistantMsg.reasoning_details = item.reasoning_details;
        }
        messages.push(assistantMsg);
      } else if (item.role === "user") {
        messages.push({
          role: "user",
          content: item.content || ""
        });
      }
    }

    // 確保最新一則使用者訊息有加入（若前端 history 尚未包含當前訊息）
    var lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== userMessage) {
      messages.push({ role: "user", content: userMessage });
    }

    var payload = {
      model: MODEL_NAME,
      messages: messages,
      reasoning: { enabled: true }
    };

    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": "https://github.com",
        "X-Title": "Hammy Personal Website Assistant"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(OPENROUTER_API_URL, options);
    var statusCode = res.getResponseCode();
    var resBody = JSON.parse(res.getContentText());

    if (statusCode < 200 || statusCode >= 300) {
      var errMsg = (resBody.error && resBody.error.message) ? resBody.error.message : res.getContentText();
      return createJsonResponse({
        status: "error",
        reply: "🐹 OpenRouter API 回傳錯誤 (" + statusCode + ")：" + errMsg
      });
    }

    var choiceMessage = resBody.choices && resBody.choices[0] && resBody.choices[0].message;
    if (!choiceMessage) {
      return createJsonResponse({
        status: "error",
        reply: "🐹 吱吱...OpenRouter 沒有回傳有效的訊息內容。"
      });
    }

    // 回傳 content 與 reasoning_details 給前端保存，供下一輪對話傳回
    var output = {
      status: "success",
      reply: choiceMessage.content || "",
      timestamp: new Date().toISOString()
    };
    if (choiceMessage.reasoning_details !== undefined) {
      output.reasoning_details = choiceMessage.reasoning_details;
    }

    return createJsonResponse(output);

  } catch (error) {
    return createJsonResponse({
      status: "error",
      reply: "🐹 吱吱...倉鼠後端發生錯誤：" + error.toString()
    });
  }
}

// 支援 GET 請求測試（直接用瀏覽器打開網址檢查是否部署成功）
function doGet(e) {
  var hasKey = !!PropertiesService.getScriptProperties().getProperty("OPENROUTER_API_KEY");
  return createJsonResponse({
    status: "online",
    model: MODEL_NAME,
    apiKeyConfigured: hasKey,
    message: "🐹 倉鼠客服 OpenRouter GAS 後端運作中！請使用 POST 發送對話。"
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
