import React, { useEffect, useState } from 'react';
import api from '../api/axios';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { cargarClientes(); }, []);

  const cargarClientes = async () => {
    try {
      const { data } = await api.get('/clientes');
      setClientes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (cliente = null) => {
    if (cliente) {
      setEditando(cliente.id);
      setForm({ nombre: cliente.nombre, descripcion: cliente.descripcion || '' });
    } else {
      setEditando(null);
      setForm({ nombre: '', descripcion: '' });
    }
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => setModalAbierto(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    try {
      if (editando) {
        await api.put(`/clientes/${editando}`, form);
      } else {
        await api.post('/clientes', form);
      }
      cerrarModal();
      cargarClientes();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const eliminarCliente = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      cargarClientes();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;

  return (
    <div style={styles.contenedor}>
      <div style={styles.topbar}>
        <h2 style={styles.titulo}>Clientes</h2>
        <button style={styles.btnNuevo} onClick={() => abrirModal()}>+ Nuevo cliente</button>
      </div>

      <div style={styles.body}>
        <input
          style={styles.buscador}
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        <div style={styles.card}>
          {clientesFiltrados.length === 0 ? (
            <p style={styles.sinDatos}>No hay clientes registrados aún</p>
          ) : (
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Descripción</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map(c => (
                  <tr key={c.id}>
                    <td style={styles.td}>
                      <span style={styles.badge}>#{c.id}</span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{c.nombre}</td>
                    <td style={{ ...styles.td, color: '#888' }}>{c.descripcion || '—'}</td>
                    <td style={styles.td}>
                      <button style={styles.btnEditar} onClick={() => abrirModal(c)}>✏️ Editar</button>
                      <button style={styles.btnEliminar} onClick={() => eliminarCliente(c.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div style={styles.modalFondo} onClick={cerrarModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>{editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button style={styles.btnCerrar} onClick={cerrarModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.campo}>
                <label style={styles.label}>Nombre</label>
                <input
                  style={styles.input}
                  placeholder="Nombre del cliente"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div style={styles.campo}>
                <label style={styles.label}>Descripción (opcional)</label>
                <input
                  style={styles.input}
                  placeholder="Ej: cliente frecuente, oficina cercana, etc."
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>
              {error && <p style={styles.errorMsg}>{error}</p>}
              <div style={styles.modalAcciones}>
                <button type="button" style={styles.btnCancelar} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" style={styles.btnGuardar}>Guardar</button>
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
  body: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  buscador: { padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' },
  card: { background: '#fff', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  sinDatos: { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600', fontSize: '12px' },
  td: { padding: '10px', borderBottom: '1px solid #f5f5f5', color: '#333' },
  badge: { background: '#f0f4ff', color: '#185FA5', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' },
  btnEditar: { padding: '5px 10px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginRight: '6px' },
  btnEliminar: { padding: '5px 10px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  modalFondo: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitulo: { fontSize: '17px', fontWeight: '700', color: '#1a1a2e' },
  btnCerrar: { background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer' },
  campo: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '5px' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  errorMsg: { color: '#e53935', fontSize: '13px', marginBottom: '12px' },
  modalAcciones: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' },
  btnCancelar: { padding: '9px 18px', background: '#f4f6f9', color: '#444', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  btnGuardar: { padding: '9px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
};

export default Clientes;