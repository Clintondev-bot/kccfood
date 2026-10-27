import React, { useEffect, useState } from 'react';
import api, { API_BASE_URL } from '../api/axios';

function Productos() {
  const [vista, setVista] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [combos, setCombos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [categoriaIngrediente, setCategoriaIngrediente] = useState('Todos');
  const [ancho, setAncho] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setAncho(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const esCelular = ancho < 768;

  // Modales productos
  const [modalProducto, setModalProducto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [formProducto, setFormProducto] = useState({ nombre: '', categoria_id: '', precio_costo: '', precio_venta: '', stock: '', stock_minimo: '5' });
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);

  // Modales ingredientes
  const [modalIngrediente, setModalIngrediente] = useState(false);
  const [ingredienteEditando, setIngredienteEditando] = useState(null);
  const [formIngrediente, setFormIngrediente] = useState({ nombre: '', stock: 0, stock_minimo: 0, unidad: 'oz', categoria: 'Insumos' });
  const [modalAjuste, setModalAjuste] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ id: '', tipo: 'entrada', cantidad: 0 });

  // Modal receta
  const [modalReceta, setModalReceta] = useState(false);
  const [productoReceta, setProductoReceta] = useState(null);
  const [recetaItems, setRecetaItems] = useState([]);

  // Modal combo
  const [modalCombo, setModalCombo] = useState(false);
  const [comboEditando, setComboEditando] = useState(null);
  const [formCombo, setFormCombo] = useState({ nombre: '', descripcion: '', precio: '' });
  const [comboItems, setComboItems] = useState([{ producto_id: '', cantidad: 1 }]);

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [p, c, i] = await Promise.all([
        api.get('/productos'),
        api.get('/productos/categorias'),
        api.get('/ingredientes'),
      ]);
      setProductos(p.data);
      setCategorias(c.data);
      setIngredientes(i.data);
      // Combos desde localStorage por ahora
      const combosGuardados = JSON.parse(localStorage.getItem('combos') || '[]');
      setCombos(combosGuardados);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const mostrarExito = (msg) => {
    setExito(msg);
    setTimeout(() => setExito(''), 3000);
  };

  // ── PRODUCTOS ──
  const abrirModalProducto = (producto = null) => {
    if (producto) {
      setProductoEditando(producto);
      setFormProducto({ nombre: producto.nombre, categoria_id: producto.categoria_id || '', precio_costo: producto.precio_costo, precio_venta: producto.precio_venta, stock: producto.stock, stock_minimo: producto.stock_minimo });
      setPreview(producto.imagen ? `${API_BASE_URL}${producto.imagen}` : null);
    } else {
      setProductoEditando(null);
      setFormProducto({ nombre: '', categoria_id: '', precio_costo: '', precio_venta: '', stock: '', stock_minimo: '5' });
      setPreview(null);
    }
    setImagen(null);
    setError('');
    setModalProducto(true);
  };

  const handleSubmitProducto = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const formData = new FormData();
      Object.entries(formProducto).forEach(([k, v]) => formData.append(k, v));
      if (imagen) formData.append('imagen', imagen);
      if (productoEditando) {
        await api.put(`/productos/${productoEditando.id}`, formData);
      } else {
        await api.post('/productos', formData);
      }
      setModalProducto(false);
      mostrarExito(productoEditando ? 'Producto actualizado ✓' : 'Producto creado ✓');
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const eliminarProducto = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      cargarDatos();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar el producto');
    }
  };

  // ── INGREDIENTES ──
  const abrirModalIngrediente = (ingrediente = null) => {
    if (ingrediente) {
      setIngredienteEditando(ingrediente);
      setFormIngrediente({ nombre: ingrediente.nombre, stock: ingrediente.stock, stock_minimo: ingrediente.stock_minimo, unidad: ingrediente.unidad, categoria: ingrediente.categoria || 'Insumos' });
    } else {
      setIngredienteEditando(null);
      setFormIngrediente({ nombre: '', stock: 0, stock_minimo: 0, unidad: 'oz', categoria: 'Insumos' });
    }
    setError('');
    setModalIngrediente(true);
  };

  const handleSubmitIngrediente = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (ingredienteEditando) {
        await api.put(`/ingredientes/${ingredienteEditando.id}`, formIngrediente);
      } else {
        await api.post('/ingredientes', formIngrediente);
      }
      setModalIngrediente(false);
      mostrarExito(ingredienteEditando ? 'Ingrediente actualizado ✓' : 'Ingrediente creado ✓');
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const eliminarIngrediente = async (id) => {
    if (!window.confirm('¿Eliminar este ingrediente?')) return;
    try {
      await api.delete(`/ingredientes/${id}`);
      cargarDatos();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar el ingrediente');
    }
  };

  const abrirAjuste = (ingrediente) => {
    setAjusteForm({ id: ingrediente.id, tipo: 'entrada', cantidad: 0 });
    setError('');
    setModalAjuste(true);
  };

  const guardarAjuste = async () => {
    try {
      await api.post('/ingredientes/ajuste', ajusteForm);
      setModalAjuste(false);
      mostrarExito('Stock ajustado ✓');
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al ajustar');
    }
  };

  // ── RECETAS ──
  const abrirReceta = async (producto) => {
    setProductoReceta(producto);
    setError('');
    try {
      const { data } = await api.get(`/ingredientes/receta/${producto.id}`);
      setRecetaItems(data.length > 0
        ? data.map(r => ({ ingrediente_id: r.ingrediente_id, cantidad: r.cantidad }))
        : [{ ingrediente_id: '', cantidad: 0 }]
      );
    } catch {
      setRecetaItems([{ ingrediente_id: '', cantidad: 0 }]);
    }
    setModalReceta(true);
  };

  const guardarReceta = async () => {
    try {
      const itemsValidos = recetaItems.filter(i => i.ingrediente_id && i.cantidad > 0);
      await api.post(`/ingredientes/receta/${productoReceta.id}`, { items: itemsValidos });
      setModalReceta(false);
      mostrarExito('Receta guardada ✓');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar receta');
    }
  };

  // ── COMBOS ──
  const abrirModalCombo = (combo = null) => {
    if (combo) {
      setComboEditando(combo);
      setFormCombo({ nombre: combo.nombre, descripcion: combo.descripcion || '', precio: combo.precio });
      setComboItems(combo.items || [{ producto_id: '', cantidad: 1 }]);
    } else {
      setComboEditando(null);
      setFormCombo({ nombre: '', descripcion: '', precio: '' });
      setComboItems([{ producto_id: '', cantidad: 1 }]);
    }
    setError('');
    setModalCombo(true);
  };

  const guardarCombo = (e) => {
    e.preventDefault();
    const itemsValidos = comboItems.filter(i => i.producto_id);
    if (itemsValidos.length < 2) {
      setError('Un combo debe tener al menos 2 productos');
      return;
    }

    const productosDelCombo = itemsValidos.map(i => {
      const prod = productos.find(p => p.id === parseInt(i.producto_id));
      return { producto_id: parseInt(i.producto_id), cantidad: parseInt(i.cantidad), nombre: prod?.nombre, precio_unit: parseFloat(prod?.precio_venta || 0) };
    });

    const precioNormal = productosDelCombo.reduce((s, i) => s + (i.precio_unit * i.cantidad), 0);
    const precioCombo = parseFloat(formCombo.precio);
    if (!(precioCombo >= 0)) {
      setError('Ingresa un precio válido para el combo');
      return;
    }
    if (productosDelCombo.some(i => !(i.cantidad > 0))) {
      setError('Las cantidades deben ser mayores a 0');
      return;
    }
    const nuevoCombo = {
      id: comboEditando ? comboEditando.id : Date.now(),
      nombre: formCombo.nombre,
      descripcion: formCombo.descripcion,
      precio: parseFloat(formCombo.precio),
      precio_normal: precioNormal,
      descuento: precioNormal - parseFloat(formCombo.precio),
      items: productosDelCombo,
    };

    let nuevosCombos;
    if (comboEditando) {
      nuevosCombos = combos.map(c => c.id === comboEditando.id ? nuevoCombo : c);
    } else {
      nuevosCombos = [...combos, nuevoCombo];
    }

    localStorage.setItem('combos', JSON.stringify(nuevosCombos));
    setCombos(nuevosCombos);
    setModalCombo(false);
    mostrarExito(comboEditando ? 'Combo actualizado ✓' : 'Combo creado ✓');
  };

  const eliminarCombo = (id) => {
    if (!window.confirm('¿Eliminar este combo?')) return;
    const nuevosCombos = combos.filter(c => c.id !== id);
    localStorage.setItem('combos', JSON.stringify(nuevosCombos));
    setCombos(nuevosCombos);
  };

  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaActiva === 'Todos' || p.categoria === categoriaActiva;
    return coincideBusqueda && coincideCategoria;
  });

  const productosConReceta = productos.filter(p =>
    p.categoria === 'Bubble Tea' || p.categoria === 'Sodas Italianas'
  );

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;

  const s = {
    input: { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '5px' },
    campo: { marginBottom: '14px' },
    btnGuardar: { padding: '9px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
    btnCancelar: { padding: '9px 18px', background: '#f4f6f9', color: '#444', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
    modalFondo: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: esCelular ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 100, padding: esCelular ? '0' : '16px' },
    modal: { background: '#fff', borderRadius: esCelular ? '20px 20px 0 0' : '12px', padding: esCelular ? '16px' : '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f4f6f9' }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexShrink: 0, gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f4f6f9', padding: '4px', borderRadius: '8px' }}>
          {[
            { id: 'productos', label: '📦 Productos' },
            { id: 'ingredientes', label: '🧪 Ingredientes' },
            { id: 'combos', label: '🎁 Combos' },
          ].map(v => (
            <button key={v.id}
              style={{ padding: esCelular ? '6px 8px' : '7px 14px', border: 'none', borderRadius: '6px', fontSize: esCelular ? '11px' : '13px', fontWeight: '600', cursor: 'pointer', background: vista === v.id ? '#fff' : 'transparent', color: vista === v.id ? '#1a1a2e' : '#888', boxShadow: vista === v.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
              onClick={() => setVista(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        {vista === 'productos' && <button style={{ ...s.btnGuardar, fontSize: esCelular ? '12px' : '13px', padding: esCelular ? '7px 10px' : '8px 16px' }} onClick={() => abrirModalProducto()}>+ Nuevo</button>}
        {vista === 'ingredientes' && <button style={{ ...s.btnGuardar, fontSize: esCelular ? '12px' : '13px', padding: esCelular ? '7px 10px' : '8px 16px' }} onClick={() => abrirModalIngrediente()}>+ Nuevo</button>}
        {vista === 'combos' && <button style={{ ...s.btnGuardar, fontSize: esCelular ? '12px' : '13px', padding: esCelular ? '7px 10px' : '8px 16px' }} onClick={() => abrirModalCombo()}>+ Nuevo combo</button>}
      </div>

      {exito && <div style={{ background: '#eafbea', color: '#2e7d32', padding: '10px 20px', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>{exito}</div>}

      {/* ── VISTA PRODUCTOS ── */}
      {vista === 'productos' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '7px 12px' }}>
              <span>🔍</span>
              <input style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', outline: 'none' }}
                placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', background: '#fff', borderBottom: '2px solid #e8e8e8', paddingLeft: '12px', flexShrink: 0, overflowX: 'auto', marginTop: '12px' }}>
            {['Todos', ...categorias.map(c => c.nombre)].map(cat => (
              <div key={cat}
                style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '600', color: categoriaActiva === cat ? '#1a1a2e' : '#999', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: `2px solid ${categoriaActiva === cat ? '#1a1a2e' : 'transparent'}`, marginBottom: '-2px' }}
                onClick={() => setCategoriaActiva(cat)}>
                {cat}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: esCelular ? 'repeat(2,1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: esCelular ? '10px' : '14px', padding: esCelular ? '12px' : '16px', overflowY: 'auto', flex: 1, alignContent: 'start' }}>
            {productosFiltrados.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                {/* Imagen con altura fija */}
                <div style={{ width: '100%', height: esCelular ? '130px' : '160px', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {p.imagen
                    ? <img src={`${API_BASE_URL}${p.imagen}`} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} />
                    : <span style={{ fontSize: esCelular ? '40px' : '50px' }}>📦</span>
                  }
                </div>
                {/* Info */}
                <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: esCelular ? '12px' : '13px', fontWeight: '700', color: '#1a1a2e' }}>{p.nombre}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{p.categoria || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: esCelular ? '14px' : '15px', fontWeight: '700', color: '#1a1a2e' }}>S/ {parseFloat(p.precio_venta).toFixed(2)}</span>
                    {!esCelular && <span style={{ fontSize: '11px', color: '#aaa' }}>Costo: S/ {parseFloat(p.precio_costo).toFixed(2)}</span>}
                  </div>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: p.stock <= p.stock_minimo ? '#ffeaea' : '#eafbea', color: p.stock <= p.stock_minimo ? '#e53935' : '#2e7d32', alignSelf: 'flex-start' }}>
                    {p.stock <= p.stock_minimo ? '⚠️' : '✓'} Stock: {p.stock}
                  </span>
                </div>
                {/* Acciones */}
                <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', borderTop: '1px solid #f5f5f5' }}>
                  {(p.categoria === 'Bubble Tea' || p.categoria === 'Sodas Italianas') && (
                    <button style={{ padding: '6px 8px', background: '#fff8e1', color: '#f57c00', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }} onClick={() => abrirReceta(p)}>📋</button>
                  )}
                  <button style={{ flex: 1, padding: '7px 6px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }} onClick={() => abrirModalProducto(p)}>✏️ Editar</button>
                  <button style={{ padding: '7px 10px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }} onClick={() => eliminarProducto(p.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA INGREDIENTES ── */}
      {vista === 'ingredientes' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '6px', padding: '12px 14px 8px', flexWrap: 'wrap', flexShrink: 0 }}>
            {['Todos', 'Toppings', 'Syrups', 'Insumos', 'Enceres', 'Tés'].map(cat => (
              <button key={cat} onClick={() => setCategoriaIngrediente(cat)} style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid #e0e0e0', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: categoriaIngrediente === cat ? '#1a1a2e' : '#f9f9f9', color: categoriaIngrediente === cat ? '#fff' : '#666' }}>{cat}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: esCelular ? '0 12px 12px' : '0 16px 16px', display: esCelular ? 'flex' : 'grid', flexDirection: esCelular ? 'column' : undefined, gridTemplateColumns: esCelular ? undefined : '1fr 1fr', gap: '16px' }}>

            {/* Tabla/cards ingredientes */}
            <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '14px' }}>Stock de ingredientes</h3>
              {esCelular ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ingredientes.filter(i => categoriaIngrediente === 'Todos' || i.categoria === categoriaIngrediente).map(i => (
                    <div key={i.id} style={{ border: '1px solid #f0f0f0', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px' }}>{i.nombre}</strong>
                        <span style={{ fontSize: '11px', background: '#f0f4ff', color: '#185FA5', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>{i.categoria}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        <span>Stock: <strong>{parseFloat(i.stock).toFixed(2)} {i.unidad}</strong></span>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: parseFloat(i.stock) <= parseFloat(i.stock_minimo) ? '#ffeaea' : '#eafbea', color: parseFloat(i.stock) <= parseFloat(i.stock_minimo) ? '#e53935' : '#2e7d32' }}>
                          {parseFloat(i.stock) <= parseFloat(i.stock_minimo) ? '⚠️ Bajo' : '✓ OK'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{ flex: 1, padding: '6px', background: '#e3f0fb', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }} onClick={() => abrirAjuste(i)}>+/- Stock</button>
                        <button style={{ padding: '6px 10px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => abrirModalIngrediente(i)}>✏️</button>
                        <button style={{ padding: '6px 10px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => eliminarIngrediente(i.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>{['Ingrediente', 'Categoría', 'Stock', 'Mínimo', 'Estado', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600', fontSize: '12px' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {ingredientes.filter(i => categoriaIngrediente === 'Todos' || i.categoria === categoriaIngrediente).map(i => (
                      <tr key={i.id}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}><strong>{i.nombre}</strong></td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}><span style={{ fontSize: '11px', background: '#f0f4ff', color: '#185FA5', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>{i.categoria}</span></td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{parseFloat(i.stock).toFixed(2)} {i.unidad}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{parseFloat(i.stock_minimo).toFixed(2)} {i.unidad}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: parseFloat(i.stock) <= parseFloat(i.stock_minimo) ? '#ffeaea' : '#eafbea', color: parseFloat(i.stock) <= parseFloat(i.stock_minimo) ? '#e53935' : '#2e7d32' }}>
                            {parseFloat(i.stock) <= parseFloat(i.stock_minimo) ? '⚠️ Bajo' : '✓ OK'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button style={{ padding: '4px 8px', background: '#e3f0fb', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }} onClick={() => abrirAjuste(i)}>+/- Stock</button>
                            <button style={{ padding: '4px 8px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => abrirModalIngrediente(i)}>✏️</button>
                            <button style={{ padding: '4px 8px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => eliminarIngrediente(i.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recetas */}
            <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginTop: esCelular ? '12px' : 0 }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' }}>Recetas</h3>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '14px' }}>Asigna ingredientes a cada Bubble Tea o Soda Italiana</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {productosConReceta.length === 0
                  ? <p style={{ color: '#aaa', fontSize: '13px' }}>No hay productos con receta</p>
                  : productosConReceta.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                      {p.imagen
                        ? <img src={`${API_BASE_URL}${p.imagen}`} alt={p.nombre} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px' }} />
                        : <div style={{ width: '44px', height: '44px', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '8px' }}>🧋</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{p.nombre}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{p.categoria}</div>
                      </div>
                      <button style={{ padding: '6px 12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }} onClick={() => abrirReceta(p)}>📋 Receta</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA COMBOS ── */}
      {vista === 'combos' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: esCelular ? '12px' : '16px' }}>
          {combos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎁</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#666' }}>No hay combos creados</div>
              <div style={{ fontSize: '13px' }}>Crea combos de productos con precio especial</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: esCelular ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {combos.map(combo => (
                <div key={combo.id} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', padding: '16px', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>🎁 {combo.nombre}</div>
                        {combo.descripcion && <div style={{ fontSize: '12px', opacity: 0.7 }}>{combo.descripcion}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#ffd700' }}>S/ {parseFloat(combo.precio).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6, textDecoration: 'line-through' }}>S/ {parseFloat(combo.precio_normal).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#4caf50', fontWeight: '700' }}>Ahorras S/ {parseFloat(combo.descuento).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '8px' }}>INCLUYE:</div>
                    {combo.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <span>× {item.cantidad} {item.nombre}</span>
                        <span style={{ color: '#888' }}>S/ {(item.precio_unit * item.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button style={{ flex: 1, padding: '8px', background: '#f0f4ff', color: '#185FA5', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }} onClick={() => abrirModalCombo(combo)}>✏️ Editar</button>
                      <button style={{ padding: '8px 12px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }} onClick={() => eliminarCombo(combo.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL PRODUCTO ── */}
      {modalProducto && (
        <div style={s.modalFondo} onClick={() => setModalProducto(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>{productoEditando ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer' }} onClick={() => setModalProducto(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitProducto}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{ width: '100px', height: '100px', background: '#f4f6f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {preview ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '40px' }}>📦</span>}
                </div>
                <label style={{ padding: '6px 16px', background: '#f4f6f9', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  {preview ? '📷 Cambiar imagen' : '📷 Subir imagen'}
                  <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { setImagen(f); setPreview(URL.createObjectURL(f)); } }} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={s.campo}><label style={s.label}>Nombre *</label><input style={s.input} value={formProducto.nombre} onChange={e => setFormProducto({ ...formProducto, nombre: e.target.value })} required /></div>
              <div style={s.campo}><label style={s.label}>Categoría</label>
                <select style={s.input} value={formProducto.categoria_id} onChange={e => setFormProducto({ ...formProducto, categoria_id: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={s.campo}><label style={s.label}>Precio costo</label><input style={s.input} type="number" step="0.01" min="0" value={formProducto.precio_costo} onChange={e => setFormProducto({ ...formProducto, precio_costo: e.target.value })} /></div>
                <div style={s.campo}><label style={s.label}>Precio venta *</label><input style={s.input} type="number" step="0.01" min="0" value={formProducto.precio_venta} onChange={e => setFormProducto({ ...formProducto, precio_venta: e.target.value })} required /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={s.campo}><label style={s.label}>Stock</label><input style={s.input} type="number" min="0" value={formProducto.stock} onChange={e => setFormProducto({ ...formProducto, stock: e.target.value })} /></div>
                <div style={s.campo}><label style={s.label}>Stock mínimo</label><input style={s.input} type="number" min="0" value={formProducto.stock_minimo} onChange={e => setFormProducto({ ...formProducto, stock_minimo: e.target.value })} /></div>
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" style={s.btnCancelar} onClick={() => setModalProducto(false)}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>{productoEditando ? 'Guardar cambios' : 'Crear producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL INGREDIENTE ── */}
      {modalIngrediente && (
        <div style={s.modalFondo} onClick={() => setModalIngrediente(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>{ingredienteEditando ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer' }} onClick={() => setModalIngrediente(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitIngrediente}>
              <div style={s.campo}><label style={s.label}>Nombre *</label><input style={s.input} value={formIngrediente.nombre} onChange={e => setFormIngrediente({ ...formIngrediente, nombre: e.target.value })} placeholder="Ej: Jarabe de maracuyá..." required /></div>
              <div style={s.campo}><label style={s.label}>Categoría</label>
                <select style={s.input} value={formIngrediente.categoria} onChange={e => setFormIngrediente({ ...formIngrediente, categoria: e.target.value })}>
                  {['Toppings', 'Syrups', 'Insumos', 'Enceres', 'Tés'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={s.campo}><label style={s.label}>Stock actual</label><input style={s.input} type="number" step="0.01" min="0" value={formIngrediente.stock} onChange={e => setFormIngrediente({ ...formIngrediente, stock: e.target.value })} /></div>
                <div style={s.campo}><label style={s.label}>Stock mínimo</label><input style={s.input} type="number" step="0.01" min="0" value={formIngrediente.stock_minimo} onChange={e => setFormIngrediente({ ...formIngrediente, stock_minimo: e.target.value })} /></div>
                <div style={s.campo}><label style={s.label}>Unidad</label>
                  <select style={s.input} value={formIngrediente.unidad} onChange={e => setFormIngrediente({ ...formIngrediente, unidad: e.target.value })}>
                    {['oz', 'ml', 'g', 'unidad'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" style={s.btnCancelar} onClick={() => setModalIngrediente(false)}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>{ingredienteEditando ? 'Guardar cambios' : 'Crear ingrediente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AJUSTE ── */}
      {modalAjuste && (
        <div style={s.modalFondo} onClick={() => setModalAjuste(false)}>
          <div style={{ ...s.modal, maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>Ajustar stock</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer' }} onClick={() => setModalAjuste(false)}>✕</button>
            </div>
            <div style={s.campo}><label style={s.label}>Tipo</label>
              <select style={s.input} value={ajusteForm.tipo} onChange={e => setAjusteForm({ ...ajusteForm, tipo: e.target.value })}>
                <option value="entrada">Entrada (agregar)</option>
                <option value="salida">Salida (descontar)</option>
              </select>
            </div>
            <div style={s.campo}><label style={s.label}>Cantidad</label><input style={s.input} type="number" step="0.01" min="0" value={ajusteForm.cantidad} onChange={e => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })} /></div>
            {error && <p style={{ color: '#e53935', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={s.btnCancelar} onClick={() => setModalAjuste(false)}>Cancelar</button>
              <button style={s.btnGuardar} onClick={guardarAjuste}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RECETA ── */}
      {modalReceta && (
        <div style={s.modalFondo} onClick={() => setModalReceta(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>Receta: {productoReceta?.nombre}</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer' }} onClick={() => setModalReceta(false)}>✕</button>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>Define cuánto de cada ingrediente se usa por unidad.</p>
            {recetaItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <select style={{ ...s.input, flex: 2 }} value={item.ingrediente_id} onChange={e => { const n = [...recetaItems]; n[i].ingrediente_id = e.target.value; setRecetaItems(n); }}>
                  <option value="">Seleccionar ingrediente</option>
                  {ingredientes.map(ing => <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.unidad})</option>)}
                </select>
                <input style={{ ...s.input, width: '80px', flex: 'none' }} type="number" step="0.01" min="0" placeholder="Cant." value={item.cantidad} onChange={e => { const n = [...recetaItems]; n[i].cantidad = e.target.value; setRecetaItems(n); }} />
                <button style={{ padding: '8px 10px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setRecetaItems(recetaItems.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
            <button style={{ padding: '7px 14px', background: '#e3f0fb', color: '#185FA5', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' }} onClick={() => setRecetaItems([...recetaItems, { ingrediente_id: '', cantidad: 0 }])}>+ Agregar ingrediente</button>
            {error && <p style={{ color: '#e53935', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={s.btnCancelar} onClick={() => setModalReceta(false)}>Cancelar</button>
              <button style={s.btnGuardar} onClick={guardarReceta}>Guardar receta</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COMBO ── */}
      {modalCombo && (
        <div style={s.modalFondo} onClick={() => setModalCombo(false)}>
          <div style={{ ...s.modal, maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>{comboEditando ? 'Editar combo' : 'Nuevo combo'}</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer' }} onClick={() => setModalCombo(false)}>✕</button>
            </div>
            <form onSubmit={guardarCombo}>
              <div style={s.campo}><label style={s.label}>Nombre del combo *</label><input style={s.input} value={formCombo.nombre} onChange={e => setFormCombo({ ...formCombo, nombre: e.target.value })} placeholder="Ej: Combo Bubble Tea + Snack" required /></div>
              <div style={s.campo}><label style={s.label}>Descripción</label><input style={s.input} value={formCombo.descripcion} onChange={e => setFormCombo({ ...formCombo, descripcion: e.target.value })} placeholder="Ej: Ahorra eligiendo juntos" /></div>
              <div style={s.campo}><label style={s.label}>Precio del combo (con descuento) *</label><input style={s.input} type="number" step="0.01" min="0" value={formCombo.precio} onChange={e => setFormCombo({ ...formCombo, precio: e.target.value })} placeholder="0.00" required /></div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={s.label}>Productos del combo *</label>
                  <button type="button" style={{ padding: '5px 12px', background: '#e3f0fb', color: '#185FA5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setComboItems([...comboItems, { producto_id: '', cantidad: 1 }])}>+ Agregar</button>
                </div>
                {comboItems.map((item, i) => {
                  const prod = productos.find(p => p.id === parseInt(item.producto_id));
                  return (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', background: '#f9f9f9', padding: '8px', borderRadius: '8px' }}>
                      <select style={{ ...s.input, flex: 2 }} value={item.producto_id} onChange={e => { const n = [...comboItems]; n[i].producto_id = e.target.value; setComboItems(n); }}>
                        <option value="">Seleccionar producto</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} — S/ {parseFloat(p.precio_venta).toFixed(2)}</option>)}
                      </select>
                      <input style={{ ...s.input, width: '60px', flex: 'none', textAlign: 'center' }} type="number" min="1" value={item.cantidad} onChange={e => { const n = [...comboItems]; n[i].cantidad = e.target.value; setComboItems(n); }} />
                      {prod && <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>S/ {(parseFloat(prod.precio_venta) * item.cantidad).toFixed(2)}</span>}
                      <button type="button" style={{ padding: '6px 8px', background: '#ffeaea', color: '#e53935', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setComboItems(comboItems.filter((_, idx) => idx !== i))}>✕</button>
                    </div>
                  );
                })}
                {comboItems.length > 0 && formCombo.precio && (
                  <div style={{ background: '#eafbea', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#2e7d32', fontWeight: '600' }}>
                    💰 Precio normal: S/ {comboItems.reduce((s, i) => { const p = productos.find(pr => pr.id === parseInt(i.producto_id)); return s + (p ? parseFloat(p.precio_venta) * parseInt(i.cantidad || 1) : 0); }, 0).toFixed(2)}
                    {' → '}Precio combo: S/ {parseFloat(formCombo.precio || 0).toFixed(2)}
                    {' → '}Descuento: S/ {(comboItems.reduce((s, i) => { const p = productos.find(pr => pr.id === parseInt(i.producto_id)); return s + (p ? parseFloat(p.precio_venta) * parseInt(i.cantidad || 1) : 0); }, 0) - parseFloat(formCombo.precio || 0)).toFixed(2)}
                  </div>
                )}
              </div>

              {error && <p style={{ color: '#e53935', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" style={s.btnCancelar} onClick={() => setModalCombo(false)}>Cancelar</button>
                <button type="submit" style={s.btnGuardar}>{comboEditando ? 'Guardar cambios' : 'Crear combo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Productos;