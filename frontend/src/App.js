import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Compras from './pages/Compras';
import Clientes from './pages/Clientes';
import Configuracion from './pages/Configuracion';

function Contenido() {
  const { usuario, cargando } = useAuth();
  const { tema } = useTheme();
  const [pagina, setPagina] = useState('ventas');

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: tema.bg }}>
      <p style={{ color: tema.text }}>Cargando...</p>
    </div>
  );

  if (!usuario) return <Login />;

  const renderPagina = () => {
    switch (pagina) {
      case 'ventas':        return <Ventas />;
      case 'productos':     return <Productos />;
      case 'compras':       return <Compras />;
      case 'clientes':      return <Clientes />;
      case 'reportes':      return <Reportes />;
      case 'usuarios':      return <Usuarios />;
      case 'configuracion': return <Configuracion />;
      default: return (
        <div style={{ padding: '40px', color: tema.textSub }}>
          <h2>🚧 Sección en construcción</h2>
        </div>
      );
    }
  };

  return (
    <div style={{ background: tema.bg, minHeight: '100vh' }}>
      <Layout paginaActual={pagina} setPagina={setPagina}>
        {renderPagina()}
      </Layout>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Contenido />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;