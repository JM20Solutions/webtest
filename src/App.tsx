import React, { useState, useRef, useEffect } from 'react';
import {
  Send, LogIn, LogOut, Lock, Mail,
  AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// CONFIG
const SUPABASE_URL = 'https://wiavnyuchdsfztzhvaua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYXZueXVjaGRzZnp0emh2YXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDI2ODQsImV4cCI6MjA4NjU3ODY4NH0.dXz7vyFglA_lihma__rbtBT8afZZ1YUJEkAmqpFOL6c';
const N8N_WEBHOOK_URL = 'https://gpixie.app.n8n.cloud/webhook/dcf09b4f-67fb-4bc6-a50c-9fb9fffacd01';

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
            {/* HEADER */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                {/* LOGO */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, #f5a623, #b87a1a)'
                  }}
                >
                  <div className="w-3 h-3 rounded-full bg-black" />
                </div>

                {/* TEXT */}
                <div>
                  <div className="text-lg font-bold">JM20</div>
                  <div className="text-xs text-gray-400">
                    Agentic Customer Support Services
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-semibold">Login</h2>
              </div>
            </div>

            {/* FORM */}
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
                {loginLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <LogIn />
                )}
                Login
              </button>
            </form>
          </motion.div>
        ) : (
          <div className="text-white">Logged in</div>
        )}
      </AnimatePresence>
    </div>
  );
}
