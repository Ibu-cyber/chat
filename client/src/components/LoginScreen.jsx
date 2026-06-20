// =============================================
// FILE: LoginScreen.jsx — The login page
// =============================================
// This is the first screen you see. You and your
// partner each have a username and password (set
// in the .env file). Enter them here to enter
// the chat.

// ---------- 1. IMPORTS ----------
import { useState } from "react";
import { connectToServer } from "../socket";

// ---------- 2. THE LOGIN SCREEN COMPONENT ----------
function LoginScreen({ onLoginSuccess }) {
  // Track what the user types in the form fields
  const [username, setUsername] = useState(""); // Username input
  const [password, setPassword] = useState(""); // Password input
  const [error, setError] = useState(""); // Error message (if login fails)
  const [isLoading, setIsLoading] = useState(false); // Loading state

  // ---------- 3. HANDLE LOGIN SUBMISSION ----------
  function handleLogin(event) {
    // Prevent the form from refreshing the page
    event.preventDefault();

    // Clear any previous error
    setError("");

    // Make sure both fields are filled in
    if (!username.trim() || !password.trim()) {
      setError("Please enter both your name and password.");
      return;
    }

    // Show loading indicator
    setIsLoading(true);

    // Try to connect to the server with these credentials
    const socket = connectToServer(username, password);

    // ---------- 4. LISTEN FOR CONNECTION EVENTS ----------
    // If the server accepts our credentials...
    socket.on("connect", () => {
      setIsLoading(false);
      onLoginSuccess(username); // Tell App.jsx we're logged in!
    });

    // If the server rejects our credentials...
    socket.on("connect_error", (err) => {
      setIsLoading(false);
      // Show a friendly error message
      if (err.message.includes("Invalid username or password")) {
        setError("Wrong name or password. Only you and your partner can use this chat.");
      } else {
        setError("Could not reach the server. Is it running?");
      }
    });
  }

  // ---------- 5. RENDER THE LOGIN SCREEN ----------
  return (
    <div className="login-screen">
      {/* Decorative floating hearts (CSS animations) */}
      <div className="login-hearts">
        <span>❤️</span>
        <span>💕</span>
        <span>❤️</span>
        <span>💕</span>
        <span>❤️</span>
      </div>

      {/* Login card */}
      <div className="login-card">
        {/* App title */}
        <h1 className="login-title">HeartChat</h1>
        <p className="login-subtitle">A private place for just the two of us</p>

        {/* Login form */}
        <form onSubmit={handleLogin} className="login-form">
          {/* Username field */}
          <div className="login-field">
            <label htmlFor="username">Your Name</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Password field */}
          <div className="login-field">
            <label htmlFor="password">Your Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Error message (if any) */}
          {error && <p className="login-error">{error}</p>}

          {/* Login button */}
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Connecting..." : "Enter the Chat 💌"}
          </button>
        </form>

        {/* Hint */}
        <p className="login-hint">
          The names and passwords are set in the <code>.env</code> file
        </p>
      </div>
    </div>
  );
}

// ---------- 6. EXPORT ----------
export default LoginScreen;
