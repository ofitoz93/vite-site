import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else alert('Giriş başarılı!');
  };

  return (
    <div
      style={{ padding: '20px', border: '1px solid #ccc', marginTop: '20px' }}
    >
      <h2>Giriş Yap</h2>
      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: '10px', padding: '8px' }}
      />
      <input
        type="password"
        placeholder="Şifre"
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: '10px', padding: '8px' }}
      />
      <button
        onClick={handleLogin}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        Giriş Yap
      </button>
    </div>
  );
};

export default Auth;
