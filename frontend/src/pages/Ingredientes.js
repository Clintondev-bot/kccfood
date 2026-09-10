import React, { useEffect, useState } from 'react';
import api from '../api/axios';

function Ingredientes() {
  const [ingredientes, setIngredientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalReceta, setModalReceta] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [ingredienteEditando, setIngredienteEditando] = useState(null);
  const [productoReceta, setProductoReceta] = useState(null);
  const [recetaItems, setRecetaItems] = useState([]);
  const [ajusteForm, setAjusteForm] = useState({ id: '', tipo: 'entrada', cantidad: 0 });
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [form, setForm] = useState({ nombre: '', stock: 0, stock_minimo: 0, unidad: 'oz' });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [i, p] = await Promise.all([
        api.get('/ingredientes'),
        api.get('/productos'),
      ]);
      setIngredientes(i.data);
      // Solo productos de Bubble Tea y Sodas Italianas
      setProductos(p.data.filter(p =>
        p.categoria === 'Bubble Tea' || p.categoria === 'Sodas Italianas'
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (ingrediente = null) => {
    if (ingrediente) {
      setIngredienteEditando(ingrediente);
      setForm({ nombre: ingrediente.nombre, stock: ingrediente.stock, stock_minimo: ingrediente.stock_minimo, unidad: ingrediente.unidad });
    } else {
      setIngredienteEditando(null);
      setForm({ nombre: '', stock: 0, stock_minimo: 0, unidad: 'oz' });
    }
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setIngredienteEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (ingredienteEditando) {
        await api.put(`/ingredientes/${ingredienteEditando.id}`, form);
      } else {
        await api.post('/ingredientes', form);
      }
      setExito(ingredienteEditando ? 'Ingrediente actualizado ✓' : 'Ingrediente creado ✓');
      setTimeout(() => setExito(''), 3000);
      cerrarModal();
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este ingrediente?')) return;
    await api.delete(`/ingredientes/${id}`);
    cargarDatos();
  };

  const abrirReceta = async (producto) => {
    setProductoReceta(producto);
    try {
      const { data } = await api.get(`/ingredientes/receta/${producto.id}`);
      setRecetaItems(data.length > 0 ? data.map(r => ({
        ingrediente_id: r.ingrediente_id,
        cantidad: r.cantidad,
      })) : [{ ingrediente_id: '', cantidad: 0 }]);
    } catch (err) {
      setRecetaItems([{ ingrediente_id: '', cantidad: 0 }]);
    }
    setModalReceta(true);
  };

  const guardarReceta = async () => {
    try {
      const itemsValidos = recetaItems.filter(i => i.ingrediente_id && i.cantidad > 0);
      await api.post(`/ingredientes/receta/${productoReceta.id}`, { items: itemsValidos });
      setExito('Receta guardada ✓');
      setTimeout(() => setExito(''), 3000);
      setModalReceta(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar receta');
    }
  };

  const abrirAjuste = (ingrediente) => {
    setAjusteForm({ id: ingrediente.id, tipo: 'entrada', cantidad: 0 });
    setModalAjuste(true);
  };

  const guardarAjuste = async () => {
    try {
      await api.post('/ingredientes/ajuste', ajusteForm);
      setExito('Stock ajustado ✓');
      setTimeout(() => setExito(''), 3000);
      setModalAjuste(false);
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al ajustar');
    }
  };

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;

  return (
    <div style={styles.contenedor}>

      {/* TOPBAR */}
      <div style={styles.topbar}>
        <h2 style={styles.titulo}>Ingredientes e Insumos</h2>
        <button style={styles.btnNuevo} onClick={() => abrirModal()}>
          + Nuevo ingrediente
        </button>
      </div>

      {exito && <div style={styles.exito}>{exito}</div>}

      <div style={styles.body}>

        {/* INGREDIENTES */}
        <div style={styles.grid2}>
          <div style={styles.card}>
            <h3 style={styles.cardTitulo}>Stock de ingredientes</h3>
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Ingrediente</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Mínimo</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {ingredientes.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>No hay ingredientes registrados</td></tr>
                ) : ingredientes.map(i => (
                  <tr key={i.id}>
                    <td style={styles.td}><strong>{i.nombre}</strong></td>
                    <td style={styles.td}>{i.stock} {i.unidad}</td>
                    <td style={styles.td}>{i.stock_minimo} {i.unidad}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: i.stock <= i.stock_minimo ? '#ffeaea' : '#eafbea',
                        color: i.stock <= i.stock_minimo ? '#e53935' : '#2e7d32',
                      }}>
                        {i.stock <= i.stock_minimo ? '⚠️ Bajo' : '✓ OK'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={styles.btnAjuste} onClick={() => abrirAjuste(i)}>+/- Stock</button>
                        <button style={styles.btnEditar} onClick={() => abrirModal(i)}>✏️</button>
                        <button style={styles.btnEliminar} onClick={() => eliminar(i.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RECETAS */}
          <div style={styles.card}>
            <h3 style={styles.cardTitulo}>Recetas por producto</h3>
            <p style={styles.subtitulo}>Asigna los ingredientes que lleva cada Bubble Tea o Soda Italiana</p>
            <div style={styles.listaProductos}>
              {productos.length === 0 ? (
                <p style={styles.sinDatos}>No hay productos de Bubble Tea o Sodas Italianas</p>
              ) : productos.map(p => (
                <div key={p.id} style={styles.productoItem}>
                  {p.imagen ? (
                    <img src={`http://localhost:3001${p.imagen}`} alt={p.nombre} style={styles.productoImg} />
                  ) : (
                    <div style={styles.productoImgPlaceholder}>🧋</div>
                  )}
                  <div style={styles.productoInfo}>
                    <div style={styles.productoNombre}>{p.nombre}</div>
                    <div style={styles.productoCategoria}>{p.categoria}</div>
                  </div>
                  <button style={styles.btnReceta} onClick={() => abrirReceta(p)}>
                    📋 Receta
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL INGREDIENTE */}
      {modalAbierto && (
        <div style={styles.modalFondo} onClick={cerrarModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>{ingredienteEditando ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h3>
              <button style={styles.btnCerrar} onClick={cerrarModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.campo}>
                <label style={styles.label}>Nombre *</label>
                <input style={styles.input} value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Base de té verde, Jarabe de maracuyá..." required />
              </div>
              <div style={styles.fila}>
                <div style={styles.campo}>
                  <label style={styles.label}>Stock actual</label>
                  <input style={styles.input} type="number" step="0.01" min="0"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div style={styles.campo}>
                  <label style={styles.label}>Stock mínimo</label>
                  <input style={styles.input} type="number" step="0.01" min="0"
                    value={form.stock_minimo}
                    onChange={e => setForm({ ...form, stock_minimo: e.target.value })} />
                </div>
                <div style={styles.campo}>
                  <label style={styles.label}>Unidad</label>
                  <select style={styles.input} value={form.unidad}
                    onChange={e => setForm({ ...form, unidad: e.target.value })}>
                    <option value="oz">oz</option>
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="unidad">unidad</option>
                  </select>
                </div>
              </div>
              {error && <p style={styles.errorMsg}>{error}</p>}
              <div style={styles.modalAcciones}>
                <button type="button" style={styles.btnCancelar} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" style={styles.btnGuardar}>
                  {ingredienteEditando ? 'Guardar cambios' : 'Crear ingrediente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECETA */}
      {modalReceta && (
        <div style={styles.modalFondo} onClick={() => setModalReceta(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>Receta: {productoReceta?.nombre}</h3>
              <button style={styles.btnCerrar} onClick={() => setModalReceta(false)}>✕</button>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
              Define cuánto de cada ingrediente se usa para preparar una unidad de este producto.
            </p>
            {recetaItems.map((item, i) => (
              <div key={i} style={styles.recetaFila}>
                <select
                  style={{ ...styles.input, flex: 2 }}
                  value={item.ingrediente_id}
                  onChange={e => {
                    const nuevos = [...recetaItems];
                    nuevos[i].ingrediente_id = e.target.value;
                    setRecetaItems(nuevos);
                  }}
                >
                  <option value="">Seleccionar ingrediente</option>
                  {ingredientes.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.unidad})</option>
                  ))}
                </select>
                <input
                  style={{ ...styles.input, width: '80px' }}
                  type="number" step="0.01" min="0"
                  placeholder="Cant."
                  value={item.cantidad}
                  onChange={e => {
                    const nuevos = [...recetaItems];
                    nuevos[i].cantidad = e.target.value;
                    setRecetaItems(nuevos);
                  }}
                />
                <button
                  style={styles.btnEliminar}
                  onClick={() => setRecetaItems(recetaItems.filter((_, idx) => idx !== i))}
                >✕</button>
              </div>
            ))}
            <button
              style={styles.btnAgregar}
              onClick={() => setRecetaItems([...recetaItems, { ingrediente_id: '', cantidad: 0 }])}
            >
              + Agregar ingrediente
            </button>
            <div style={styles.modalAcciones}>
              <button style={styles.btnCancelar} onClick={() => setModalReceta(false)}>Cancelar</button>
              <button style={styles.btnGuardar} onClick={guardarReceta}>Guardar receta</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE */}
      {modalAjuste && (
        <div style={styles.modalFondo} onClick={() => setModalAjuste(false)}>
          <div style={{ ...styles.modal, maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>Ajustar stock</h3>
              <button style={styles.btnCerrar} onClick={() => setModalAjuste(false)}>✕</button>
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>Tipo</label>
              <select style={styles.input} value={ajusteForm.tipo}
                onChange={e => setAjusteForm({ ...ajusteForm, tipo: e.target.value })}>
                <option value="entrada">Entrada (agregar)</option>
                <option value="salida">Salida (descontar)</option>
              </select>
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>Cantidad</label>
              <input style={styles.input} type="number" step="0.01" min="0"
                value={ajusteForm.cantidad}
                onChange={e => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })} />
            </div>
            <div style={styles.modalAcciones}>
              <button style={styles.btnCancelar} onClick={() => setModalAjuste(false)}>Cancelar</button>
              <button style={styles.btnGuardar} onClick={guardarAjuste}>Aplicar</button>
            </div>
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
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  card: { background: '#fff', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  cardTitulo: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' },
  subtitulo: { fontSize: '12px', color: '#888', marginBottom: '14px' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600', fontSize: '12px' },
  td: { padding: '10px', borderBottom: '1px solid #f5f5f5', color: '#333' },
  badge: { padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  btnAjuste: { padding: '4px 8px', background: '#e3f0fb', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  btnEditar: { padding: '4px 8px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  btnEliminar: { padding: '4px 8px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  listaProductos: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sinDatos: { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  productoItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' },
  productoImg: { width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px' },
  productoImgPlaceholder: { width: '44px', height: '44px', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '8px' },
  productoInfo: { flex: 1 },
  productoNombre: { fontSize: '13px', fontWeight: '600', color: '#1a1a2e' },
  productoCategoria: { fontSize: '11px', color: '#888' },
  btnReceta: { padding: '6px 12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  modalFondo: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitulo: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e' },
  btnCerrar: { background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer' },
  campo: { marginBottom: '14px', flex: 1 },
  fila: { display: 'flex', gap: '12px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '5px' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  errorMsg: { color: '#e53935', fontSize: '13px', marginBottom: '12px' },
  modalAcciones: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' },
  btnCancelar: { padding: '9px 18px', background: '#f4f6f9', color: '#444', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  btnGuardar: { padding: '9px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  recetaFila: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' },
  btnAgregar: { padding: '7px 14px', background: '#e3f0fb', color: '#185FA5', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' },
};

export default Ingredientes;