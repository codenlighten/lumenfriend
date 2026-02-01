/**
 * Telegram Bot Helper - Handles API calls and message formatting
 */

const TELEGRAM_API = 'https://api.telegram.org';

export class TelegramBot {
  constructor(botToken) {
    this.botToken = botToken;
    this.baseUrl = `${TELEGRAM_API}/bot${botToken}`;
  }

  /**
   * Send a message to a Telegram chat
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',  // Switch to HTML mode (simpler than MarkdownV2)
        ...options
      };

      console.log(`[TG.sendMessage] Sending to chat ${chatId}: "${text.substring(0, 40)}..." (${text.length} chars)`);

      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[TG.sendMessage] API error ${response.status}: ${errorBody.substring(0, 200)}`);
        throw new Error(`Telegram API error: ${response.status} - ${errorBody}`);
      }

      const result = await response.json();
      console.log(`[TG.sendMessage] Message sent successfully: ${result.result?.message_id}`);
      return result;
    } catch (error) {
      console.error('[TG.sendMessage] Error:', error.message);
      throw error;
    }
  }

  /**
   * Send a message with inline keyboard buttons
   */
  async sendMessageWithButtons(chatId, text, buttons) {
    try {
      // buttons format: [[{text: "Button 1", callback_data: "action1"}], [{text: "Button 2", callback_data: "action2"}]]
      const keyboard = {
        inline_keyboard: buttons
      };

      return await this.sendMessage(chatId, text, { reply_markup: keyboard });
    } catch (error) {
      console.error('[TG.sendMessageWithButtons] Error:', error.message);
      throw error;
    }
  }

  /**
   * Answer a callback query (button press)
   */
  async answerCallbackQuery(callbackQueryId, text = '') {
    try {
      const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to answer callback query: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[TG.answerCallbackQuery] Error:', error.message);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingAction(chatId) {
    try {
      await fetch(`${this.baseUrl}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          action: 'typing'
        })
      });
    } catch (error) {
      console.error('Error sending typing action:', error);
    }
  }

  /**
   * Convert markdown for Telegram's MarkdownV2 format
   * Escapes special characters that need escaping
   */
  escapeMarkdownV2(text) {
    // Characters that need escaping in MarkdownV2
    const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    let escaped = text;

    escapeChars.forEach(char => {
      escaped = escaped.split(char).join('\\' + char);
    });

    return escaped;
  }

  /**
   * Format response from Lumen for Telegram
   * Uses HTML formatting for better compatibility and code block support
   * Splits long messages at 4096 char limit
   */
  formatTelegramResponse(lumenResponse) {
    try {
      let text = lumenResponse;

      // Convert markdown code blocks to Telegram HTML format
      // Match ```language\ncode\n``` or ```code```
      text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
        // Escape HTML entities in code
        const escapedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<pre><code class="language-${language || 'text'}">${escapedCode}</code></pre>`;
      });

      // Convert inline code `code` to HTML
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

      // Convert **bold** to HTML
      text = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

      // Convert *italic* to HTML (but not when part of **)
      text = text.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<i>$1</i>');

      // Convert __underline__ to HTML
      text = text.replace(/__([^_]+)__/g, '<u>$1</u>');

      // Convert [link text](url) to HTML
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

      // Clean up any remaining problematic characters
      // But preserve HTML tags we just created
      
      // Split into chunks if longer than 4096 chars
      const chunks = [];
      let remaining = text;
      
      while (remaining.length > 4096) {
        // Find a good break point (newline, space, or HTML tag boundary)
        let breakPoint = 4096;
        const lastNewline = remaining.lastIndexOf('\n', 4096);
        const lastSpace = remaining.lastIndexOf(' ', 4096);
        const lastTag = remaining.lastIndexOf('>', 4096);
        
        // Prefer breaking at a tag boundary, then newline, then space
        if (lastTag > 3900) {
          breakPoint = lastTag + 1;
        } else if (lastNewline > 3900) {
          breakPoint = lastNewline;
        } else if (lastSpace > 3900) {
          breakPoint = lastSpace;
        }
        
        chunks.push(remaining.substring(0, breakPoint).trim());
        remaining = remaining.substring(breakPoint).trim();
      }
      
      if (remaining.length > 0) {
        chunks.push(remaining);
      }
      
      return chunks.length > 0 ? chunks : [text];
    } catch (error) {
      console.error('[TG] Error formatting Telegram response:', error);
      // Fallback: Return plain text without any formatting
      const text = String(lumenResponse)
        .substring(0, 4096)
        .replace(/[^\x20-\x7E\n]/g, '?'); // Keep only safe ASCII + newlines
      return [text];
    }
  }

  /**
   * Send multiple messages to a chat (with error resilience)
   */
  async sendMultipleMessages(chatId, messages) {
    if (!messages || messages.length === 0) {
      console.warn(`[TG] sendMultipleMessages called with empty messages for chat ${chatId}`);
      return;
    }

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < messages.length; i++) {
      try {
        const message = messages[i];
        console.log(`[TG] Sending message ${i + 1}/${messages.length} to chat ${chatId} (${message.length} chars)`);
        
        await this.sendMessage(chatId, message);
        successCount++;
        
        // Small delay between messages to avoid rate limiting
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`[TG] Failed to send message ${i + 1}/${messages.length}:`, error.message);
        errors.push({ index: i, error: error.message });
      }
    }

    console.log(`[TG] sendMultipleMessages completed: ${successCount}/${messages.length} messages sent`);
    
    if (errors.length > 0) {
      console.warn(`[TG] Failed to send ${errors.length} messages:`, errors);
      // Still throw if we failed to send ANY messages
      if (successCount === 0) {
        throw new Error(`Failed to send any messages: ${errors[0].error}`);
      }
    }
  }

  /**
   * Edit webhook for receiving updates
   */
  async setWebhook(url) {
    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          allowed_updates: ['message', 'callback_query']
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to set webhook: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting webhook:', error);
      throw error;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/getWebhookInfo`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to get webhook info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting webhook info:', error);
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook() {
    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      throw error;
    }
  }

  /**
   * Send a document (file) to a chat
   */
  async sendDocument(chatId, document, filename, caption = '') {
    try {
      const https = await import('node:https');
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      
      form.append('chat_id', chatId.toString());
      
      // Convert document string to Buffer if needed
      const buffer = typeof document === 'string' ? Buffer.from(document, 'utf-8') : document;
      form.append('document', buffer, {
        filename: filename,
        contentType: 'text/plain'
      });
      
      if (caption) {
        form.append('caption', caption);
        form.append('parse_mode', 'HTML');
      }

      console.log(`[TG.sendDocument] Sending file: ${filename} (${buffer.length} bytes)`);

      // Use https.request instead of fetch for proper form-data support
      const url = new URL(`${this.baseUrl}/sendDocument`);
      
      return await new Promise((resolve, reject) => {
        const req = https.default.request({
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers: form.getHeaders()
        }, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[TG.sendDocument] Document sent successfully`);
              resolve(JSON.parse(data));
            } else {
              console.error(`[TG.sendDocument] API error ${res.statusCode}`);
              console.error(`[TG.sendDocument] Response body: ${data}`);
              reject(new Error(`Failed to send document: ${res.statusCode} - ${data}`));
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('[TG.sendDocument] Request error:', error.message);
          reject(error);
        });
        
        form.pipe(req);
      });
    } catch (error) {
      console.error('[TG.sendDocument] Error:', error.message);
      throw error;
    }
  }

  /**
   * Delete webhook
   */

  /**
   * Get bot info
   */
  async getMe() {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to get bot info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting bot info:', error);
      throw error;
    }
  }
}

export default TelegramBot;
