/**
 * 個人網站與倉鼠客服機器人互動邏輯
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 元素引用
  const hamsterFab = document.getElementById('hamsterFab');
  const speechBubble = document.getElementById('speechBubble');
  const hamsterChatBox = document.getElementById('hamsterChatBox');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  
  // 設定視窗元素
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const gasUrlInput = document.getElementById('gasUrlInput');
  const saveGasBtn = document.getElementById('saveGasBtn');
  const testGasBtn = document.getElementById('testGasBtn');
  const clearGasBtn = document.getElementById('clearGasBtn');
  const gasStatusText = document.getElementById('gasStatusText');
  const gasBadge = document.getElementById('gasBadge');
  const settingsMsg = document.getElementById('settingsMsg');

  // 對話元素
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const quickChips = document.querySelectorAll('.quick-chip');
  const contactForm = document.getElementById('contactForm');

  // 狀態變數
  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwit4gOWUBoyu3LDtF1LzQTg_k2K9UkKAQUTrMJre9mYbFdbt1sNAQJwK3HAph1YuK4/exec';
  const storedGasUrl = localStorage.getItem('hamster_gas_url');
  let gasUrl = storedGasUrl !== null ? storedGasUrl : DEFAULT_GAS_URL;
  // 保存多輪對話歷史（含 OpenRouter reasoning_details）
  let chatHistory = [];

  // 初始化 GAS 狀態顯示
  function updateGasStatusUI() {
    if (gasUrl && gasUrl.trim().startsWith('http')) {
      gasBadge.className = 'gas-badge connected';
      gasBadge.innerHTML = '🟢 已連線 GAS';
      gasStatusText.textContent = 'GAS 雲端模式';
      gasUrlInput.value = gasUrl;
    } else {
      gasBadge.className = 'gas-badge local';
      gasBadge.innerHTML = '🟡 本地智慧模式';
      gasStatusText.textContent = '未綁定 GAS (點⚙️設定)';
      gasUrlInput.value = '';
    }
  }
  updateGasStatusUI();

  // 切換聊天視窗開關
  function toggleChat() {
    const isOpen = hamsterChatBox.classList.contains('open');
    if (isOpen) {
      hamsterChatBox.classList.remove('open');
      settingsModal.classList.remove('active');
    } else {
      hamsterChatBox.classList.add('open');
      if (speechBubble) speechBubble.style.display = 'none';
      setTimeout(() => chatInput.focus(), 300);
      scrollToBottom();
    }
  }

  hamsterFab.addEventListener('click', toggleChat);
  if (speechBubble) speechBubble.addEventListener('click', toggleChat);
  closeChatBtn.addEventListener('click', toggleChat);

  // 切換設定視窗
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.toggle('active');
    settingsMsg.textContent = '';
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });

  // 儲存 GAS 網址
  saveGasBtn.addEventListener('click', () => {
    const inputVal = gasUrlInput.value.trim();
    if (!inputVal) {
      showSettingsMessage('請輸入有效的 URL 網址！', 'red');
      return;
    }
    if (!inputVal.startsWith('https://script.google.com/macros/s/')) {
      showSettingsMessage('⚠️ 警告：網址格式似乎不是標準 Google Apps Script 網頁應用程式網址，但仍已儲存！', '#f59e0b');
    } else {
      showSettingsMessage('✅ GAS 網址設定已儲存！', '#34d399');
    }
    gasUrl = inputVal;
    localStorage.setItem('hamster_gas_url', gasUrl);
    updateGasStatusUI();

    addBotMessage(`🐹 報告主人！已成功切換為 GAS 雲端模式！之後的訊息會轉發至您的後端處理囉～🌻`);
  });

  // 測試連線
  testGasBtn.addEventListener('click', async () => {
    const inputVal = gasUrlInput.value.trim();
    if (!inputVal) {
      showSettingsMessage('請先填入 GAS 網址再測試！', 'red');
      return;
    }

    showSettingsMessage('連線測試中，請稍候...', '#cbd5e1');
    try {
      // 嘗試發送測試 Ping
      const response = await fetch(inputVal, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ message: 'ping', test: true })
      });

      if (response.ok) {
        showSettingsMessage('🎉 連線成功！GAS 後端回應正常！', '#34d399');
      } else {
        showSettingsMessage(`⚠️ 伺服器回應狀態碼：${response.status}`, '#fbbf24');
      }
    } catch (err) {
      // GAS 在 redirect 時有時前端 fetch 會觸發 CORS 模式問題
      showSettingsMessage(`💡 已送出請求。注意：若為 GAS 請確保部署設定為「任何人 (Anyone)」可存取！`, '#38bdf8');
    }
  });

  // 清除 GAS 設定（切換為本地模式並記錄偏好）
  clearGasBtn.addEventListener('click', () => {
    if (confirm('確定要清除 GAS 網址並切換回本地預設模式嗎？')) {
      gasUrl = '';
      localStorage.setItem('hamster_gas_url', '');
      updateGasStatusUI();
      showSettingsMessage('已切換回本地預設模式', '#94a3b8');
      addBotMessage('🐹 已恢復為本地預設助理模式！隨時可以點 ⚙️ 重新綁定唷～');
    }
  });

  function showSettingsMessage(msg, color) {
    settingsMsg.style.color = color;
    settingsMsg.textContent = msg;
  }

  // 滾動到底部
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // 取得當前時間字串
  function getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  // 插入使用者訊息
  function addUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message user';
    msgDiv.innerHTML = `
      <div class="message-bubble">${escapeHtml(text)}</div>
      <div class="message-time">${getCurrentTime()}</div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  // 插入倉鼠訊息
  function addBotMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message bot';
    msgDiv.innerHTML = `
      <div class="message-avatar">🐹</div>
      <div class="message-bubble">${formatReply(text)}</div>
      <div class="message-time">${getCurrentTime()}</div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  // 格式化回覆 (支援換行與基本標籤)
  function formatReply(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function escapeHtml(string) {
    const div = document.createElement('div');
    div.innerText = string;
    return div.innerHTML;
  }

  // 發送訊息邏輯
  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addUserMessage(text);
    chatInput.value = '';

    // 顯示倉鼠思考動畫
    typingIndicator.style.display = 'flex';
    scrollToBottom();

    // 判斷是否有設定 GAS
    if (gasUrl && gasUrl.trim().startsWith('http')) {
      try {
        // 先將使用者訊息加入歷史紀錄
        chatHistory.push({ role: 'user', content: text });

        // 使用 POST 送至 GAS (以 text/plain 避免 CORS preflight OPTIONS 攔截)
        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            message: text,
            history: chatHistory,
            timestamp: new Date().toISOString()
          })
        });

        const data = await response.json();
        typingIndicator.style.display = 'none';

        if (data && data.reply) {
          addBotMessage(data.reply);
          // 若後端回傳成功，保存 assistant 訊息與 reasoning_details 供下一輪推理使用
          if (data.status === 'success') {
            const assistantEntry = { role: 'assistant', content: data.reply };
            if (data.reasoning_details !== undefined && data.reasoning_details !== null) {
              assistantEntry.reasoning_details = data.reasoning_details;
            }
            chatHistory.push(assistantEntry);
          }
        } else if (typeof data === 'string') {
          addBotMessage(data);
          chatHistory.push({ role: 'assistant', content: data });
        } else {
          addBotMessage(`🐹 收到 GAS 後端回應：${JSON.stringify(data)}`);
        }
      } catch (err) {
        typingIndicator.style.display = 'none';
        console.warn('GAS Fetch error:', err);
        addBotMessage(`🐹 吱吱！連線到 GAS 時遇到問題（可能因跨域 CORS 或部署權限）。\n💡 小提示：請確認 GAS 部署時「誰可以存取」已設為「任何人 (Anyone)」！\n\n備援回覆：${getLocalHamsterResponse(text)}`);
      }
    } else {
      // 本機模擬回覆 (延遲 600ms 增加擬真感)
      setTimeout(() => {
        typingIndicator.style.display = 'none';
        const reply = getLocalHamsterResponse(text);
        addBotMessage(reply);
      }, 700);
    }
  }

  // 本地智慧回應詞庫
  function getLocalHamsterResponse(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('你好') || lower.includes('嗨') || lower.includes('哈囉') || lower.includes('hello')) {
      return '🐹 吱吱！你好呀！我是站長的專屬倉鼠小秘書～今天吃飽了嗎？有什麼我可以幫你的呢？🌻';
    } else if (lower.includes('站長') || lower.includes('介紹') || lower.includes('是誰') || lower.includes('自我介紹')) {
      return '🐹 站長 Wenny Chiu 是一位熱愛全端開發與精緻 UI 的工程師！擅長 React、Vue、Node.js 與各類雲端自動化工具（像是我身後的 Google Apps Script）！';
    } else if (lower.includes('作品') || lower.includes('專案') || lower.includes('project')) {
      return '🐹 站長做過很多超酷的專案！你可以滑動瀏覽頁面中的「精選專案」區塊，包含 AI 智能助理、現代化電商平台以及雲端即時儀表板唷！✨';
    } else if (lower.includes('聯絡') || lower.includes('信箱') || lower.includes('email') || lower.includes('mail')) {
      return '🐹 歡迎點擊網頁導覽列的「聯絡我」，或填寫頁面最下方的表單～站長的電子信箱是 wenny.chiu.dev@example.com ！📫';
    } else if (lower.includes('gas') || lower.includes('設定') || lower.includes('網址') || lower.includes('機器人')) {
      return '🐹 想讓我串接你自己的 Google Apps Script 嗎？\n請點擊我右上角的「⚙️ 設定」按鈕，貼上你的 Web App URL 即可儲存連線唷！';
    } else if (lower.includes('葵花子') || lower.includes('吃') || lower.includes('種子')) {
      return '🐹 哇啊啊啊！是美味的葵花子！*卡滋卡滋大口咀嚼* 謝謝你！倉鼠小幫手元氣滿滿！🌻✨';
    } else {
      return `🐹 吱！收到你的訊息：「${msg}」！\n若你想串接自己的後端大腦，隨時點擊右上角「⚙️」填入 GAS 網址就能實現客製化回覆囉！🌻`;
    }
  }

  // 送出事件監聽
  sendBtn.addEventListener('click', handleSend);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // 快速標籤點擊
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) {
        chatInput.value = prompt;
        handleSend();
      }
    });
  });

  // 清除對話紀錄
  clearChatBtn.addEventListener('click', () => {
    if (confirm('確定要清空目前的對話紀錄嗎？')) {
      chatHistory = [];
      chatMessages.innerHTML = `
        <div class="chat-message bot">
          <div class="message-avatar">🐹</div>
          <div class="message-bubble">
            對話已清空！有什麼我可以幫忙的嗎？🌻
          </div>
          <div class="message-time">${getCurrentTime()}</div>
        </div>
      `;
    }
  });

  // 聯絡表單送出模擬
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('🎉 感謝您的來信！站長與倉鼠小助理已收到訊息，會盡快回覆您！');
      contactForm.reset();
    });
  }
});
