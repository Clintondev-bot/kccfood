import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Ventas() {
  const { usuario } = useAuth();
  const [vista, setVista] = useState('lista');
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [combos, setCombos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaVentas, setBusquedaVentas] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [observacion, setObservacion] = useState('');
  const [descuento, setDescuento] = useState('');
  const [tipoDescuento, setTipoDescuento] = useState('monto');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [hora, setHora] = useState('');
  const [fecha, setFecha] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [ancho, setAncho] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setAncho(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const esCelular = ancho < 768;
  const esTablet = ancho >= 768 && ancho < 1024;

  useEffect(() => {
    const tick = () => {
      const ahora = new Date();
      setHora(ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
      setFecha(ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    tick();
    const intervalo = setInterval(tick, 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [p, c, v] = await Promise.all([
        api.get('/productos'),
        api.get('/productos/categorias'),
        api.get('/ventas'),
      ]);
      setProductos(p.data);
      setCategorias(c.data);
      setVentas(v.data);
      const combosGuardados = JSON.parse(localStorage.getItem('combos') || '[]');
      setCombos(combosGuardados);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock === 0) return;
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) return prev;
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    if (esCelular) setCarritoAbierto(true);
  };

  const agregarComboAlCarrito = (combo) => {
    const comboId = `combo-${combo.id}`;
    setCarrito(prev => {
      const existe = prev.find(i => i.id === comboId);
      if (existe) {
        return prev.map(i => i.id === comboId ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, {
        id: comboId, nombre: `🎁 ${combo.nombre}`, categoria: 'Combo',
        precio_venta: combo.precio, precio_normal: combo.precio_normal,
        cantidad: 1, esCombo: true, comboItems: combo.items, stock: 999,
      }];
    });
    if (esCelular) setCarritoAbierto(true);
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev =>
      prev.map(i => {
        if (i.id !== id) return i;
        const nueva = i.cantidad + delta;
        if (nueva <= 0) return null;
        if (!i.esCombo) {
          const prod = productos.find(p => p.id === id);
          if (prod && nueva > prod.stock) return i;
        }
        return { ...i, cantidad: nueva };
      }).filter(Boolean)
    );
  };

  const subtotal = carrito.reduce((sum, i) => sum + (i.cantidad * parseFloat(i.precio_venta)), 0);

  const calcularDescuento = () => {
    const val = parseFloat(descuento) || 0;
    if (tipoDescuento === 'porcentaje') return (subtotal * val) / 100;
    return val;
  };

  const montoDescuento = calcularDescuento();
  const total = Math.max(0, subtotal - montoDescuento);

  const cobrar = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      const itemsNormales = carrito.filter(i => !i.esCombo);
      const itemsCombos = carrito.filter(i => i.esCombo);

      const itemsExpandidos = [...itemsNormales.map(i => ({
        producto_id: i.id,
        cantidad: i.cantidad,
        precio_unit: parseFloat(i.precio_venta),
      }))];

      itemsCombos.forEach(combo => {
        const totalItems = combo.comboItems.reduce((s, i) => s + i.cantidad, 0);
        const precioPorItem = parseFloat(combo.precio_venta) / totalItems;
        combo.comboItems.forEach(item => {
          const existente = itemsExpandidos.find(i => i.producto_id === item.producto_id);
          if (existente) {
            existente.cantidad += item.cantidad * combo.cantidad;
          } else {
            itemsExpandidos.push({
              producto_id: item.producto_id,
              cantidad: item.cantidad * combo.cantidad,
              precio_unit: precioPorItem,
            });
          }
        });
      });

      await api.post('/ventas', {
        metodo_pago: metodoPago,
        descuento: parseFloat(descuento) || 0,
        tipo_descuento: tipoDescuento,
        items: itemsExpandidos,
      });
      setCarrito([]);
      setObservacion('');
      setDescuento('');
      setCarritoAbierto(false);
      setMensaje('✅ Venta registrada');
      cargarDatos();
      setTimeout(() => { setMensaje(''); setVista('lista'); }, 1500);
    } catch (err) {
      setMensaje('❌ ' + (err.response?.data?.error || 'Error'));
    } finally {
      setProcesando(false);
    }
  };

  const todasCategorias = ['Todos', ...categorias.map(c => c.nombre), ...(combos.length > 0 ? ['🎁 Combos'] : [])];

  const productosFiltrados = categoriaActiva === '🎁 Combos' ? [] : productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes((busqueda || '').toLowerCase());
    const coincideCategoria = categoriaActiva === 'Todos' || p.categoria === categoriaActiva;
    return coincideBusqueda && coincideCategoria;
  });

  const ventasFiltradas = ventas.filter(v => {
    const fechaVenta = new Date(v.creado_en);
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;
    const coincideBusqueda = !busquedaVentas ||
      v.vendedor?.toLowerCase().includes(busquedaVentas.toLowerCase()) ||
      String(v.id).includes(busquedaVentas);
    const coincideDesde = !desde || fechaVenta >= desde;
    const coincideHasta = !hasta || fechaVenta <= hasta;
    return coincideBusqueda && coincideDesde && coincideHasta;
  });

  const verDetalle = async (id) => {
    try {
      const { data } = await api.get(`/ventas/${id}`);
      setDetalleVenta(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;

  // ── VISTA LISTA ──
  if (vista === 'lista') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f4f6f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: esCelular ? '10px 14px' : '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexShrink: 0, gap: '10px' }}>
          <h2 style={{ fontSize: esCelular ? '16px' : '18px', fontWeight: '700', color: '#1a1a2e' }}>Ventas</h2>
          <button style={{ padding: esCelular ? '7px 12px' : '8px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: esCelular ? '12px' : '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => setVista('pos')}>+ Nueva venta</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: esCelular ? '12px' : '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: esCelular ? '12px' : '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexDirection: esCelular ? 'column' : 'row', gap: '10px' }}>
            <input style={{ flex: 1, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              placeholder="Buscar por # o vendedor..." value={busquedaVentas} onChange={e => setBusquedaVentas(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>Desde:</label>
              <input type="date" style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px', outline: 'none' }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
              <label style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>Hasta:</label>
              <input type="date" style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px', outline: 'none' }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
              <button style={{ padding: '7px 12px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => { setFechaDesde(''); setFechaHasta(''); setBusquedaVentas(''); }}>Limpiar</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { icono: '🧾', valor: ventasFiltradas.length, label: 'Ventas' },
              { icono: '💰', valor: `S/ ${ventasFiltradas.reduce((s, v) => s + parseFloat(v.total), 0).toFixed(2)}`, label: 'Total' },
              { icono: '📅', valor: ventas.filter(v => new Date(v.creado_en).toDateString() === new Date().toDateString()).length, label: 'Hoy' },
            ].map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: esCelular ? '12px 8px' : '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center' }}>
                <div style={{ fontSize: esCelular ? '18px' : '22px' }}>{m.icono}</div>
                <div style={{ fontSize: esCelular ? '14px' : '18px', fontWeight: '700', color: '#1a1a2e', margin: '4px 0 2px' }}>{m.valor}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {esCelular ? (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ventasFiltradas.length === 0
                  ? <p style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>No hay ventas en este período</p>
                  : ventasFiltradas.map(v => (
                    <div key={v.id} style={{ border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ background: '#f0f4ff', color: '#185FA5', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>#{v.id}</span>
                        <span style={{ fontWeight: '700', color: '#2e7d32', fontSize: '15px' }}>S/ {parseFloat(v.total).toFixed(2)}</span>
                      </div>
                      {parseFloat(v.descuento) > 0 && (
                        <div style={{ fontSize: '11px', color: '#e53935', marginBottom: '4px' }}>🏷️ Descuento: S/ {parseFloat(v.descuento).toFixed(2)}</div>
                      )}
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>👤 {v.vendedor}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(v.creado_en).toLocaleString('es-PE')}</span>
                        <button style={{ padding: '5px 10px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                          onClick={() => verDetalle(v.id)}>Ver detalle</button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>{['# Venta', 'Vendedor', 'Método', 'Descuento', 'Total', 'Fecha', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600', fontSize: '12px' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {ventasFiltradas.length === 0
                    ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>No hay ventas en este período</td></tr>
                    : ventasFiltradas.map(v => (
                      <tr key={v.id}>
                        <td style={{ padding: '11px 14px', borderBottom: '1px solid #f5f5f5' }}><span style={{ background: '#f0f4ff', color: '#185FA5', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>#{v.id}</span></td>
                        <td style={{ padding: '11px 14px', borderBottom: '1px solid #f5f5f5' }}>{v.vendedor}</td>
                        <td style={{ padding: '11px 14px', borderBottom: '1px solid #f5f5f5' }}>{v.metodo_pago === 'efectivo' ? '💵' : v.metodo_pago === 'yape' ? '📱' : '💜'} {v.metodo_pago}</td>
                        <td style={{ padding: '11px 14px', borderBottom: '1px solid #f5f5f5', color: parseFloat(v.descuento) > 0 ? '#e53935' : '#aaa', fontWeight: parseFloat(v.descuento) > 0 ? '700' : '400' }}>
                          {parseFloat(v.descuento) > 0 ? `🏷️ S/ ${parseFloat(v.descuento).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '11px 14px', borderBottom: '1px solid #f5f5f5', fontWeight: '700', color: '#2e7d32' }}>S/ {parseFloat(v.total).toFixed(2)}</td>
                        <td style={{ padding: '11px 14px', borderBottom: '1px solid #f5f5f5', color: '#888', fontSize: '12px' }}>{new Date(v.creado_en).toLocaleString('es-PE')}</td>
                        <td style={{ padding: '11px 14px', borderBottom: '1px solid #f5f5f5' }}>
                          <button style={{ padding: '5px 12px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }} onClick={() => verDetalle(v.id)}>Ver</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {detalleVenta && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}
            onClick={() => setDetalleVenta(null)}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>Venta #{detalleVenta.id}</h3>
                <button style={{ background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer' }} onClick={() => setDetalleVenta(null)}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}><strong>Vendedor:</strong> {detalleVenta.vendedor}</p>
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}><strong>Método:</strong> {detalleVenta.metodo_pago}</p>
              <p style={{ fontSize: '13px', color: '#444', marginBottom: '14px' }}><strong>Fecha:</strong> {new Date(detalleVenta.creado_en).toLocaleString('es-PE')}</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr>{['Producto', 'Cant.', 'Precio', 'Subtotal'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600', fontSize: '12px' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {detalleVenta.detalle?.map((d, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{d.producto}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{d.cantidad}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>S/ {parseFloat(d.precio_unit).toFixed(2)}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5', fontWeight: '700' }}>S/ {parseFloat(d.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '10px 0', borderTop: '1px solid #f0f0f0', marginTop: '8px' }}>
                {parseFloat(detalleVenta.descuento) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#e53935', marginBottom: '6px', fontWeight: '600' }}>
                    <span>🏷️ Descuento aplicado</span>
                    <span>- S/ {parseFloat(detalleVenta.descuento).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '2px solid #f0f0f0' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700' }}>Total:</span>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: '#2e7d32' }}>S/ {parseFloat(detalleVenta.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── VISTA POS ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f4f6f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: esCelular ? '8px 12px' : '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <button style={{ padding: '7px 12px', background: '#f4f6f9', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
          onClick={() => setVista('lista')}>← Volver</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f4f6f9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '7px 12px', flex: 1 }}>
          <span>🔍</span>
          <input style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', minWidth: 0 }}
            placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        {!esCelular && (
          <>
            <button style={{ padding: '7px 10px', background: '#ffeaea', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', color: '#e53935' }}
              onClick={() => { setCarrito([]); setDescuento(''); }}>🗑️ LIMPIAR</button>
            <div style={{ textAlign: 'right', minWidth: '70px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#888' }}>Caja #1</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>{hora}</div>
              <div style={{ fontSize: '10px', color: '#aaa' }}>{fecha}</div>
            </div>
          </>
        )}
        {esCelular && (
          <button onClick={() => setCarritoAbierto(true)}
            style={{ padding: '8px 12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🛒 {carrito.length > 0 && <span style={{ background: '#e53935', borderRadius: '50%', padding: '1px 5px', fontSize: '10px', marginLeft: '4px' }}>{carrito.reduce((s, i) => s + i.cantidad, 0)}</span>}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: '#fff', borderBottom: '2px solid #e8e8e8', paddingLeft: '12px', flexShrink: 0, overflowX: 'auto' }}>
            {todasCategorias.map(cat => (
              <div key={cat}
                style={{ padding: esCelular ? '10px 12px' : '11px 16px', fontSize: esCelular ? '12px' : '13px', fontWeight: '600', color: categoriaActiva === cat ? '#1a1a2e' : '#999', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: `2px solid ${categoriaActiva === cat ? '#1a1a2e' : 'transparent'}`, marginBottom: '-2px' }}
                onClick={() => setCategoriaActiva(cat)}>
                {cat}
              </div>
            ))}
          </div>

          {categoriaActiva === '🎁 Combos' ? (
            <div style={{ display: 'grid', gridTemplateColumns: esCelular ? 'repeat(2,1fr)' : esTablet ? 'repeat(3,1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: esCelular ? '8px' : '12px', padding: esCelular ? '10px' : '14px', overflowY: 'auto', flex: 1, alignContent: 'start' }}>
              {combos.length === 0
                ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#aaa' }}><div style={{ fontSize: '40px', marginBottom: '10px' }}>🎁</div><p>No hay combos. Ve a Productos → Combos para crearlos.</p></div>
                : combos.map(combo => (
                  <div key={combo.id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.1)', cursor: 'pointer', border: '2px solid #ffd700' }}
                    onClick={() => agregarComboAlCarrito(combo)}>
                    <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', marginBottom: '6px' }}>🎁</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffd700' }}>{combo.nombre}</div>
                      {combo.descripcion && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{combo.descripcion}</div>}
                    </div>
                    <div style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#aaa', textDecoration: 'line-through' }}>S/ {parseFloat(combo.precio_normal).toFixed(2)}</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#e53935' }}>S/ {parseFloat(combo.precio).toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600', background: '#eafbea', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '4px' }}>Ahorras S/ {parseFloat(combo.descuento).toFixed(2)}</div>
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#888' }}>{combo.items.map((item, i) => <div key={i}>× {item.cantidad} {item.nombre}</div>)}</div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: esCelular ? 'repeat(2,1fr)' : esTablet ? 'repeat(3,1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: esCelular ? '8px' : '10px', padding: esCelular ? '10px' : '14px', overflowY: 'auto', flex: 1, alignContent: 'start' }}>
              {productosFiltrados.map(p => (
                <div key={p.id}
                  style={{ background: '#fff', borderRadius: '10px', padding: esCelular ? '10px 8px' : '10px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', cursor: p.stock === 0 ? 'not-allowed' : 'pointer', opacity: p.stock === 0 ? 0.4 : 1 }}
                  onClick={() => agregarAlCarrito(p)}>
                  {p.imagen
                    ? <img src={`http://localhost:3001${p.imagen}`} alt={p.nombre} style={{ width: esCelular ? '70px' : '90px', height: esCelular ? '70px' : '90px', objectFit: 'contain', borderRadius: '8px', marginBottom: '6px' }} />
                    : <div style={{ width: esCelular ? '70px' : '90px', height: esCelular ? '70px' : '90px', fontSize: esCelular ? '28px' : '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f9', borderRadius: '8px', margin: '0 auto 6px' }}>🧋</div>
                  }
                  <div style={{ fontSize: esCelular ? '11px' : '12px', fontWeight: '600', color: '#1a1a2e', marginBottom: '3px', lineHeight: '1.3' }}>{p.nombre}</div>
                  <div style={{ fontSize: esCelular ? '13px' : '14px', fontWeight: '700', color: '#444' }}>S/ {parseFloat(p.precio_venta).toFixed(2)}</div>
                  {p.stock === 0 && <div style={{ fontSize: '10px', color: '#e53935', marginTop: '2px' }}>Sin stock</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {!esCelular && (
          <CarritoPanel
            carrito={carrito} cambiarCantidad={cambiarCantidad} setCarrito={setCarrito}
            observacion={observacion} setObservacion={setObservacion}
            metodoPago={metodoPago} setMetodoPago={setMetodoPago}
            descuento={descuento} setDescuento={setDescuento}
            tipoDescuento={tipoDescuento} setTipoDescuento={setTipoDescuento}
            subtotal={subtotal} montoDescuento={montoDescuento} total={total}
            cobrar={cobrar} procesando={procesando} mensaje={mensaje} ancho={ancho} />
        )}
      </div>

      {esCelular && carritoAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setCarritoAbierto(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontWeight: '700', fontSize: '15px' }}>🛒 Pedido actual</span>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer' }} onClick={() => setCarritoAbierto(false)}>✕</button>
            </div>
            <CarritoPanel
              carrito={carrito} cambiarCantidad={cambiarCantidad} setCarrito={setCarrito}
              observacion={observacion} setObservacion={setObservacion}
              metodoPago={metodoPago} setMetodoPago={setMetodoPago}
              descuento={descuento} setDescuento={setDescuento}
              tipoDescuento={tipoDescuento} setTipoDescuento={setTipoDescuento}
              subtotal={subtotal} montoDescuento={montoDescuento} total={total}
              cobrar={cobrar} procesando={procesando} mensaje={mensaje} ancho={ancho} esCelular={true} />
          </div>
        </div>
      )}

      {esCelular && !carritoAbierto && carrito.length > 0 && (
        <button onClick={() => setCarritoAbierto(true)}
          style={{ position: 'fixed', bottom: '70px', right: '16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '50px', padding: '12px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 150 }}>
          🛒 {carrito.reduce((s, i) => s + i.cantidad, 0)} — S/ {total.toFixed(2)}
        </button>
      )}
    </div>
  );
}

function CarritoPanel({ carrito, cambiarCantidad, setCarrito, observacion, setObservacion, metodoPago, setMetodoPago, descuento, setDescuento, tipoDescuento, setTipoDescuento, subtotal, montoDescuento, total, cobrar, procesando, mensaje, ancho, esCelular }) {
  return (
    <div style={{ width: esCelular ? '100%' : ancho < 1024 ? '280px' : '300px', minWidth: esCelular ? 'auto' : '280px', background: '#fff', display: 'flex', flexDirection: 'column', borderLeft: esCelular ? 'none' : '1px solid #ececec', maxHeight: esCelular ? '90vh' : 'auto' }}>
      {!esCelular && (
        <div style={{ padding: '13px 16px', background: '#1a1a2e', color: '#fff', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          PEDIDO ACTUAL
          {carrito.length > 0 && <span style={{ background: '#e53935', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{carrito.length}</span>}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {carrito.length === 0
          ? <div style={{ textAlign: 'center', padding: '30px 0' }}><p style={{ fontSize: '28px' }}>🛒</p><p style={{ color: '#aaa', fontSize: '13px' }}>Selecciona productos</p></div>
          : carrito.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 4px', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: '22px', height: '22px', background: item.esCombo ? '#ffd700' : '#1a1a2e', color: item.esCombo ? '#1a1a2e' : '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>{item.cantidad}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a2e' }}>{item.nombre}</div>
                <div style={{ fontSize: '10px', color: '#aaa' }}>{item.categoria}</div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', minWidth: '52px', textAlign: 'right' }}>S/ {(parseFloat(item.precio_venta) * item.cantidad).toFixed(2)}</div>
              <div style={{ display: 'flex', gap: '3px' }}>
                <button style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9f9f9', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }} onClick={() => cambiarCantidad(item.id, -1)}>−</button>
                <button style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9f9f9', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }} onClick={() => cambiarCantidad(item.id, +1)}>+</button>
              </div>
            </div>
          ))}
      </div>

      <input style={{ margin: '6px 10px', padding: '7px 10px', border: '1px solid #ececec', borderRadius: '8px', fontSize: '12px', color: '#888', outline: 'none' }}
        placeholder="Agregar observación..." value={observacion} onChange={e => setObservacion(e.target.value)} />

      {/* DESCUENTO */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '8px', letterSpacing: '0.05em' }}>🏷️ DESCUENTO</div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select
            style={{ padding: '7px 8px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px', outline: 'none', background: '#fff', cursor: 'pointer' }}
            value={tipoDescuento} onChange={e => setTipoDescuento(e.target.value)}>
            <option value="monto">S/ Monto</option>
            <option value="porcentaje">% Porcentaje</option>
          </select>
          <input
            style={{ flex: 1, padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
            type="number" min="0" step="0.01"
            placeholder={tipoDescuento === 'porcentaje' ? 'Ej: 10' : 'Ej: 5.00'}
            value={descuento} onChange={e => setDescuento(e.target.value)} />
          {descuento && (
            <button style={{ padding: '7px 8px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => setDescuento('')}>✕</button>
          )}
        </div>
        {montoDescuento > 0 && (
          <div style={{ fontSize: '12px', color: '#e53935', marginTop: '6px', fontWeight: '600', background: '#ffeaea', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
            Descuento: - S/ {montoDescuento.toFixed(2)} {tipoDescuento === 'porcentaje' && `(${descuento}%)`}
          </div>
        )}
      </div>

      {/* TOTALES */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
          <span>SUBTOTAL</span><span>S/ {subtotal.toFixed(2)}</span>
        </div>
        {montoDescuento > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e53935', marginBottom: '4px', fontWeight: '600' }}>
            <span>DESCUENTO</span><span>- S/ {montoDescuento.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e8e8e8', fontWeight: '700', fontSize: '14px' }}>
          <span>TOTAL</span>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#e53935' }}>S/ {total.toFixed(2)}</span>
        </div>
      </div>

      {/* MÉTODOS DE PAGO */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 12px' }}>
        {[{ id: 'efectivo', label: 'EFECTIVO', icono: '💵' }, { id: 'yape', label: 'YAPE', icono: '📱' }, { id: 'plin', label: 'PLIN', icono: '💜' }].map(m => (
          <button key={m.id}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px', border: '1px solid #e0e0e0', borderRadius: '8px', background: metodoPago === m.id ? '#1a1a2e' : '#f9f9f9', color: metodoPago === m.id ? '#fff' : '#666', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
            onClick={() => setMetodoPago(m.id)}>
            <span style={{ fontSize: '16px' }}>{m.icono}</span><span>{m.label}</span>
          </button>
        ))}
      </div>

      {mensaje && (
        <div style={{ margin: '0 12px 8px', padding: '8px', borderRadius: '6px', fontSize: '12px', textAlign: 'center', background: mensaje.includes('✅') ? '#eafbea' : '#ffeaea', color: mensaje.includes('✅') ? '#2e7d32' : '#e53935' }}>{mensaje}</div>
      )}

      <button
        style={{ margin: '4px 12px 12px', padding: '14px', background: '#e53935', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: carrito.length === 0 || procesando ? 0.6 : 1 }}
        onClick={cobrar} disabled={carrito.length === 0 || procesando}>
        ✓ COBRAR S/ {total.toFixed(2)}
      </button>
    </div>
  );
}

export default Ventas;