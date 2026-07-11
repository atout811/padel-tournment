import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../utils/authService';
import { GoogleIcon } from '../components/Icons';
import { Button, InlineNotice, TextInput } from '../components/Ui.jsx';
import { useI18n } from '../i18n/useI18n.js';

export default function AuthScreen({ showAlert }) {
  const { t } = useI18n();
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
      showAlert(t('auth.googleFailedTitle'), error.message || t('auth.googleFailedMessage'));
      setIsSaving(false);
    }
  };

  const handleEmail = async (event) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      showAlert(t('auth.checkLoginTitle'), t('auth.checkLoginMessage'));
      return;
    }

    try {
      setIsSaving(true);
      setNotice('');
      if (mode === 'signUp') {
        await signUpWithEmail({ email: email.trim(), password });
        setNotice(t('auth.confirmEmail'));
      } else {
        await signInWithEmail({ email: email.trim(), password });
      }
    } catch (error) {
      console.error('Email auth error:', error);
      showAlert(mode === 'signUp' ? t('auth.signupFailed') : t('auth.loginFailed'), error.message || t('auth.continueFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-club-bg px-4 py-6 text-club-ink">
      <main className="w-full max-w-md rounded-lg border border-club-border bg-club-surface p-4">
        <section className="pb-2">
          <p className="text-xs font-black uppercase tracking-wide text-club-muted">{t('app.name')}</p>
          <h1 className="mt-1 text-3xl font-black leading-tight text-club-ink">{t('auth.signInTitle')}</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-club-muted">{t('auth.detail')}</p>
        </section>

        <Button
          onClick={handleGoogle}
          disabled={isSaving}
          className="mt-4 w-full"
          size="lg"
        >
          <GoogleIcon className="h-5 w-5" />
          {t('auth.continueWithGoogle')}
        </Button>

        <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-black uppercase tracking-wide text-club-muted">
          <span className="h-px bg-white/10" />
          <span>{t('auth.email')}</span>
          <span className="h-px bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-club-wash p-1">
          <AuthTab active={mode === 'signIn'} onClick={() => setMode('signIn')}>{t('auth.login')}</AuthTab>
          <AuthTab active={mode === 'signUp'} onClick={() => setMode('signUp')}>{t('auth.create')}</AuthTab>
        </div>

        <form onSubmit={handleEmail} className="mt-3 space-y-2">
          <TextInput
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('auth.email')}
            autoComplete="email"
          />
          <TextInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('auth.password')}
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          />
          <Button
            type="submit"
            tone="secondary"
            disabled={isSaving}
            className="w-full"
            size="lg"
          >
            {mode === 'signUp' ? t('auth.createAccount') : t('auth.login')}
          </Button>
        </form>

        {notice && <InlineNotice tone="green" className="mt-3">{notice}</InlineNotice>}
      </main>
    </div>
  );
}

function AuthTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-md px-3 text-sm font-black transition ${
        active ? 'bg-club-green text-club-greenDeep' : 'text-club-muted hover:bg-club-soft hover:text-club-ink'
      }`}
    >
      {children}
    </button>
  );
}
