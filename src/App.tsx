import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Send, LogIn, LogOut, User, Lock, Mail, 
  Sparkles, Shield, AlertCircle, Loader2, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── CONFIGURATION ──
// 1. Put your Supabase URL and Anon Key here
const SUPABASE_URL = 'https://wiavnyuchdsfztzhvaua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYXZueXVjaGRzZnp0emh2YXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDI2ODQsImV4cCI6MjA4NjU3ODY4NH0.dXz7vyFglA_lihma__rbtBT8afZZ1YUJEkAmqpFOL6c';

// 2. Put your n8n Webhook URL here
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

// ── SIMPLE MARKDOWN RENDERER ──
function renderMarkdown(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pIdx) => {
    const lines = para.split(/\n/);
    const isList = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim() === '');

    if (isList) {
      const items = lines.filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
      return (
        <ul key={pIdx} className="list-none space-y-1.5 my-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="text-indigo-500 mt-1 shrink-0">•</span>
              <span>{applyInlineFormatting(item.replace(/^[-*]\s*/, ''))}</span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
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
      return <strong key={i} className="font-semibold text-indigo-900">{part.slice(2, -2)}</strong>;
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
        { 
          headers: { 
            'apikey': SUPABASE_ANON_KEY, 
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}` 
          } 
        }
      );
      
      const data = await res.json();

      if (data.length === 0) {
        setLoginError('Account not found.');
      } else if (data[0].password !== loginPassword) {
        setLoginError('Incorrect password.');
      } else {
        const { password: _, ...userData } = data[0];
        setUser(userData);
        setMessages([{ 
          id: 'welcome', 
          role: 'agent', 
          text: `Hello ${userData.first_name}! How can I help you today?` 
        }]);
      }
    } catch (err) {
      setLoginError('Connection error. Please check your Supabase URL and Key.');
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
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          chatInput: userText,
          customer_id: user?.id || ''
        })
      });

      const data = await response.json();
      const reply = data.output || data.text || data.response || data.message || JSON.stringify(data);

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'system',
        text: 'Error connecting to n8n. Please check your webhook URL.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-16 -translate-y-16" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-indigo-200" />
                  <h1 className="text-2xl font-bold tracking-tight">Secure Portal</h1>
                </div>
                <p className="text-indigo-100/80 text-sm">Sign in to access the n8n agent</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Email Address</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="flex-grow bg-transparent border-none text-sm outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Password</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="flex-grow bg-transparent border-none text-sm outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {loginError}
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={loginLoading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Sign In
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl h-[80vh] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-none">n8n Agent</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Connected as {user.first_name}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-3 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
            >
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-5 py-3 text-sm leading-relaxed rounded-2xl ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                      : m.role === 'system'
                      ? 'bg-red-50 text-red-700 border border-red-100 w-full text-center italic text-xs'
                      : 'bg-white text-slate-700 rounded-tl-none border border-slate-200 shadow-sm'
                  }`}>
                    {m.role === 'agent' ? renderMarkdown(m.text) : m.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-tl-none px-6 py-4 border border-slate-200 shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100">
              <div className="flex items-center gap-3 bg-slate-100 rounded-2xl p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  disabled={isChatLoading}
                  className="flex-grow bg-transparent border-none py-3 px-4 text-sm outline-none disabled:opacity-50"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !inputMessage.trim()}
                  className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all shrink-0 disabled:opacity-40"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
