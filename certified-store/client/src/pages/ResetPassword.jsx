import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, useToast } from '../lib/store.jsx';

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const { setUser } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('Password must be at least 8 characters.');
    if (pw !== pw2) return setErr('Passwords do not match.');
    try {
      const d = await api.post('/auth/reset', { token: sp.get('token'), password: pw });
      setUser(d.user);
      toast('Password saved – you are logged in.');
      nav('/account');
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <div className="container pad-y narrow">
      <form className="card pad auth-form" onSubmit={submit}>
        <h2>Choose a new password</h2>
        {err && <div className="alert alert-red">{err}</div>}
        <label className="field"><span>New password (8+ characters)</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></label>
        <label className="field"><span>Confirm new password</span><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required /></label>
        <button className="btn btn-primary btn-block">Save password</button>
      </form>
    </div>
  );
}
