import React, { useState, useRef, useEffect } from 'react';
import { Send, LogOut, Bot, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SUPABASE_URL = 'https://wiavnyuchdsfztzhvaua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYXZueXVjaGRzZnp0emh2YXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDI2ODQsImV4cCI6MjA4NjU3ODY4NH0.dXz7vyFglA_lihma__rbtBT8afZZ1YUJEkAmqpFOL6c';
const N8N_WEBHOOK_URL = 'https://gpixie.app.n8n.cloud/webhook/73c8cf09-d134-445b-950a-94a8eccbe4f8';
const WEBHOOK_URL = import.meta.env.DEV ? '/n8n-webhook' : N8N_WEBHOOK_URL;

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
}

function renderMarkdown(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pIdx) => {
    const lines = para.split(/\n/);
    const isList = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim() === '');
    if (isList) {
      const items = lines.filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
      return (
        <ul key={pIdx} style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent-light)', marginTop: 2, flexShrink: 0 }}>•</span>
              <span>{applyInlineFormatting(item.replace(/^[-*]\s*/, ''))}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={pIdx} style={{ margin: pIdx > 0 ? '8px 0 0' : 0 }}>
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {applyInlineFormatting(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

function applyInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatLoading]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both email and password.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(loginEmail.trim())}&select=id,first_name,last_name,email,password`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = JSON.parse(await res.text());
      if (data.length === 0) {
        setLoginError('Account not found.');
      } else if (data[0].password !== loginPassword) {
        setLoginError('Incorrect password.');
      } else {
        const { password: _, ...userData } = data[0];
        setUser(userData);
        setMessages([{ id: 'welcome', role: 'agent', text: `Hello ${userData.first_name}! How can I help you today?` }]);
      }
    } catch {
      setLoginError('Connection error. Please check your network and try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([]);
    setLoginEmail('');
    setLoginPassword('');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;
    const userText = inputMessage.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setInputMessage('');
    setIsChatLoading(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendMessage', chatInput: userText, customer_id: user?.id || '' })
      });
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
      const responseText = await response.text();
      let reply: string;
      try {
        const parsed = JSON.parse(responseText);
        const responseData = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown>;
        reply = responseData.output as string || responseData.text as string || responseData.response as string || responseData.message as string || JSON.stringify(responseData);
      } catch {
        reply = responseText.trim();
      }
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', text: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const hint = msg.toLowerCase().includes('failed to fetch')
        ? 'CORS error: the browser blocked the n8n response. Configure CORS headers in your n8n webhook response node.'
        : msg;
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'system', text: `Error: ${hint}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ width: '100%', maxWidth: 400 }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{
                width: 56, height: 56,
                background: 'var(--accent)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(0,113,227,0.35)'
              }}>
                <Bot style={{ width: 28, height: 28, color: '#fff' }} />
              </div>
              <h1 style={{
                fontFamily: 'var(--display)',
                fontSize: '2.125rem',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-0.28px',
                color: 'var(--text)',
                margin: '0 0 8px'
              }}>
                JM20
              </h1>
              <p style={{ fontSize: '17px', color: 'var(--text-secondary)', margin: 0, letterSpacing: '-0.374px' }}>
                Agentic Customer Support
              </p>
            </div>

            {/* Form card */}
            <div style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              boxShadow: 'var(--shadow-card)'
            }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    textTransform: 'uppercase'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '11px 14px',
                      fontSize: '17px',
                      letterSpacing: '-0.374px',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                    onFocus={e => { e.target.style.border = '1px solid var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'; }}
                    onBlur={e => { e.target.style.border = '1px solid var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    textTransform: 'uppercase'
                  }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '11px 14px',
                      fontSize: '17px',
                      letterSpacing: '-0.374px',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                    onFocus={e => { e.target.style.border = '1px solid var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'; }}
                    onBlur={e => { e.target.style.border = '1px solid var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <AnimatePresence>
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px',
                        background: 'rgba(255,69,58,0.1)',
                        border: '1px solid rgba(255,69,58,0.2)',
                        borderRadius: 'var(--radius)',
                        fontSize: '14px',
                        letterSpacing: '-0.224px',
                        color: 'var(--red)'
                      }}
                    >
                      <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    marginTop: 8,
                    width: '100%',
                    padding: '11px 15px',
                    background: loginLoading ? 'rgba(0,113,227,0.6)' : 'var(--accent)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius)',
                    border: 'none',
                    fontSize: '17px',
                    letterSpacing: '-0.374px',
                    fontWeight: 400,
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background 0.15s ease',
                    boxShadow: '0 4px 16px rgba(0,113,227,0.3)'
                  }}
                  onMouseEnter={e => { if (!loginLoading) (e.target as HTMLButtonElement).style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { if (!loginLoading) (e.target as HTMLButtonElement).style.background = 'var(--accent)'; }}
                >
                  {loginLoading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : null}
                  Sign In
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              width: '100%', maxWidth: 680,
              height: '82vh',
              display: 'flex', flexDirection: 'column',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            {/* Nav bar — Apple glass style */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px',
              height: 52,
              background: 'rgba(28,28,30,0.85)',
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32,
                  background: 'var(--accent)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot style={{ width: 17, height: 17, color: '#fff' }} />
                </div>
                <div>
                  <div style={{
                    fontFamily: 'var(--display)',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.28px',
                    color: 'var(--text)',
                    lineHeight: 1.1
                  }}>
                    JM20 Support
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                      {user.first_name} {user.last_name}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                <LogOut style={{ width: 15, height: 15 }} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1, overflowY: 'auto',
                padding: '24px 20px',
                display: 'flex', flexDirection: 'column', gap: 12,
                background: 'var(--bg)'
              }}
            >
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '82%',
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : m.role === 'system' ? '8px' : '18px 18px 18px 4px',
                    fontSize: '15px',
                    lineHeight: 1.47,
                    letterSpacing: '-0.224px',
                    ...(m.role === 'user'
                      ? { background: 'var(--accent)', color: '#ffffff', fontWeight: 400 }
                      : m.role === 'system'
                      ? { background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', color: 'var(--red)', fontSize: '13px', width: '100%', textAlign: 'center' as const }
                      : { background: 'var(--surface2)', color: 'var(--text)' }
                    )
                  }}>
                    {m.role === 'agent' ? renderMarkdown(m.text) : m.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'var(--surface2)',
                    display: 'flex', alignItems: 'center', gap: 5
                  }}>
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        style={{
                          width: 7, height: 7,
                          borderRadius: '50%',
                          background: 'var(--text-muted)',
                          display: 'inline-block',
                          animation: `bounce 1.2s ${delay}ms ease-in-out infinite`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              background: 'rgba(28,28,30,0.85)',
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              flexShrink: 0
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 6px 6px 14px',
              }}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Message…"
                  disabled={isChatLoading}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    letterSpacing: '-0.224px',
                    color: 'var(--text)',
                    padding: '6px 0',
                    opacity: isChatLoading ? 0.5 : 1
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !inputMessage.trim()}
                  style={{
                    width: 34, height: 34,
                    borderRadius: '50%',
                    border: 'none',
                    background: (!isChatLoading && inputMessage.trim()) ? 'var(--accent)' : 'var(--surface3)',
                    color: '#ffffff',
                    cursor: (!isChatLoading && inputMessage.trim()) ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s ease'
                  }}
                >
                  <Send style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        ::placeholder { color: rgba(255,255,255,0.3); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 3px; }
      `}</style>
    </div>
  );
}
