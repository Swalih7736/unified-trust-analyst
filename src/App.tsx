import React, { useState, useRef, useEffect } from 'react';
import {
  Shield, Upload, AlertTriangle, Search, FileText, Loader2, X,
  Camera, Video, Mic, ArrowRight, Terminal, Link as LinkIcon,
  QrCode, MessageSquare, Send, User, Bot, CheckCircle2, ShieldCheck,
  ShieldAlert, Fingerprint, Lock, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { analyzeContent, chatWithScamExpert } from './services/geminiService';

type AnalysisMode = 'media' | 'qr' | 'link' | 'chat' | null;
type AuthMode = 'login' | 'signup' | 'forgot';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const CyberText = ({ text, className }: { text: string; className?: string }) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);

  const handleHover = () => {
    if (isHovered) return;
    setIsHovered(true);
    let iterations = 0;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

    const interval = setInterval(() => {
      setDisplayText((prev) =>
        text
          .split("")
          .map((letter, index) => {
            if (letter === " ") return " ";
            if (index < iterations) {
              return text[index];
            }
            return letters[Math.floor(Math.random() * letters.length)];
          })
          .join("")
      );

      if (iterations >= text.length) {
        clearInterval(interval);
        setTimeout(() => setIsHovered(false), 500);
      }
      iterations += 1 / 2.5; // Controls the decryption speed
    }, 35);
  };

  return (
    <motion.h1
      onHoverStart={handleHover}
      onTap={handleHover}
      whileTap={{ scale: 0.95 }}
      className={cn("relative inline-block font-bold cursor-crosshair tracking-tight", className)}
      animate={{
        color: isHovered ? "#34d399" : "#ffffff",
        textShadow: isHovered ? "0px 0px 20px rgba(52,211,153,0.8), 0px 0px 5px rgba(52,211,153,0.5)" : "0px 0px 0px rgba(52,211,153,0)"
      }}
      transition={{ duration: 0.2 }}
    >
      <span className="opacity-0">{text}</span>
      <span className="absolute inset-0 top-0 left-0 whitespace-nowrap">{displayText}</span>
    </motion.h1>
  );
};

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // App State
  const [mode, setMode] = useState<AnalysisMode>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'model', content: "Hello! I am your Cyber Law & Scam Expert. Have you faced any scams like DeepSeek or phishing? Share your problem, and I can help you retrieve info, register a case simulation, or generate a legal complaint draft." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (analysisResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysisResult]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAnalysisResult(null);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAnalysis = async () => {
    if (!mode || mode === 'chat') return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      let result;
      if (mode === 'link') {
        if (!inputUrl.trim()) return;
        result = await analyzeContent(`URL to analyze: ${inputUrl}`, 'link');
        setInputUrl('');
      } else {
        if (!selectedFile) return;
        const base64 = await fileToBase64(selectedFile);
        result = await analyzeContent({ data: base64, mimeType: selectedFile.type }, mode);
        clearSelection();
      }
      setAnalysisResult(result);
    } catch (error: any) {
      setAnalysisResult(`0\nAnalysis Error\nConnection Failed\nError: ${error?.message || "Verify your connection and API Key."}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) resolve(base64String);
        else reject("Failed to convert file to base64");
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await chatWithScamExpert(userMessage, chatMessages);
      setChatMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', content: "I encountered an error connecting to the cyber response module. Please try again later." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getRiskColorClass = (p: number) => {
    if (p <= 20) return 'text-emerald-400';
    if (p <= 40) return 'text-green-400';
    if (p <= 60) return 'text-amber-400';
    if (p <= 80) return 'text-orange-500';
    return 'text-rose-500';
  };

  const getRiskBgClass = (p: number) => {
    if (p <= 20) return 'bg-emerald-400';
    if (p <= 40) return 'bg-green-400';
    if (p <= 60) return 'bg-amber-400';
    if (p <= 80) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  // Local Storage Database Initialization Wrapper
  const getUsersDB = () => {
    const db = localStorage.getItem('trust_analyst_users');
    if (db) return JSON.parse(db);
    // Initialize DB with default root admin
    const initialDb = [{ username: 'admin', password: 'admin123' }];
    localStorage.setItem('trust_analyst_users', JSON.stringify(initialDb));
    return initialDb;
  };

  const checkPasswordStrength = (pass: string) => {
    if (pass.length < 8) return "Password must be at least 8 characters.";
    if (!/\d/.test(pass)) return "Password must contain at least one number.";
    if (!/[A-Z]/.test(pass)) return "Password must contain an uppercase letter.";
    return null;
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const usersDb = getUsersDB();

    if (authMode === 'login') {
      // Database Login Validation
      const user = usersDb.find((u: any) => u.username === username);
      if (user && user.password === password) {
        setIsAuthenticated(true);
      } else {
        setAuthError('Invalid credentials. Access denied.');
      }
    } else if (authMode === 'signup') {
      // Signup flow & Password Validation
      if (username.length < 3) {
        setAuthError('Agent ID must be at least 3 characters.');
        return;
      }

      const strengthError = checkPasswordStrength(password);
      if (strengthError) {
        setAuthError(strengthError);
        return;
      }

      if (usersDb.some((u: any) => u.username === username)) {
        setAuthError('This Agent ID is already registered in the database.');
        return;
      }

      // Save new user to DataBase
      usersDb.push({ username, password });
      localStorage.setItem('trust_analyst_users', JSON.stringify(usersDb));
      setIsAuthenticated(true);
    } else if (authMode === 'forgot') {
      // Forgot Password / Reset Flow
      if (username.length < 3) {
        setAuthError('Please provide your registered Agent ID.');
        return;
      }

      const userIndex = usersDb.findIndex((u: any) => u.username === username);
      if (userIndex === -1) {
        setAuthError('No matching Agent ID found in the database.');
        return;
      }

      const strengthError = checkPasswordStrength(password);
      if (strengthError) {
        setAuthError(strengthError);
        return;
      }

      // Update Password
      usersDb[userIndex].password = password;
      localStorage.setItem('trust_analyst_users', JSON.stringify(usersDb));

      setAuthSuccess('Passcode successfully reset. You may now log in.');
      setAuthMode('login');
      setPassword('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden flex flex-col lg:flex-row">
        {/* === LEFT BRANDING PANEL (Enterprise Look) === */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 lg:p-20 border-r border-slate-800/60 overflow-hidden bg-slate-900/30">
          <div className="absolute inset-0 technical-grid opacity-30" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/10" />
          <div className="absolute -left-[20%] top-[20%] w-[500px] h-[500px] bg-blue-500/20 blur-[130px] rounded-full point-events-none" />

          <div className="relative z-10 flex flex-col items-start gap-8">
            <div className="w-16 h-16 bg-slate-950/80 border border-slate-700/60 rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-emerald-400/20 opacity-80" />
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 relative z-10">
                <path d="M12 3v18M8 21h8" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M6 7h12" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M6 7l-2 5.5c0 1.5 4 1.5 4 0L6 7z" fill="rgba(203,213,225,0.1)" stroke="#cbd5e1" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="18" cy="12.5" r="3.2" stroke="#34d399" strokeWidth="1.5" fill="rgba(52,211,153,0.15)" />
                <path d="M20.2 14.7l1.8 1.8" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>

            <div className="space-y-4">
              <CyberText text="TRUST ANALYST" className="text-5xl lg:text-6xl tracking-tight leading-tight" />
              <p className="text-slate-400 text-lg md:text-xl max-w-lg leading-relaxed font-light">
                Advanced digital forensics and cyber verification. Secure your organization against next-generation threats, deepfakes, and phishing networks.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex gap-6">
            <div className="border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl w-full max-w-sm hover:border-blue-500/30 transition-colors group">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-semibold text-sm tracking-wide uppercase">Military-Grade Subnet</h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">Active monitoring is engaged. Authentication protocols strictly verified via zero-trust architecture.</p>
            </div>
          </div>
        </div>

        {/* === RIGHT FORM PANEL === */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative min-h-screen lg:min-h-0 bg-slate-950">
          {/* Mobile Backdrops */}
          <div className="lg:hidden absolute top-1/4 left-0 w-[400px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full point-events-none opacity-50" />
          <div className="lg:hidden absolute bottom-1/4 right-0 w-[400px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full point-events-none opacity-40" />

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md relative z-10"
          >
            {/* Mobile Logo Header */}
            <div className="lg:hidden text-center mb-10">
              <div className="w-14 h-14 bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-400/10 opacity-60" />
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 relative z-10">
                  <path d="M12 3v18M8 21h8" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 7h12" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 7l-2 5.5c0 1.5 4 1.5 4 0L6 7z" fill="rgba(203,213,225,0.1)" stroke="#cbd5e1" strokeWidth="1.2" strokeLinejoin="round" />
                  <circle cx="18" cy="12.5" r="3.2" stroke="#34d399" strokeWidth="1.5" fill="rgba(52,211,153,0.15)" />
                  <path d="M20.2 14.7l1.8 1.8" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </div>
              <CyberText text="TRUST ANALYST" className="text-3xl tracking-tight mb-2" />
              <p className="text-slate-400 text-sm font-medium">Restricted Access Module</p>
            </div>

            <div className="mb-10 text-center lg:text-left">
              {authMode === 'forgot' && (
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                  className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-sm font-semibold mx-auto lg:mx-0"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Login
                </button>
              )}

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-[Outfit]">
                {authMode === 'login' ? 'Authentication Required' : authMode === 'signup' ? 'Initialize Access' : 'Reset Passcode'}
              </h2>
              <p className="text-slate-400 text-sm">
                {authMode === 'login'
                  ? 'Verify credentials to access the forensic dashboard.'
                  : authMode === 'signup' ? 'Register a unique Agent ID.' : 'Establish a new passcode for your Agent ID.'}
              </p>
            </div>

            {authMode !== 'forgot' && (
              <div className="flex bg-slate-900/60 p-1.5 rounded-2xl mb-8 border border-slate-800/50 shadow-inner">
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                  className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all", authMode === 'login' ? "bg-slate-800 text-white shadow-md border-t border-slate-700/50" : "text-slate-400 hover:text-slate-300")}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                  className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all", authMode === 'signup' ? "bg-slate-800 text-white shadow-md border-t border-slate-700/50" : "text-slate-400 hover:text-slate-300")}
                >
                  Sign Up
                </button>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Agent ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400">
                    <User className="w-[18px] h-[18px] text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800/80 rounded-2xl py-4 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 font-medium"
                    placeholder="Enter your system ID"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                  {authMode === 'forgot' ? 'New Passcode' : 'Passcode'}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400">
                    <Lock className="w-[18px] h-[18px] text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800/80 rounded-2xl py-4 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 font-medium tracking-widest"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="text-rose-400 text-xs font-medium bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex items-start gap-2 mt-4">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{authError}</p>
                    </div>
                  </motion.div>
                )}

                {authSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-start gap-2 mt-4">
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{authSuccess}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-700 active:to-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-8 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-blue-400/20 tracking-wide"
              >
                {authMode === 'login' ? 'Confirm Identity' : authMode === 'signup' ? 'Establish Access' : 'Change Passcode'}
              </button>
            </form>

            {authMode === 'login' && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); setUsername(''); setPassword(''); }}
                  className="text-slate-400 text-xs md:text-sm font-medium hover:text-blue-400 transition-colors"
                >
                  Forgot your Passcode?
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden technical-grid">
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full point-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[400px] md:w-[600px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full point-events-none opacity-40" />

      {/* Logout Header Button */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/50 border border-slate-800/80 px-4 py-2 rounded-full backdrop-blur-md transition-colors shadow-lg"
        >
          Sign Out
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center p-4 md:p-8 min-h-screen max-w-5xl mx-auto">

        {/* Header */}
        <header className="w-full text-center mt-4 md:mt-8 mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 md:p-4 rounded-[2rem] bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl mb-6 relative overflow-hidden group"
          >
            {/* Subtle background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            {/* Elite Custom Logo */}
            <div className="relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 shrink-0 z-10">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-emerald-400/20 transition-colors duration-700" />
              <div className="relative w-full h-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 rounded-[1.1rem] md:rounded-[1.3rem] shadow-xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-400/10 opacity-60" />

                <svg viewBox="0 0 24 24" fill="none" className="w-[1.65rem] h-[1.65rem] md:w-[2.15rem] md:h-[2.15rem] relative z-10">
                  {/* Balance / Scale Stand */}
                  <path d="M12 3v18M8 21h8" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" className="drop-shadow-[0_0_2px_rgba(203,213,225,0.3)]" />
                  <path d="M6 7h12" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Left Bowl */}
                  <path d="M6 7l-2 5.5c0 1.5 4 1.5 4 0L6 7z" fill="rgba(203,213,225,0.1)" stroke="#cbd5e1" strokeWidth="1.2" strokeLinejoin="round" />

                  {/* Right Lens (The Lens focusing Legal Truth) */}
                  <circle cx="18" cy="12.5" r="3.2" stroke="#34d399" strokeWidth="1.5" fill="rgba(52,211,153,0.15)" className="drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                  <path d="M20.2 14.7l1.8 1.8" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" className="drop-shadow-[0_0_2px_rgba(52,211,153,0.5)]" />
                </svg>
              </div>
            </div>

            <div className="ml-4 md:ml-6 text-left pr-4 md:pr-8 relative z-10 flex flex-col items-start justify-center">
              <CyberText text="TRUST ANALYST" className="text-xl md:text-3xl font-[Outfit] relative z-10" />
              <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">Digital Forensics & Verification</p>
            </div>
          </motion.div>
        </header>

        <main className="w-full max-w-3xl flex flex-col items-center">
          {!mode ? (
            <div className="w-full max-w-2xl animate-fade-in mt-4 md:mt-8">
              <div className="text-center mb-10 md:mb-12">
                <h2 className="text-2xl md:text-3xl font-bold font-[Outfit] text-white mb-3">Select Analysis Module</h2>
                <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">Choose the type of digital forensic audit you want to perform on your artifacts.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                {[
                  { id: 'media', icon: Camera, title: 'Media Forensics', desc: 'Detect deepfakes and AI modifications in images or video.' },
                  { id: 'qr', icon: QrCode, title: 'QR Code Audit', desc: 'Analyze QR codes for phishing and payment manipulation.' },
                  { id: 'link', icon: LinkIcon, title: 'Web Link Scanner', desc: 'Audit URLs for typo-squatting and suspicious domains.' },
                  { id: 'chat', icon: MessageSquare, title: 'Legal Expert', desc: 'Consult on cyber law, IT Act 2000, and scam protocols.' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setMode(item.id as AnalysisMode); setAnalysisResult(null); }}
                    className="group flex flex-col items-start gap-3 p-5 md:p-6 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-[1.5rem] transition-all duration-300 text-left relative overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(52,211,153,0.1)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-950 border border-slate-700/80 group-hover:border-emerald-500/40 flex items-center justify-center shrink-0 mb-1 shadow-inner relative z-10">
                      <item.icon className="w-5 h-5 md:w-6 md:h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-base md:text-lg font-bold text-slate-100 mb-1.5 font-[Outfit]">{item.title}</h3>
                      <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full flex flex-col"
            >
              <button
                onClick={() => { setMode(null); setAnalysisResult(null); clearSelection(); setInputUrl(''); }}
                className="group flex items-center gap-2.5 text-slate-400 hover:text-white mb-6 transition-colors text-sm font-semibold w-fit mx-auto md:mx-0"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-slate-600 transition-colors shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </div>
                Back to Modules
              </button>

              <div className="w-full glass-panel rounded-[2rem] overflow-hidden shadow-2xl">
                {mode === 'chat' ? (
                  <div className="flex flex-col h-[600px] bg-slate-900/40">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar scroll-smooth">
                      {chatMessages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex gap-3 md:gap-4 max-w-[90%] md:max-w-[85%]",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                            msg.role === 'user'
                              ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                              : "bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-400"
                          )}>
                            {msg.role === 'user' ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
                          </div>
                          <div className={cn(
                            "p-4 md:p-5 shadow-sm text-sm leading-relaxed",
                            msg.role === 'user'
                              ? "bg-blue-600 text-white font-medium rounded-2xl md:rounded-3xl rounded-tr-sm"
                              : "bg-slate-800/80 backdrop-blur-md text-slate-200 border border-slate-700/50 rounded-2xl md:rounded-3xl rounded-tl-sm"
                          )}>
                            <div className="markdown-body">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {isChatLoading && (
                        <div className="flex gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-emerald-400" />
                          </div>
                          <div className="bg-slate-800/80 rounded-2xl md:rounded-3xl rounded-tl-sm border border-slate-700/50 p-4 px-5 flex items-center">
                            <span className="flex gap-1.5">
                              <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                              <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                              <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            </span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} className="h-4" />
                    </div>

                    <form onSubmit={handleChatSubmit} className="p-3 md:p-4 bg-slate-900/80 border-t border-slate-800 backdrop-blur-xl">
                      <div className="relative flex items-center max-w-4xl mx-auto">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Discuss incidents, ask about IT Act 2000..."
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl py-4 flex-1 pl-4 md:pl-6 pr-14 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-500 shadow-inner"
                        />
                        <button
                          type="submit"
                          disabled={isChatLoading || !chatInput.trim()}
                          className="absolute right-2 md:right-3 p-2 bg-blue-600 text-white rounded-lg md:rounded-xl shadow-lg hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
                        >
                          <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="p-6 md:p-10">
                    {mode === 'link' ? (
                      <div className="space-y-6 max-w-xl mx-auto py-8">
                        <div className="text-center space-y-2 mb-8">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                            <LinkIcon className="w-8 h-8 text-blue-400" />
                          </div>
                          <h3 className="text-xl font-[Outfit] font-semibold text-white">URL Security Analysis</h3>
                          <p className="text-slate-400 text-sm">Detect phishing, typo-squatting, and malicious domains.</p>
                        </div>

                        <div className="relative">
                          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Lock className="w-5 h-5 text-slate-500" />
                          </div>
                          <input
                            type="url"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-base text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 shadow-inner"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2 px-2">
                          <h3 className="text-lg font-[Outfit] font-semibold text-white">
                            {mode === 'media' ? 'Media Analysis' : 'QR Intent Check'}
                          </h3>
                          <span className="text-[10px] md:text-xs font-semibold px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700/50">
                            {mode === 'media' ? 'Image/Video/Audio' : 'Images only'}
                          </span>
                        </div>

                        <div
                          onClick={() => !previewUrl && fileInputRef.current?.click()}
                          className={cn(
                            "group relative border-2 border-dashed rounded-[2rem] transition-all cursor-pointer overflow-hidden",
                            previewUrl
                              ? "border-transparent bg-slate-900/50"
                              : "border-slate-700/60 hover:border-blue-500/40 hover:bg-slate-800/30 bg-slate-900/20 h-64 md:h-72 flex flex-col items-center justify-center"
                          )}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept={mode === 'media' ? "image/*,video/*,audio/*" : "image/*"}
                          />

                          {previewUrl ? (
                            <div className="relative aspect-[4/3] md:aspect-[16/9] w-full max-h-[400px]">
                              {selectedFile?.type.startsWith('image/') ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-black/40 backdrop-blur-sm" />
                              ) : selectedFile?.type.startsWith('video/') ? (
                                <video src={previewUrl} controls className="w-full h-full object-contain bg-black/40 backdrop-blur-sm" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80">
                                  <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
                                    <Mic className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                                  </div>
                                  <span className="text-xs md:text-sm font-medium text-slate-200 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 truncate max-w-[80%]">{selectedFile?.name}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                                <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-md text-sm border border-white/10">Click to change file</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                                className="absolute top-4 right-4 p-2 md:p-2.5 bg-slate-900/80 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all backdrop-blur-xl shadow-lg border border-slate-700/50"
                              >
                                <X className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-4 md:gap-6 px-4 md:px-10 text-center">
                              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-950 border border-slate-800 rounded-2xl md:rounded-3xl flex items-center justify-center md:group-hover:scale-110 md:group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 shadow-xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                {mode === 'qr' ? <QrCode className="w-8 h-8 md:w-10 md:h-10 text-blue-400 relative z-10" /> : <Upload className="w-8 h-8 md:w-10 md:h-10 text-blue-400 relative z-10" />}
                              </div>
                              <div>
                                <p className="text-slate-200 font-semibold text-base md:text-lg mb-1">Upload forensic artifact</p>
                                <p className="text-slate-500 text-xs md:text-sm">Drag and drop or tap to browse</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 pt-8 border-t border-slate-800/60 max-w-xl mx-auto">
                      <button
                        onClick={runAnalysis}
                        disabled={isAnalyzing || (mode === 'link' ? !inputUrl.trim() : !selectedFile)}
                        className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:hover:bg-blue-600 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analyzing with Neural Net...</span>
                          </>
                        ) : (
                          <>
                            <Fingerprint className="w-5 h-5" />
                            <span>Run Forensic Analysis</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </main>

        {/* Results Area */}
        <div ref={resultsRef} className="w-full max-w-3xl mt-8 pb-20">
          <AnimatePresence mode="wait">
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="glass-panel overflow-hidden rounded-[2rem] relative"
              >
                {/* Background glow specific to result */}
                {(() => {
                  const lines = analysisResult.split('\n').filter(l => l.trim());
                  const percentageStr = lines[0]?.replace('%', '') || "0";
                  const percentage = parseInt(percentageStr) || 0;
                  const threatClass = lines[1] || 'Unknown';
                  const redFlag = lines[2] || 'No specific artifacts detected.';
                  const action = lines[3] || 'No action required.';

                  const riskColorClass = getRiskColorClass(percentage);
                  const riskBgClass = getRiskBgClass(percentage);
                  const isSafe = percentage <= 20;

                  return (
                    <div className="relative z-10">
                      <div className="p-6 md:p-8 border-b border-slate-800/80 bg-slate-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">

                        {/* Status glowing accent corner */}
                        <div className={`absolute -top-10 -right-10 w-32 h-32 md:w-40 md:h-40 ${riskBgClass} blur-[60px] md:blur-[80px] opacity-20`} />

                        <div>
                          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Threat Probability</p>
                          <div className="flex items-end gap-3">
                            <h2 className={`text-5xl md:text-6xl font-bold font-[Outfit] tracking-tighter ${riskColorClass}`}>{percentage}%</h2>
                            <div className="pb-1 md:pb-1.5 flex items-center gap-1.5 opacity-80">
                              {isSafe ? <ShieldCheck className={`w-5 h-5 md:w-6 md:h-6 ${riskColorClass}`} /> : <ShieldAlert className={`w-5 h-5 md:w-6 md:h-6 ${riskColorClass}`} />}
                            </div>
                          </div>
                        </div>

                        <div className="w-full md:w-48 xl:w-64 space-y-2">
                          <div className="flex justify-between text-[10px] md:text-xs font-medium text-slate-400 mb-1 px-1">
                            <span>Safe</span>
                            <span>Critical</span>
                          </div>
                          <div className="w-full h-2.5 md:h-3 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-slate-800/50">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={cn("h-full transition-all duration-1000 ease-out relative", riskBgClass)}
                            >
                              <div className="absolute inset-0 bg-white/20 w-full animate-pulse" />
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 relative">
                        <div className="md:col-span-4 space-y-2 relative z-10">
                          <div className="inline-flex items-center gap-2 text-slate-400 mb-1">
                            <Terminal className="w-4 h-4 opacity-70" />
                            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-widest">Identified Class</p>
                          </div>

                          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            {threatClass.includes('|') ? (
                              <div className="flex flex-col gap-1.5">
                                <span className={cn("font-bold text-sm md:text-base", riskColorClass)}>{threatClass.split('|')[0].trim()}</span>
                                <span className="text-xs md:text-sm text-slate-300 font-medium">{threatClass.split('|')[1]?.trim()}</span>
                                {threatClass.split('|')[2] && (
                                  <span className="text-[10px] md:text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded inline-block mt-1 w-fit border border-slate-800 break-all">
                                    {threatClass.split('|')[2].trim()}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-semibold text-slate-200 text-sm md:text-base">{threatClass}</span>
                            )}
                          </div>
                        </div>

                        <div className="md:col-span-8 space-y-2 relative z-10">
                          <div className="inline-flex items-center gap-2 text-slate-400 mb-1">
                            <Search className="w-4 h-4 opacity-70" />
                            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-widest">Forensic Breakdown</p>
                          </div>

                          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-5 h-[calc(100%-1.75rem)]">
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
                              {redFlag}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        "p-5 md:p-6 px-6 md:px-8 border-t flex items-start md:items-center gap-4 relative z-10",
                        isSafe ? "bg-emerald-500/5 border-emerald-500/10" : "bg-blue-500/5 border-blue-500/10"
                      )}>
                        <div className={cn(
                          "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner border mt-1 md:mt-0",
                          isSafe ? "bg-emerald-500/10 border-emerald-500/20" : "bg-blue-500/10 border-blue-500/20"
                        )}>
                          <ArrowRight className={cn("w-4 h-4 md:w-5 md:h-5", isSafe ? "text-emerald-400" : "text-blue-400")} />
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-[10px] uppercase font-bold tracking-widest mb-1",
                            isSafe ? "text-emerald-400/70" : "text-blue-400/70"
                          )}>Recommended Protocol</p>
                          <p className="text-slate-200 font-medium text-sm md:text-[15px]">{action}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
