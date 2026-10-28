import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Login() {
  const { login } = useAuth();
  const { tema } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const logo = localStorage.getItem('logo');
  const nombreNegocio = localStorage.getItem('nombreNegocio') || 'K-CC FOOD';
  const subNegocio = localStorage.getItem('subNegocio') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
    } catch (err) {
      // 429 = demasiados intentos fallidos: mostramos cuánto esperar
      if (err.response?.status === 429) {
        setError(err.response.data?.error || 'Demasiados intentos. Espera unos minutos.');
      } else if (!err.response) {
        setError('No se pudo conectar con el servidor');
      } else {
        setError('Email o contraseña incorrectos');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: tema.bg,
    }}>
      <div style={{
        background: tema.bgCard, padding: '48px 40px',
        borderRadius: '28px', boxShadow: tema.shadow,
        width: '100%', maxWidth: '400px',
        border: `1px solid ${tema.border}`,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          {logo ? (
            <img src={logo} alt="logo" style={{ width: '300px', height: '80px', objectFit: 'contain', borderRadius: '20px', marginBottom: '14px' }} />
          ) : (
            <div style={{
              width: '80px', height: '80px',
              background: `linear-gradient(135deg, ${tema.accent}, ${tema.accentLight})`,
              borderRadius: '22px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '36px',
              margin: '0 auto 14px',
              boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
            }}>
              🧋
            </div>
          )}
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: tema.text, marginBottom: '4px' }}>
            {nombreNegocio}
          </h1>
          <p style={{ fontSize: '13px', color: tema.textMuted }}>{subNegocio}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: tema.textSub, marginBottom: '8px', letterSpacing: '.04em' }}>
              EMAIL
            </label>
            <input
              style={{
                width: '100%', padding: '13px 16px',
                border: `1.5px solid ${tema.border}`, borderRadius: '14px',
                fontSize: '14px', background: tema.bgInput,
                color: tema.text, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@kccfood.pe" required
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: tema.textSub, marginBottom: '8px', letterSpacing: '.04em' }}>
              CONTRASEÑA
            </label>
            <input
              style={{
                width: '100%', padding: '13px 16px',
                border: `1.5px solid ${tema.border}`, borderRadius: '14px',
                fontSize: '14px', background: tema.bgInput,
                color: tema.text, outline: 'none',
              }}
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          {error && (
            <div style={{
              background: tema.dangerBg, color: tema.danger,
              padding: '10px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px', textAlign: 'center',
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px',
              background: `linear-gradient(135deg, ${tema.accent}, ${tema.accentLight})`,
              color: '#fff', border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              opacity: cargando ? 0.7 : 1,
              boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
              letterSpacing: '.02em',
            }}
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;