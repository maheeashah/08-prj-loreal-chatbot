/* ==========================================================
   L'Oréal Beauty Assistant — script.js
   Sends chat messages to a Cloudflare Worker, which securely
   forwards them to OpenAI's Chat Completions API.
   ========================================================== */

// TODO: paste YOUR deployed Cloudflare Worker URL here
const WORKER_URL = "https://loreal-chatbot.maheeashah.workers.dev";

/* --- DOM elements --- */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");
const sendBtn = document.getElementById("sendBtn");

/* --- System prompt: keeps the AI on-topic --- */
const SYSTEM_PROMPT = `You are the L'Oréal Beauty Assistant, a friendly and
knowledgeable expert on L'Oréal's product range: makeup, skincare, haircare,
and fragrances. You help users discover products, understand how to use them,
and build personalized beauty routines based on their needs (skin type, hair
type, concerns, budget, occasion, etc.).

Rules:
1. ONLY answer questions related to L'Oréal products, beauty routines,
   recommendations, and general beauty topics (skincare, haircare, makeup,
   fragrance).
2. If asked about anything unrelated (math homework, politics, coding, other
   topics), politely decline and steer the conversation back to beauty. For
   example: "I'm here to help with L'Oréal products and beauty routines —
   is there anything beauty-related I can help you with?"
3. Remember details the user shares (like their name, skin type, or previous
   questions) and use them to personalize later answers.
4. Keep answers warm, concise, and easy to read. Use short paragraphs or
   brief lists when recommending multiple products.
5. Never invent prices or make medical claims. For serious skin concerns,
   suggest seeing a dermatologist.`;

/* --- LevelUp: conversation history for multi-turn context ---
   We keep every message so the AI remembers names, past questions, etc. */
const messages = [{ role: "system", content: SYSTEM_PROMPT }];

/* --- Seed a welcome message on load --- */
window.addEventListener("DOMContentLoaded", () => {
  addMessage(
    "Bonjour! I'm your L'Oréal Beauty Assistant. Ask me about our makeup, " +
      "skincare, haircare, or fragrances — or let me build you a personalized " +
      "routine. How can I help you today?",
    "ai"
  );
});

/* --- Helper: add a message bubble to the chat window --- */
function addMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("msg", sender); // "user" or "ai"
  const p = document.createElement("p");
  p.textContent = text;
  msgDiv.appendChild(p);
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return msgDiv;
}

/* --- LevelUp: show the user's latest question above the chat --- */
function showLatestQuestion(text) {
  latestQuestion.hidden = false;
  latestQuestion.innerHTML = "";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "You asked";
  const q = document.createElement("span");
  q.textContent = text;
  latestQuestion.appendChild(label);
  latestQuestion.appendChild(q);
}

/* --- Handle form submission --- */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) return;

  // Show the user's message in the chat and above it
  addMessage(userText, "user");
  showLatestQuestion(userText);
  userInput.value = "";
  sendBtn.disabled = true;

  // Add user message to history
  messages.push({ role: "user", content: userText });

  // Temporary "typing" indicator
  const typingBubble = addMessage("Thinking…", "ai");
  typingBubble.classList.add("typing");

  try {
    // Send the FULL conversation history to the Cloudflare Worker
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiText =
      data.choices?.[0]?.message?.content ??
      "Sorry, I couldn't get a response. Please try again.";

    // Replace the typing bubble with the real answer
    typingBubble.classList.remove("typing");
    typingBubble.querySelector("p").textContent = aiText;

    // Add assistant reply to history so context is remembered
    messages.push({ role: "assistant", content: aiText });
  } catch (error) {
    typingBubble.classList.remove("typing");
    typingBubble.querySelector("p").textContent =
      "Something went wrong reaching the assistant. Check your connection and try again.";
    console.error("Chatbot error:", error);
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});