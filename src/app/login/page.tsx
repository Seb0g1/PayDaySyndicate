"use client";
import { FormEvent, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLoading } from "@/components/LoadingProvider";
import { useError } from "@/components/ErrorProvider";

export default function LoginPage() {
  const router = useRouter();
  const { start, stop } = useLoading();
  const { showError } = useError();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState<Array<{ left: number; top: number; duration: number }>>([]);

  // Generate dots only on client side to avoid hydration mismatch
  useEffect(() => {
    setDots([...Array(20)].map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 2
    })));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    start();
    const res = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      stop();
      showError("Неверный логин или пароль");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #000000 50%, #0a0a0a 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Cyber patterns background */}
      <div className="absolute inset-0 opacity-5">
        {dots.map((dot, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: '#ff0000',
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            animation: `glow ${dot.duration}s infinite alternate`,
            boxShadow: '0 0 10px #ff0000'
          }} />
        ))}
      </div>
      
      {/* Floating icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['💻', '⚡', '🖥️', '⚡', '💻', '🖥️'].map((icon, i) => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: '60px',
            opacity: 0.03,
            left: `${20 + i * 15}%`,
            top: `${10 + (i % 3) * 30}%`,
            animation: `float ${8 + i * 2}s infinite ease-in-out`,
            transform: `rotate(${i * 30}deg)`
          }}>{icon}</div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-red-500 rounded-xl bg-gradient-to-br from-red-500/20 to-red-900/20 mb-4">
              <div className="text-red-500 font-bold text-2xl">PS</div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">PAYDAY SYNDICATE</h1>
            <p className="text-gray-400">Система управления</p>
          </div>
          
          <div className="modal-panel p-8">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="#ff0000" strokeWidth="2" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#ff0000" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              
              <div>
                <label className="block text-xs mb-2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Логин</label>
                <div className="relative">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z" />
                  </svg>
                  <input 
                    className="border rounded-lg px-3 py-3 w-full pl-10" 
                    placeholder="Введите логин" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    autoComplete="off" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs mb-2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Пароль</label>
                <div className="relative">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                  <input 
                    className="border rounded-lg px-3 py-3 w-full pl-10" 
                    type="password" 
                    placeholder="Введите пароль" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
              </div>
              
              <button 
                className="btn-primary w-full py-3 text-lg font-semibold" 
                disabled={loading}
              >
                {loading ? "Входим..." : "ВОЙТИ"}
              </button>
            </form>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            2025 for <span className="text-red-500 font-semibold">PAYDAY SYNDICATE</span>
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Site by{' '}
            <a 
              href="https://t.me/seb0g1site" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 transition-colors inline-flex items-center gap-1"
            >
              Seb0g1 ❤️
            </a>
          </p>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}


