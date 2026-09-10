import React, { useEffect, useState } from 'react';
import api from '../api/axios';

function Compras() {
  const [compras, setCompras] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [form, setForm] = useState({
    proveedor: '',
    nro_factura: '',
  });

  const [items, setItems] = useState([
    { producto_id: '', cantidad: 1, precio_unit: 0 }
  ]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [c, p] = await Promise.all([
        api.get('/compras'),
        api.get('/productos'),
      ]);
      setCompras(c.data);
      setProductos(p.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = () => {
    setForm({ proveedor: '', nro_factura: '' });
    setItems([{ producto_id: '', cantidad: 1, precio_unit: 0 }]);
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setDetalle(null);
  };

  const agregarItem = () => {
    setItems([...items, { producto_id: '', cantidad: 1, precio_unit: 0 }]);
  };

  const quitarItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevos = [...items];
    nuevos[index][campo] = valor;

    // Si cambia el producto, auto-completamos el precio de costo
    if (campo === 'producto_id') {
      const prod = productos.find(p => p.id === parseInt(valor));
      if (prod) nuevos[index].precio_unit = parseFloat(prod.precio_costo) || 0;
    }

    setItems(nuevos);
  };

  const total = items.reduce((sum, i) => sum + (i.cantidad * i.precio_unit), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const itemsValidos = items.filter(i => i.producto_id && i.cantidad > 0);
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }

    try {
      await api.post('/compras', {
        proveedor: form.proveedor,
        nro_factura: form.nro_factura,
        items: itemsValidos.map(i => ({
          producto_id: parseInt(i.producto_id),
          cantidad: parseInt(i.cantidad),
          precio_unit: parseFloat(i.precio_unit),
        })),
      });
      setExito('✅ Compra registrada y stock actualizado');
      setTimeout(() => setExito(''), 3000);
      cerrarModal();
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    }
  };

  const verDetalle = async (id) => {
    try {
      const { data } = await api.get(`/compras/${id}`);
      setDetalle(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;

  return (
    <div style={styles.contenedor}>

      {/* TOPBAR */}
      <div style={styles.topbar}>
        <h2 style={styles.titulo}>Compras</h2>
        <button style={styles.btnNuevo} onClick={abrirModal}>
          + Registrar compra
        </button>
      </div>

      {exito && <div style={styles.exito}>{exito}</div>}

      <div style={styles.body}>

        {/* Resumen rápido */}
        <div style={styles.grid3}>
          <div style={styles.metrica}>
            <div style={styles.metricaIcono}>🛒</div>
            <div style={styles.metricaValor}>{compras.length}</div>
            <div style={styles.metricaLabel}>Total compras</div>
          </div>
          <div style={styles.metrica}>
            <div style={styles.metricaIcono}>💰</div>
            <div style={styles.metricaValor}>
              S/ {compras.reduce((sum, c) => sum + parseFloat(c.total), 0).toFixed(2)}
            </div>
            <div style={styles.metricaLabel}>Total invertido</div>
          </div>
          <div style={styles.metrica}>
            <div style={styles.metricaIcono}>📅</div>
            <div style={styles.metricaValor}>
              {compras.filter(c => new Date(c.creado_en).toDateString() === new Date().toDateString()).length}
            </div>
            <div style={styles.metricaLabel}>Compras hoy</div>
          </div>
        </div>

        {/* Tabla de compras */}
        <div style={styles.card}>
          <h3 style={styles.cardTitulo}>Historial de compras</h3>
          {compras.length === 0 ? (
            <p style={styles.sinDatos}>No hay compras registradas aún</p>
          ) : (
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Proveedor</th>
                  <th style={styles.th}>N° Factura</th>
                  <th style={styles.th}>Registrado por</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {compras.map(c => (
                  <tr key={c.id}>
                    <td style={styles.td}>{c.id}</td>
                    <td style={styles.td}>{c.proveedor || '—'}</td>
                    <td style={styles.td}>{c.nro_factura || '—'}</td>
                    <td style={styles.td}>{c.usuario}</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: '#2e7d32' }}>
                      S/ {parseFloat(c.total).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, color: '#aaa', fontSize: '12px' }}>
                      {new Date(c.creado_en).toLocaleString('es-PE')}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.btnVer} onClick={() => verDetalle(c.id)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL NUEVA COMPRA */}
      {modalAbierto && (
        <div style={styles.modalFondo} onClick={cerrarModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>Registrar compra</h3>
              <button style={styles.btnCerrar} onClick={cerrarModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.fila}>
                <div style={styles.campo}>
                  <label style={styles.label}>Proveedor</label>
                  <input
                    style={styles.input}
                    placeholder="Nombre del proveedor"
                    value={form.proveedor}
                    onChange={e => setForm({ ...form, proveedor: e.target.value })}
                  />
                </div>
                <div style={styles.campo}>
                  <label style={styles.label}>N° Factura</label>
                  <input
                    style={styles.input}
                    placeholder="F001-00123"
                    value={form.nro_factura}
                    onChange={e => setForm({ ...form, nro_factura: e.target.value })}
                  />
                </div>
              </div>

              {/* Items */}
              <div style={styles.itemsHeader}>
                <label style={styles.label}>Productos comprados</label>
                <button type="button" style={styles.btnAgregar} onClick={agregarItem}>
                  + Agregar producto
                </button>
              </div>

              {items.map((item, i) => (
                <div key={i} style={styles.itemFila}>
                  <select
                    style={{ ...styles.input, flex: 2 }}
                    value={item.producto_id}
                    onChange={e => actualizarItem(i, 'producto_id', e.target.value)}
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <div style={styles.itemCampo}>
                    <label style={styles.labelPeq}>Cantidad</label>
                    <input
                      style={styles.inputPeq}
                      type="number" min="1"
                      value={item.cantidad}
                      onChange={e => actualizarItem(i, 'cantidad', e.target.value)}
                    />
                  </div>
                  <div style={styles.itemCampo}>
                    <label style={styles.labelPeq}>Precio unit.</label>
                    <input
                      style={styles.inputPeq}
                      type="number" min="0" step="0.01"
                      value={item.precio_unit}
                      onChange={e => actualizarItem(i, 'precio_unit', e.target.value)}
                    />
                  </div>
                  <div style={styles.itemCampo}>
                    <label style={styles.labelPeq}>Subtotal</label>
                    <div style={styles.subtotal}>
                      S/ {(item.cantidad * item.precio_unit).toFixed(2)}
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" style={styles.btnQuitar} onClick={() => quitarItem(i)}>✕</button>
                  )}
                </div>
              ))}

              {/* Total */}
              <div style={styles.totalWrap}>
                <span style={styles.totalLabel}>Total de la compra:</span>
                <span style={styles.totalValor}>S/ {total.toFixed(2)}</span>
              </div>

              {error && <p style={styles.errorMsg}>{error}</p>}

              <div style={styles.modalAcciones}>
                <button type="button" style={styles.btnCancelar} onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnGuardar}>
                  Registrar compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {detalle && (
        <div style={styles.modalFondo} onClick={() => setDetalle(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>Detalle de compra #{detalle.id}</h3>
              <button style={styles.btnCerrar} onClick={() => setDetalle(null)}>✕</button>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <p style={styles.detalleInfo}><strong>Proveedor:</strong> {detalle.proveedor || '—'}</p>
              <p style={styles.detalleInfo}><strong>N° Factura:</strong> {detalle.nro_factura || '—'}</p>
              <p style={styles.detalleInfo}><strong>Fecha:</strong> {new Date(detalle.creado_en).toLocaleString('es-PE')}</p>
            </div>
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Cantidad</th>
                  <th style={styles.th}>Precio unit.</th>
                  <th style={styles.th}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.detalle?.map((d, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{d.producto}</td>
                    <td style={styles.td}>{d.cantidad}</td>
                    <td style={styles.td}>S/ {parseFloat(d.precio_unit).toFixed(2)}</td>
                    <td style={{ ...styles.td, fontWeight: '700' }}>S/ {parseFloat(d.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.totalWrap}>
              <span style={styles.totalLabel}>Total:</span>
              <span style={styles.totalValor}>S/ {parseFloat(detalle.total).toFixed(2)}</span>
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
  body: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  metrica: { background: '#fff', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center' },
  metricaIcono: { fontSize: '24px', marginBottom: '8px' },
  metricaValor: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' },
  metricaLabel: { fontSize: '12px', color: '#888' },
  card: { background: '#fff', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  cardTitulo: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '16px' },
  sinDatos: { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600', fontSize: '12px' },
  td: { padding: '10px', borderBottom: '1px solid #f5f5f5', color: '#333' },
  btnVer: { padding: '5px 12px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  modalFondo: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitulo: { fontSize: '17px', fontWeight: '700', color: '#1a1a2e' },
  btnCerrar: { background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer' },
  fila: { display: 'flex', gap: '12px' },
  campo: { flex: 1, marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '5px' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  itemsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  btnAgregar: { padding: '5px 12px', background: '#e3f0fb', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  itemFila: { display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' },
  itemCampo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  labelPeq: { fontSize: '11px', color: '#888', fontWeight: '600' },
  inputPeq: { width: '80px', padding: '7px 8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', outline: 'none' },
  subtotal: { width: '80px', padding: '7px 8px', background: '#eafbea', borderRadius: '6px', fontSize: '13px', fontWeight: '700', color: '#2e7d32' },
  btnQuitar: { padding: '7px 10px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '0' },
  totalWrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '2px solid #f0f0f0', marginTop: '10px' },
  totalLabel: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  totalValor: { fontSize: '20px', fontWeight: '700', color: '#2e7d32' },
  errorMsg: { color: '#e53935', fontSize: '13px', marginBottom: '12px' },
  modalAcciones: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' },
  btnCancelar: { padding: '9px 18px', background: '#f4f6f9', color: '#444', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  btnGuardar: { padding: '9px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  detalleInfo: { fontSize: '13px', color: '#444', marginBottom: '6px' },
};

export default Compras;