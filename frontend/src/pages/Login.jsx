import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? { email, password, name } : { email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    }
  };

  const autoFill = () => {
    setEmail('demo@dreamjournal.com');
    setPassword('demo1234');
    setName('Dream Explorer');
    setIsRegister(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>AI Dream Journal</h1>
        <p className="subtitle">Unlock the secrets of your subconscious</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          <button type="submit" className="btn btn-primary">
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button className="auto-fill-btn" onClick={autoFill}>
          Quick Login - Auto-fill Demo Credentials
        </button>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#94a3b8' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span
            style={{ color: '#a5b4fc', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}
