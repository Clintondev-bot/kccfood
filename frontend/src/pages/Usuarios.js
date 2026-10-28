import React, { useEffect, useState } from 'react';
import api from '../api/axios';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', rol: 'vendedor',
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setUsuarioEditando(usuario);
      setForm({ nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol });
    } else {
      setUsuarioEditando(null);
      setForm({ nombre: '', email: '', password: '', rol: 'vendedor' });
    }
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setUsuarioEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (usuarioEditando) {
        await api.put(`/usuarios/${usuarioEditando.id}`, form);
      } else {
        await api.post('/usuarios', form);
      }
      setExito(usuarioEditando ? 'Usuario actualizado ✓' : 'Usuario creado ✓');
      setTimeout(() => setExito(''), 3000);
      cerrarModal();
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const toggleActivo = async (id) => {
    try {
      await api.put(`/usuarios/${id}/toggle`);
      cargarDatos();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;

  return (
    <div style={styles.contenedor}>

      {/* TOPBAR */}
      <div style={styles.topbar}>
        <h2 style={styles.titulo}>Usuarios</h2>
        <button style={styles.btnNuevo} onClick={() => abrirModal()}>
          + Nuevo usuario
        </button>
      </div>

      {exito && <div style={styles.exito}>{exito}</div>}

      <div style={styles.body}>
        <div style={styles.grid}>
          {usuarios.map(u => (
            <div key={u.id} style={{ ...styles.tarjeta, opacity: u.activo ? 1 : 0.6 }}>

              {/* Avatar */}
              <div style={styles.avatarWrap}>
                <div style={{
                  ...styles.avatar,
                  background: u.rol === 'admin' ? '#1a1a2e' : '#185FA5',
                }}>
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{
                  ...styles.estadoBadge,
                  background: u.activo ? '#eafbea' : '#ffeaea',
                  color: u.activo ? '#2e7d32' : '#e53935',
                }}>
                  {u.activo ? '● Activo' : '● Inactivo'}
                </div>
              </div>

              {/* Info */}
              <div style={styles.info}>
                <div style={styles.nombre}>{u.nombre}</div>
                <div style={styles.email}>{u.email}</div>
                <div style={{
                  ...styles.rolBadge,
                  background: u.rol === 'admin' ? '#1a1a2e' : '#e3f0fb',
                  color: u.rol === 'admin' ? '#fff' : '#185FA5',
                }}>
                  {u.rol === 'admin' ? '⚙️ Administrador' : '🧾 Vendedor'}
                </div>
              </div>

              {/* Acciones */}
              <div style={styles.acciones}>
                <button style={styles.btnEditar} onClick={() => abrirModal(u)}>
                  ✏️ Editar
                </button>
                <button
                  style={{ ...styles.btnToggle, background: u.activo ? '#ffeaea' : '#eafbea', color: u.activo ? '#e53935' : '#2e7d32' }}
                  onClick={() => toggleActivo(u.id)}
                >
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {modalAbierto && (
        <div style={styles.modalFondo} onClick={cerrarModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>
                {usuarioEditando ? 'Editar usuario' : 'Nuevo usuario'}
              </h3>
              <button style={styles.btnCerrar} onClick={cerrarModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.campo}>
                <label style={styles.label}>Nombre completo *</label>
                <input
                  style={styles.input}
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del empleado"
                  required
                />
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Email *</label>
                <input
                  style={styles.input}
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@kccfood.pe"
                  required
                />
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>
                  {usuarioEditando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                </label>
                <input
                  style={styles.input}
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required={!usuarioEditando}
                />
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Rol</label>
                <select
                  style={styles.input}
                  value={form.rol}
                  onChange={e => setForm({ ...form, rol: e.target.value })}
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {error && <p style={styles.errorMsg}>{error}</p>}

              <div style={styles.modalAcciones}>
                <button type="button" style={styles.btnCancelar} onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnGuardar}>
                  {usuarioEditando ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  contenedor: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f4f6f9' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexShrink: 0 },
  titulo: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e' },
  btnNuevo: { padding: '8px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  exito: { background: '#eafbea', color: '#2e7d32', padding: '10px 20px', fontSize: '13px', fontWeight: '600' },
  body: { flex: 1, overflowY: 'auto', padding: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' },
  tarjeta: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  avatarWrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' },
  estadoBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  info: { marginBottom: '16px' },
  nombre: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', marginBottom: '3px' },
  email: { fontSize: '12px', color: '#888', marginBottom: '8px' },
  rolBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  acciones: { display: 'flex', gap: '8px' },
  btnEditar: { flex: 1, padding: '7px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnToggle: { flex: 1, padding: '7px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  modalFondo: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitulo: { fontSize: '17px', fontWeight: '700', color: '#1a1a2e' },
  btnCerrar: { background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer' },
  campo: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '5px' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  errorMsg: { color: '#e53935', fontSize: '13px', marginBottom: '12px' },
  modalAcciones: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
  btnCancelar: { padding: '9px 18px', background: '#f4f6f9', color: '#444', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  btnGuardar: { padding: '9px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
};

export default Usuarios;