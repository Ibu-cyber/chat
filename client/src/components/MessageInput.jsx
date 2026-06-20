// =============================================
// FILE: MessageInput.jsx — Type and send messages
// =============================================
// This is the text input at the bottom of the chat.
// Type a message, press Enter or click Send, and
// it's instantly delivered to your partner!

// ---------- 1. IMPORTS ----------
import { useState, useRef, useEffect } from "react";

const EMOJIS = [
  "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💗","💖","💘","💝","💟","❣️","💌","💋","💔","❤️‍🔥","❤️‍🩹","😻","💑","👩‍❤️‍👩","👨‍❤️‍👨","💏","👩‍❤️‍💋‍👩","👨‍❤️‍💋‍👨","👁️‍🗨️",
  "👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤞","🤟","🤘","👌","🤌","🤏","👉","👈","👆","👇","✋","🖐️","🖐️","👋","🤙","💪","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁️","👅","👄","💅",
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🕸️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔","🐾","🐉","🐲",
  "🌸","💮","🏵️","🌹","🥀","🌺","🌻","🌼","🌷","🌱","🪴","🌲","🌳","🌴","🌵","🌾","🌿","☘️","🍀","🍁","🍂","🍃",
  "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🥐","🍞","🥖","🥨","🧀","🥚","🍳","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛","🍼","🫖","☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🫗","🥃","🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥣","🥡","🥢","🧂",
  "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","🤺","⛹️","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🕹️",
  "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🛺","🚲","🛴","🛹","🚏","🛣️","🛤️","⛽","🛑","🚧","⚓","🛟","⛵","🛶","🚤","🛳️","⛴️","🛥️","🚢","✈️","🛩️","🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀","🛸","🏠","🏡","🏘️","🏚️","🏗️","🏢","🏬","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏛️","⛪","🕌","🕍","🛕","🕋","⛩️","🛤️","🎠","🎡","🎢","💈","🎪","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞",
  "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🪫","🔌","💡","🔦","🕯️","🪔","🧯","🗑️","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","⚙️","🪤","🧱","⛓️","🧲","🔫","💣","🧨","🪓","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿","🪬","💈","⚗️","🔭","🔬","🕳️","🩻","🩹","🩺","💊","💉","🧬","🦠","🧫","🧪","🌡️","🧹","🪠","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪥","🪒","🧽","🪣","🧴","🛎️","🔑","🗝️","🚪","🪑","🛋️","🛏️","🛌","🧸","🪆","🖼️","🪞","🪟","🛍️","🛒","🎁","🎈","🎏","🎀","🪄","🪅","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷️","📪","📫","📬","📭","📮","📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒️","🗓️","📆","📅","📇","🗃️","🗳️","🗄️","📋","📁","📂","🗂️","🗞️","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇️","📐","📏","🧮","📌","📍","✂️","🖊️","🖋️","✒️","🖌️","🖍️","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓",
  "❤️","💕","💗","💖","💘","💝","💞","💟","❣️","💌","💋","💔","💑","💏","👩‍❤️‍👩","👨‍❤️‍👨","👩‍❤️‍💋‍👩","👨‍❤️‍💋‍👨","💏","💑","😻","🥰","😍","😘","😗","😙","😚","🤗","🤩","🤗","🫶","👐","🤲","🙌","🤝","👏","💪","✨","⭐","🌟","💫","⚡","🔥","💥","🌈","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","💨","🌪️","🌫️","🌊","💧","💦","🫧","☔","⛱️","🌤️",
  "🎉","🎊","🎈","🎁","🎀","🎃","🎄","🎆","🎇","🧨","✨","🎗️","🎟️","🎫","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","🎰","🎲","🧩","♠️","♥️","♦️","♣️","🃏","🀄",
];

const EMOJI_CATEGORIES = [
  { label: "Smileys", start: 0, end: 99 },
  { label: "Hearts", start: 100, end: 120 },
  { label: "Hands", start: 121, end: 150 },
  { label: "Animals", start: 151, end: 224 },
  { label: "Nature", start: 225, end: 240 },
  { label: "Food", start: 241, end: 310 },
  { label: "Sports", start: 311, end: 355 },
  { label: "Travel", start: 356, end: 395 },
  { label: "Objects", start: 396, end: 470 },
  { label: "Love", start: 471, end: 495 },
  { label: "Celebration", start: 496, end: 510 },
];

// ---------- 2. THE EMOJI PICKER COMPONENT ----------
function EmojiPicker({ onSelect }) {
  const [category, setCategory] = useState(0);

  return (
    <div className="emoji-picker">
      <div className="emoji-categories">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            className={`emoji-cat-btn ${category === i ? "emoji-cat-active" : ""}`}
            onClick={() => setCategory(i)}
            title={cat.label}
          >
            {EMOJIS[cat.start]}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {EMOJIS.slice(EMOJI_CATEGORIES[category].start, EMOJI_CATEGORIES[category].end).map((emoji, i) => (
          <button
            key={i}
            className="emoji-item"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 3. THE MESSAGE INPUT COMPONENT ----------
function MessageInput({ onSend, onTyping, onStopTyping, onAttachImage, onAttachDocument, onRecordAudio }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);
  const pickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSend() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
    onStopTyping();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleChange(event) {
    const newText = event.target.value;
    setText(newText);
    onTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  }

  function handleKeyUp(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }

  function handleEmojiSelect(emoji) {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
    } else {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + emoji.length;
        el.focus();
      });
    }
  }

  return (
    <div className="message-input-wrapper">
      <div className="message-input-container">
        {/* Emoji picker button */}
        <button
          className={`input-action-button ${showEmoji ? "input-action-active" : ""}`}
          onClick={() => setShowEmoji((v) => !v)}
          title="Add emoji"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>

        {/* Attach image button */}
        <button
          className="input-action-button"
          onClick={onAttachImage}
          title="Send a photo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>

        {/* Record audio button */}
        <button
          className="input-action-button"
          onClick={onRecordAudio}
          title="Record voice message"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>

        {/* Attach document button */}
        <button
          className="input-action-button"
          onClick={onAttachDocument}
          title="Send a document"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>

        {/* Text input area */}
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder="Type a message..."
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          rows={1}
        />

        {/* Send button */}
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!text.trim()}
          title="Send message"
        >
          Send 💌
        </button>
      </div>

      {showEmoji && (
        <div className="emoji-picker-wrapper" ref={pickerRef}>
          <EmojiPicker onSelect={handleEmojiSelect} />
        </div>
      )}
    </div>
  );
}

// ---------- 8. EXPORT ----------
export default MessageInput;
