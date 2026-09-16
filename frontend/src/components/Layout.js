import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Layout({ children, paginaActual, setPagina }) {
  const { usuario, logout } = useAuth();
  const { tema, toggleTema } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [ancho, setAncho] = useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setAncho(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const esCelular = ancho < 768;
  const esTablet = ancho >= 768 && ancho < 1024;

  const menu = [
    { id: 'ventas',    label: 'Ventas',       icono: '🛍️' },
    { id: 'productos', label: 'Productos',    icono: '📦' },
    { id: 'compras',   label: 'Compras',      icono: '🛒' },
    { id: 'clientes',  label: 'Clientes',     icono: '👤' },
    { id: 'reportes',  label: 'Reportes',     icono: '📊' },
  ];

  if (usuario?.rol === 'admin') {
    menu.push({ id: 'usuarios',      label: 'Usuarios',  icono: '👥' });
    menu.push({ id: 'configuracion', label: 'Configuración',    icono: '⚙️' });
  }

  const navegarA = (id) => {
    setPagina(id);
    setMenuAbierto(false);
  };

  const sidebarContent = (
    <>
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${tema.border}`, textAlign: 'center' }}>
        <LogoArea tema={tema} />
      </div>
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {menu.map(item => (
          <div key={item.id} onClick={() => navegarA(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '16px', marginBottom: '4px', cursor: 'pointer',
            fontSize: '14px', fontWeight: paginaActual === item.id ? '700' : '500',
            color: paginaActual === item.id ? '#fff' : tema.textSub,
            background: paginaActual === item.id ? `linear-gradient(135deg, ${tema.accent}, ${tema.accentLight})` : 'transparent',
            boxShadow: paginaActual === item.id ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: '18px' }}>{item.icono}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div style={{ padding: '12px', borderTop: `1px solid ${tema.border}` }}>
        <div onClick={toggleTema} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '14px', cursor: 'pointer', marginBottom: '8px',
          color: tema.textSub, fontSize: '13px', fontWeight: '500', background: tema.bgHover,
        }}>
          <span style={{ fontSize: '16px' }}>{tema.oscuro ? '☀️' : '🌙'}</span>
          <span>{tema.oscuro ? 'Modo claro' : 'Modo oscuro'}</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', borderRadius: '16px', background: tema.accentBg,
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: `linear-gradient(135deg, ${tema.accent}, ${tema.accentLight})`,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '16px', flexShrink: 0,
          }}>
            {usuario?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: tema.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario?.nombre}</div>
            <div style={{ fontSize: '11px', color: tema.textSub, textTransform: 'capitalize' }}>{usuario?.rol}</div>
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tema.textMuted, fontSize: '16px' }}>↪</button>
        </div>
      </div>
    </>
  );

  // CELULAR
  if (esCelular) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: tema.bg, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tema.bgCard, padding: '10px 16px', boxShadow: tema.shadowCard, flexShrink: 0, borderBottom: `1px solid ${tema.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {localStorage.getItem('logo')
              ? <img src={localStorage.getItem('logo')} alt="logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px' }} />
              : <div style={{ width: '32px', height: '32px', background: `linear-gradient(135deg, ${tema.accent}, ${tema.accentLight})`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🧋</div>
            }
            <span style={{ fontSize: '15px', fontWeight: '800', color: tema.text }}>{localStorage.getItem('nombreNegocio') || 'K-CC FOOD'}</span>
          </div>
          <button onClick={() => setMenuAbierto(true)} style={{ background: tema.accentBg, border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '18px' }}>☰</button>
        </div>

        {/* Contenido */}
        <main style={{ flex: 1, overflow: 'hidden' }}>{children}</main>

        {/* Barra inferior */}
        <div style={{ display: 'flex', background: tema.bgCard, borderTop: `1px solid ${tema.border}`, boxShadow: '0 -2px 10px rgba(0,0,0,0.08)', flexShrink: 0, zIndex: 50 }}>
          {menu.slice(0, 4).map(item => (
            <button key={item.id} onClick={() => navegarA(item.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '2px', padding: '8px 4px', border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: paginaActual === item.id ? tema.accent : tema.textMuted,
              fontSize: '10px', fontWeight: paginaActual === item.id ? '700' : '500',
            }}>
              <span style={{ fontSize: '20px' }}>{item.icono}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button onClick={() => setMenuAbierto(true)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '2px', padding: '8px 4px', border: 'none', cursor: 'pointer',
            background: 'transparent', color: tema.textMuted, fontSize: '10px',
          }}>
            <span style={{ fontSize: '20px' }}>⋯</span>
            <span>Más</span>
          </button>
        </div>

        {/* Drawer */}
        {menuAbierto && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={() => setMenuAbierto(false)}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: tema.bgCard, borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${tema.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: '700', color: tema.text }}>Menú</span>
                <button onClick={() => setMenuAbierto(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: tema.textMuted, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: '12px', overflowY: 'auto' }}>
                {menu.map(item => (
                  <div key={item.id} onClick={() => navegarA(item.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 16px', borderRadius: '14px', marginBottom: '4px', cursor: 'pointer',
                    fontSize: '15px', fontWeight: '600',
                    color: paginaActual === item.id ? '#fff' : tema.text,
                    background: paginaActual === item.id ? `linear-gradient(135deg, ${tema.accent}, ${tema.accentLight})` : tema.bgHover,
                  }}>
                    <span style={{ fontSize: '22px' }}>{item.icono}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
                <div onClick={toggleTema} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', marginBottom: '4px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: tema.text, background: tema.bgHover }}>
                  <span style={{ fontSize: '22px' }}>{tema.oscuro ? '☀️' : '🌙'}</span>
                  <span>{tema.oscuro ? 'Modo claro' : 'Modo oscuro'}</span>
                </div>
                <div onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: tema.danger, background: tema.dangerBg }}>
                  <span style={{ fontSize: '22px' }}>↪</span>
                  <span>Cerrar sesión</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TABLET Y DESKTOP
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: tema.bg }}>
      <aside style={{
        width: esTablet ? '200px' : '240px', minWidth: esTablet ? '200px' : '240px',
        background: tema.bgSidebar,
        margin: esTablet ? '12px 0 12px 12px' : '16px 0 16px 16px',
        borderRadius: esTablet ? '20px' : '24px',
        boxShadow: tema.shadow,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {sidebarContent}
      </aside>
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: esTablet ? '12px 12px 12px 8px' : '16px 16px 16px 12px' }}>
        {children}
      </main>
    </div>
  );
}

function LogoArea({ tema }) {
  const logo = localStorage.getItem('logo');
  const nombreNegocio = localStorage.getItem('nombreNegocio') || 'K-CC FOOD';
  const subNegocio = localStorage.getItem('subNegocio') || 'Sistema de gestión';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
      {logo
        ? <img src={logo} alt="logo" style={{ width: '200px', height: '120px', objectFit: 'contain', borderRadius: '20px' }} />
        : <div style={{ width: '120px', height: '120px', background: `linear-gradient(135deg, ${tema.accent}, ${tema.accentLight})`, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>🧋</div>
      }
      <div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: tema.text }}>{nombreNegocio}</div>
        <div style={{ fontSize: '10px', color: tema.textMuted, marginTop: '2px' }}>{subNegocio}</div>
      </div>
    </div>
  );
}

export default Layout;