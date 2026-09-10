import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

function Configuracion() {
  const { tema, toggleTema } = useTheme();
  const [nombreNegocio, setNombreNegocio] = useState(localStorage.getItem('nombreNegocio') || 'K-CC FOOD');
  const [subNegocio, setSubNegocio] = useState(localStorage.getItem('subNegocio') || 'un pedido de Corea en Constitución');
  const [logo, setLogo] = useState(localStorage.getItem('logo') || null);
  const [exito, setExito] = useState('');

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogo(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const guardar = () => {
    localStorage.setItem('nombreNegocio', nombreNegocio);
    localStorage.setItem('subNegocio', subNegocio);
    if (logo) localStorage.setItem('logo', logo);
    setExito('✅ Configuración guardada');
    setTimeout(() => setExito(''), 3000);
  };

  const quitarLogo = () => {
    setLogo(null);
    localStorage.removeItem('logo');
  };

  const s = {
    contenedor: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: tema.bg },
    topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tema.bgTopbar, padding: '14px 24px', borderBottom: `1px solid ${tema.border}`, flexShrink: 0 },
    titulo: { fontSize: '18px', fontWeight: '700', color: tema.text },
    body: { flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' },
    card: { background: tema.bgCard, borderRadius: '14px', padding: '24px', boxShadow: tema.shadow, border: `1px solid ${tema.border}` },
    cardTitulo: { fontSize: '15px', fontWeight: '700', color: tema.text, marginBottom: '6px' },
    cardSub: { fontSize: '12px', color: tema.textMuted, marginBottom: '20px' },
    campo: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '12px', fontWeight: '600', color: tema.textSub, marginBottom: '6px' },
    input: { width: '100%', padding: '10px 14px', border: `1px solid ${tema.border}`, borderRadius: '10px', fontSize: '14px', background: tema.bgInput, color: tema.text, outline: 'none' },
    logoArea: { display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: tema.bg, borderRadius: '12px', border: `1px dashed ${tema.border}` },
    logoPreview: { width: '70px', height: '70px', objectFit: 'contain', borderRadius: '10px', background: tema.bgCard, padding: '4px' },
    logoPlaceholder: { width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', background: tema.accentBg, borderRadius: '10px' },
    btnPrimario: { padding: '10px 24px', background: tema.accent, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    btnSecundario: { padding: '10px 16px', background: tema.bgHover, color: tema.textSub, border: `1px solid ${tema.border}`, borderRadius: '10px', fontSize: '13px', cursor: 'pointer' },
    btnDanger: { padding: '10px 16px', background: tema.dangerBg, color: tema.danger, border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' },
    temaFila: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${tema.border}` },
    temaLabel: { fontSize: '14px', fontWeight: '500', color: tema.text },
    temaSub: { fontSize: '12px', color: tema.textMuted, marginTop: '2px' },
    toggle: { width: '48px', height: '26px', borderRadius: '13px', background: tema.oscuro ? tema.accent : tema.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', border: 'none' },
    toggleCirculo: { position: 'absolute', top: '3px', left: tema.oscuro ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' },
    exito: { background: tema.successBg, color: tema.success, padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' },
  };

  return (
    <div style={s.contenedor}>
      <div style={s.topbar}>
        <h2 style={s.titulo}>Configuración</h2>
        <button style={s.btnPrimario} onClick={guardar}>Guardar cambios</button>
      </div>

      <div style={s.body}>
        {exito && <div style={s.exito}>{exito}</div>}

        {/* Identidad del negocio */}
        <div style={s.card}>
          <div style={s.cardTitulo}>Identidad del negocio</div>
          <div style={s.cardSub}>Personaliza el nombre y logo que aparece en el sistema</div>

          {/* Logo */}
          <div style={s.campo}>
            <label style={s.label}>Logo</label>
            <div style={s.logoArea}>
              {logo ? (
                <img src={logo} alt="logo" style={s.logoPreview} />
              ) : (
                <div style={s.logoPlaceholder}>🧋</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={s.btnSecundario}>
                  📷 {logo ? 'Cambiar logo' : 'Subir logo'}
                  <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
                </label>
                {logo && (
                  <button style={s.btnDanger} onClick={quitarLogo}>🗑️ Quitar logo</button>
                )}
              </div>
              <div style={{ fontSize: '12px', color: tema.textMuted }}>
                PNG o JPG recomendado<br />Máximo 2MB
              </div>
            </div>
          </div>

          <div style={s.campo}>
            <label style={s.label}>Nombre del negocio</label>
            <input style={s.input} value={nombreNegocio}
              onChange={e => setNombreNegocio(e.target.value)}
              placeholder="K-CC FOOD" />
          </div>

          <div style={s.campo}>
            <label style={s.label}>Descripción o slogan</label>
            <input style={s.input} value={subNegocio}
              onChange={e => setSubNegocio(e.target.value)}
              placeholder="un pedido de Corea en Constitución" />
          </div>
        </div>

        {/* Apariencia */}
        <div style={s.card}>
          <div style={s.cardTitulo}>Apariencia</div>
          <div style={s.cardSub}>Personaliza cómo se ve el sistema</div>

          <div style={s.temaFila}>
            <div>
              <div style={s.temaLabel}>Modo oscuro</div>
              <div style={s.temaSub}>Cambia entre tema claro y oscuro</div>
            </div>
            <button style={s.toggle} onClick={toggleTema}>
              <div style={s.toggleCirculo} />
            </button>
          </div>
        </div>

        {/* Info del sistema */}
        <div style={s.card}>
          <div style={s.cardTitulo}>Sistema</div>
          <div style={s.cardSub}>Información del sistema K-CCFOOD</div>
          <div style={{ fontSize: '13px', color: tema.textSub, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Versión</span><span style={{ fontWeight: '600', color: tema.text }}>1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Desarrollado por</span><span style={{ fontWeight: '600', color: tema.accent }}>K-CCFOOD Dev</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuracion;