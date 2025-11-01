/* chatbot.js - floating AI assistant component
   Usage:
   1. Add <link rel="stylesheet" href="chatbot.css"> in your <head>.
   2. Add <script src="chatbot.js" defer></script> near end of body or in head (defer).
   3. Configure SITE_KNOWLEDGE below.
   4. Optionally set API_ENDPOINT to your server proxy for secure AI calls.
*/

/* ===================== Config ===================== */
/* Put your site facts here. The assistant will use this to answer questions about the site. */
const SITE_KNOWLEDGE = {
  name: "AutoService BL",
  description: "AutoService BL sells car parts and accessories for BMW, Mercedes, Ford, and many more. We also do repairs and diagnostics.",
  owner: { name: "Loay", phone: "+212 776270650" },
  address: "123 Main St, Casablanca, Morocco",
  hours: "Mon-Fri 9:00 - 19:00, Sat 9:00 - 14:00, Sun closed",
  services: [
    "Genuine OEM parts for BMW, Mercedes, Ford",
    "Brakes & suspension",
    "Engine diagnostics",
    "Oil change",
    "Tire replacement",
  ],
  // Example price hints (not real store DB)
  prices: {
    "oil change": "from 25 USD",
    "brake pads": "from 40 USD per axle",
  },
  website: window.location.origin
};

/* If you have a server endpoint that calls OpenAI (recommended), set it here.
   Example: const API_ENDPOINT = "/api/ai"; (create server file below)
   If null, the widget uses a built-in simple responder (local fallback).
*/
const API_ENDPOINT = null; // <-- set to your proxy endpoint string when you have server

/* Max tokens / model config (passed to your server) */
const AI_MODEL = "gpt-4o-mini"; // used as a hint if you implement server proxy

/* Default language */
let currentLang = localStorage.getItem("lang") || document.documentElement.lang || "en";

/* ================ UI Injection ================ */
(function injectChatbot() {
  if (document.getElementById("ai-chatbot")) return;

  const root = document.createElement("div");
  root.id = "ai-chatbot";
  root.innerHTML = `
    <div class="chat-panel" style="display:none" aria-hidden="true">
      <div class="chat-header">
        <div>
          <div class="title">Assistant — ${SITE_KNOWLEDGE.name}</div>
          <div class="subtitle">Ask me about parts, contact or opening hours</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <select class="lang" title="Language">
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="ar">AR</option>
          </select>
          <button class="close" title="Close" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="messages" role="log" aria-live="polite"></div>
      <div class="chat-input">
        <textarea placeholder="Ask about parts, owner number, hours..." rows="1"></textarea>
        <button class="send">Send</button>
      </div>
      <div class="controls">
        <small style="opacity:0.7">Responses AI-sourced</small>
      </div>
    </div>

    <button class="chat-toggle" title="Open Assistant" aria-label="Open Assistant">AI</button>
  `;
  document.body.appendChild(root);

  // wire elements
  const panel = root.querySelector(".chat-panel");
  const toggle = root.querySelector(".chat-toggle");
  const closeBtn = root.querySelector(".close");
  const messages = root.querySelector(".messages");
  const textarea = root.querySelector("textarea");
  const sendBtn = root.querySelector(".send");
  const langSel = root.querySelector(".lang");

  // init language selector
  langSel.value = currentLang;
  langSel.addEventListener("change", (e) => {
    currentLang = e.target.value;
    localStorage.setItem("lang", currentLang);
    addBotMessage(getLocalizedText("language_switched", currentLang));
  });

  // toggle open/close
  toggle.addEventListener("click", () => {
    const opened = panel.style.display === "flex" || panel.style.display === "";
    if (!opened) openPanel();
    else closePanel();
  });
  closeBtn.addEventListener("click", closePanel);

  function openPanel() {
    panel.style.display = "flex";
    panel.setAttribute("aria-hidden", "false");
    toggle.style.display = "none";
    scrollMessagesToBottom();
    // initial greeting
    addBotMessage(getLocalizedGreeting());
  }
  function closePanel() {
    panel.style.display = "none";
    panel.setAttribute("aria-hidden", "true");
    toggle.style.display = "grid";
  }

  // handle send
  sendBtn.addEventListener("click", onSend);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  });

  function onSend() {
    const text = textarea.value.trim();
    if (!text) return;
    addUserMessage(text);
    textarea.value = "";
    handleUserQuery(text, currentLang);
  }

  // helper add messages
  function addUserMessage(text) {
    const el = document.createElement("div");
    el.className = "message user";
    el.textContent = text;
    messages.appendChild(el);
    scrollMessagesToBottom();
  }
  function addBotMessage(text) {
    const el = document.createElement("div");
    el.className = "message bot";
    // support right-to-left for Arabic
    if (currentLang === "ar") {
      el.style.direction = "rtl";
      el.style.textAlign = "right";
    } else {
      el.style.direction = "ltr";
      el.style.textAlign = "left";
    }
    el.innerHTML = sanitizeHtml(text);
    messages.appendChild(el);
    scrollMessagesToBottom();
  }

  function scrollMessagesToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  // sanitize minimal (no script)
  function sanitizeHtml(s) {
    return String(s).replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>");
  }

  /* ========== AI / Fallback response logic ========== */

  async function handleUserQuery(userText, lang) {
    // Build the context prompt using SITE_KNOWLEDGE
    const systemContext = buildSystemContext(lang);
    const prompt = `${systemContext}\nUser: ${userText}\nAssistant:`;

    // If API endpoint provided, call server proxy
    if (API_ENDPOINT) {
      try {
        addBotMessage(getLocalizedText("thinking", lang));
        const resp = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: AI_MODEL,
            prompt,
            max_tokens: 600,
            lang
          })
        });
        const data = await resp.json();
        // expected server response: { text: "..." }
        if (data && data.text) {
          // remove the temporary 'thinking' message
          removeThinkingMessage();
          addBotMessage(data.text);
        } else {
          removeThinkingMessage();
          const fallback = localFallback(userText, lang);
          addBotMessage(fallback);
        }
      } catch (err) {
        removeThinkingMessage();
        console.error("AI call error:", err);
        addBotMessage(localFallback(userText, lang));
      }
    } else {
      // local fallback responder (simple rule-based + facts)
      addBotMessage(getLocalizedText("thinking", lang));
      setTimeout(() => {
        removeThinkingMessage();
        const answer = localFallback(userText, lang);
        addBotMessage(answer);
      }, 600); // small delay to feel "AI-like"
    }
  }

  function removeThinkingMessage() {
    const nodes = [...messages.querySelectorAll(".message.bot")];
    // remove last bot message if it's the thinking placeholder
    if (nodes.length) {
      const last = nodes[nodes.length - 1];
      if (last && last.textContent && last.textContent.toLowerCase().includes("thinking")) {
        last.remove();
      }
    }
  }

  function buildSystemContext(lang) {
    const s = SITE_KNOWLEDGE;
    let ctx = "";
    ctx += (lang === "fr") ? `Vous êtes un assistant pour ${s.name}.` : (lang === "ar") ? `أنت مساعد لموقع ${s.name}.` : `You are an assistant for ${s.name}.`;
    ctx += ` Use the following facts to answer queries:\n`;
    ctx += `Name: ${s.name}\n`;
    ctx += `Description: ${s.description}\n`;
    ctx += `Owner: ${s.owner.name}, phone: ${s.owner.phone}\n`;
    ctx += `Address: ${s.address}\n`;
    ctx += `Hours: ${s.hours}\n`;
    ctx += `Services: ${s.services.join("; ")}\n`;
    ctx += `Prices hints: ${Object.entries(s.prices).map(([k,v])=>`${k}: ${v}`).join("; ")}\n`;
    ctx += `Website: ${s.website}\n`;
    ctx += `Answer in ${lang === "ar" ? "Arabic" : (lang === "fr" ? "French" : "English")}. Be concise, helpful, and if you don't know, say you don't know and offer contact info.`;
    return ctx;
  }

  /* localFallback: simple intelligent rules + site facts */
  function localFallback(userText, lang) {
    const t = userText.toLowerCase();
    const s = SITE_KNOWLEDGE;
    // common intents
    if (/(owner|owner name|who owns|proprietor|مالك|المالك|propriétaire)/i.test(t)) {
      return localize(`Owner: ${s.owner.name}. Phone: ${s.owner.phone}`, lang);
    }
    if (/(phone|contact|call|رقم|tel|telephone|اتصل)/i.test(t)) {
      return localize(`You can call ${s.owner.name} at ${s.owner.phone}`, lang);
    }
    if (/(hours|open|when|opening|متى|الدوام|heure|ouvert)/i.test(t)) {
      return localize(`Opening hours: ${s.hours}`, lang);
    }
    if (/(address|where|location|أين|adresse|emplacement)/i.test(t)) {
      return localize(`Our address: ${s.address}`, lang);
    }
    if (/(price|cost|how much|قيمة|سعر|prix)/i.test(t)) {
      // try to match known product
      for (const key of Object.keys(s.prices)) {
        if (t.includes(key)) {
          return localize(`${key} — ${s.prices[key]}`, lang);
        }
      }
      return localize(`Prices vary by part. Example: ${Object.entries(s.prices).map(([k,v])=>`${k}: ${v}`).join("; ")}`, lang);
    }
    if (/(part|parts|brake|engine|tires|tyre|قطع|قطع غيار|pièces|frein)/i.test(t)) {
      return localize(`${s.description}. Popular services: ${s.services.join(", ")}. For specific parts, tell me the car model and part name.`, lang);
    }
    // fallback
    return localize(`I don't have an exact answer in my local knowledge. Please call ${s.owner.name} at ${s.owner.phone} or ask me to forward your question.`, lang);
  }

  /* localization helper */
  function localize(text, lang) {
    // if text already in desired language, we try small translations for canned lines
    if (lang === "fr") {
      // very small static mapping for common words — for proper translation use AI backend
      return simpleTranslateToFrench(text);
    }
    if (lang === "ar") {
      return simpleTranslateToArabic(text);
    }
    return text;
  }

  function simpleTranslateToFrench(s) {
    // very small mapping; this is approximate — recommended: use API for proper translations
    return s
      .replace("Owner", "Propriétaire")
      .replace("Phone", "Téléphone")
      .replace("Opening hours", "Heures d'ouverture")
      .replace("Our address", "Notre adresse")
      .replace("Prices vary by part.", "Les prix varient selon la pièce.")
      .replace("Popular services", "Services populaires");
  }

  function simpleTranslateToArabic(s) {
    return s
      .replace("Owner", "المالك")
      .replace("Phone", "الهاتف")
      .replace("Opening hours", "ساعات العمل")
      .replace("Our address", "عنواننا")
      .replace("Prices vary by part.", "الأسعار تختلف حسب القطعة.")
      .replace("Popular services", "الخدمات الشائعة");
  }

  function getLocalizedGreeting() {
    if (currentLang === "fr") return "Bonjour ! Je peux vous aider avec des pièces, horaires, et contact.";
    if (currentLang === "ar") return "مرحبًا! أستطيع مساعدتك بالقطع، ساعات العمل، ومعلومات الاتصال.";
    return "Hello! I can help with parts, opening hours, and contact info.";
  }
  function getLocalizedText(key, lang) {
    const map = {
      thinking: { en: "Thinking...", fr: "Réfléchissement...", ar: "جارٍ التفكير..." },
      language_switched: { en: "Language switched.", fr: "Langue changée.", ar: "تم تغيير اللغة." }
    };
    return (map[key] && map[key][lang]) || map[key]?.en || "";
  }

  /* ============== theme & language sync across pages ============== */
  // React to theme and language changes made elsewhere (localStorage or postMessage)
  window.addEventListener("storage", (e) => {
    if (e.key === "theme" || e.key === "lang") {
      applyExternalSettings();
    }
  });
  window.addEventListener("message", (ev) => {
    if (!ev.data) return;
    if (ev.data.type === "setTheme") {
      applyExternalSettings();
    }
    if (ev.data.type === "setLang") {
      currentLang = ev.data.value;
      langSel.value = currentLang;
      localStorage.setItem("lang", currentLang);
    }
  });

  function applyExternalSettings() {
    const theme = localStorage.getItem("theme") || document.documentElement.getAttribute("data-theme") || "light";
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.setAttribute("data-theme", "light");
    // optionally change panel colors based on theme by toggling CSS variables (already handled by CSS)
  }

  /* ============== small helpers ============== */
  // expose a function for outside to programmatically open the assistant
  window.openSiteAssistant = openPanel;

  // auto-apply saved lang
  applyExternalSettings();
})();
