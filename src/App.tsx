import React, { useState, useRef, useEffect } from 'react';
import {
  Send, LogIn, LogOut, Lock, Mail,
  Sparkles, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── CONFIG ──
const SUPABASE_URL = 'https://wiavnyuchdsfztzhvaua.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_KEY';
const N8N_WEBHOOK_URL = 'YOUR_WEBHOOK';

// ── TYPES ──
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

// ── COMPONENT ──
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
  }, [messages]);

  // ── LOGIN ──
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Enter email & password');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?email=eq.${loginEmail}&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      const data = await res.json();

      if (!data.length) {
        setLoginError('User not found');
      } else if (data[0].password !== loginPassword) {
        setLoginError('Wrong password');
      } else {
        setUser(data[0]);
        setMessages([
          {
            id: '1',
            role: 'agent',
            text: `Welcome ${data[0].first_name}`
          }
        ]);
      }
    } catch {
      setLoginError('Connection error');
    }

    setLoginLoading(false);
  };

  // ── SEND MESSAGE ──
  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const msg = inputMessage;
    setInputMessage('');

    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: msg }
    ]);

    setIsChatLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: msg })
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'agent',
          text: data.output || 'No response'
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'system', text: 'Error' }
      ]);
    }

    setIsChatLoading(false);
  };

  // ── UI ──
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 text-white"
      style={{
        background:
          'radial-gradient(circle at 20% 20%, #0f172a, #020617)'
      }}
    >
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md p-10 rounded-3xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
           <div className="mb-8 text-center">
  {/* Logo + Brand */}
  <div className="flex items-center justify-center gap-3 mb-4">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #f5a623, #b87a1a)',
        boxShadow: '0 4px 20px rgba(245,166,35,0.4)'
      }}
    >
      <Sparkles className="w-5 h-5 text-black" />
    </div>

    <div className="text-left">
      <div className="text-lg font-bold">
        JM20 <span style={{ color: '#f5a623' }}>Agentic</span>
      </div>
      <div className="text-xs text-gray-400 leading-tight">
        Customer Support Services
      </div>
    </div>
  </div>

  {/* Login Title */}
  <h2 className="text-lg font-semibold text-white">
    Login
  </h2>
</div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                className="w-full p-3 rounded-lg bg-black/30"
                placeholder="Email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />

              <input
                type="password"
                className="w-full p-3 rounded-lg bg-black/30"
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />

              {loginError && (
                <div className="text-red-400 text-sm flex gap-2">
                  <AlertCircle /> {loginError}
                </div>
              )}

              <button
                className="w-full p-3 rounded-lg font-bold flex justify-center gap-2"
                style={{
                  background:
                    'linear-gradient(135deg, #f5a623, #b87a1a)'
                }}
              >
                {loginLoading ? <Loader2 className="animate-spin" /> : <LogIn />}
                Login
              </button>
            </form>
          </motion.div>
        ) : (
          <div
            className="w-full max-w-2xl h-[80vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {/* HEADER */}
            <div className="p-4 flex justify-between items-center border-b border-white/10">
              <div className="flex gap-2 items-center">
                <Sparkles /> {user.first_name}
              </div>
              <button onClick={() => setUser(null)}>
                <LogOut />
              </button>
            </div>

            {/* CHAT */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}
                >
                  <div
                    className="p-3 rounded-xl max-w-[75%]"
                    style={
                      m.role === 'user'
                        ? {
                            background:
                              'linear-gradient(135deg, #f5a623, #b87a1a)'
                          }
                        : {
                            background: 'rgba(255,255,255,0.05)'
                          }
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {isChatLoading && <Loader2 className="animate-spin" />}
            </div>

            {/* INPUT */}
            <div className="p-4 flex gap-2 border-t border-white/10">
              <input
                className="flex-1 p-3 rounded-lg bg-black/30"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                className="p-3 rounded-lg"
                style={{
                  background:
                    'linear-gradient(135deg, #f5a623, #b87a1a)'
                }}
              >
                <Send />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
