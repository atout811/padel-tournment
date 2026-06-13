import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../utils/authService';
import { GoogleIcon } from '../components/Icons';

export default function AuthScreen({ showAlert }) {
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const handleGoogle = async () => {
    try {
      setIsSaving(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      showAlert('Google Login Failed', error.message || 'Could not start Google login.');
      setIsSaving(false);
    }
  };

  const handleEmail = async (event) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      showAlert('Check Login', 'Enter an email and a password with at least 6 characters.');
      return;
    }

    try {
      setIsSaving(true);
      setNotice('');
      if (mode === 'signUp') {
        await signUpWithEmail({ email: email.trim(), password });
        setNotice('Check your email to confirm your account.');
      } else {
        await signInWithEmail({ email: email.trim(), password });
      }
    } catch (error) {
      console.error('Email auth error:', error);
      showAlert(mode === 'signUp' ? 'Signup Failed' : 'Login Failed', error.message || 'Could not continue.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#020D16] px-3 py-6 text-[#F7F8F7]">
      <main className="w-full max-w-md rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#07111B]/95 p-4 shadow-2xl shadow-[#020D16]/40">
        <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">Padel Night</p>
          <h1 className="mt-1 text-3xl font-black text-[#F7F8F7]">Sign in</h1>
        </section>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isSaving}
          className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-4 text-base font-black text-[#020D16] transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>

        <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-black uppercase tracking-wide text-[#8D99A6]">
          <span className="h-px bg-white/10" />
          <span>Email</span>
          <span className="h-px bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#0A141E] p-1">
          <AuthTab active={mode === 'signIn'} onClick={() => setMode('signIn')}>Login</AuthTab>
          <AuthTab active={mode === 'signUp'} onClick={() => setMode('signUp')}>Create</AuthTab>
        </div>

        <form onSubmit={handleEmail} className="mt-3 space-y-2">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-14 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-4 font-semibold text-[#F7F8F7] outline-none placeholder:text-[#8D99A6] focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20"
            placeholder="Email"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-14 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-4 font-semibold text-[#F7F8F7] outline-none placeholder:text-[#8D99A6] focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20"
            placeholder="Password"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          />
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-14 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-4 font-black text-[#F7F8F7] transition hover:bg-[#0D1823] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === 'signUp' ? 'Create Account' : 'Login'}
          </button>
        </form>

        {notice && <p className="mt-3 rounded-2xl bg-[#BEDC45]/14 px-3 py-2 text-sm font-bold text-[#BEDC45]">{notice}</p>}
      </main>
    </div>
  );
}

function AuthTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
        active ? 'bg-[#BEDC45] text-[#020D16]' : 'text-[#8D99A6] hover:bg-[#07111B] hover:text-[#F7F8F7]'
      }`}
    >
      {children}
    </button>
  );
}
