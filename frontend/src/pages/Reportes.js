import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { fechaLocal, inicioDelDia, sumarDias } from '../utils/fechas';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

function Reportes() {
  const [resumen, setResumen] = useState(null);
  const [topProductos, setTopProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [periodo, setPeriodo] = useState('semanal');
  const [periodoTop, setPeriodoTop] = useState('diario');
  // Fecha local (antes era UTC: de noche mostraba el día siguiente, vacío)
  const [fecha, setFecha] = useState(fechaLocal());
  const [cargando, setCargando] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarDatos(); }, [fecha]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarTopProductos(); }, [fecha, periodoTop]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [r, v, prods] = await Promise.all([
        api.get(`/reportes/resumen?fecha=${fecha}`),
        // Traemos el último año completo hasta la fecha elegida. Antes solo
        // llegaban las últimas 100 ventas y los gráficos mensual/anual salían
        // con montos mucho menores a los reales.
        api.get(`/ventas?desde=${sumarDias(fecha, -365)}&hasta=${fecha}`),
        api.get('/productos'),
      ]);
      setResumen(r.data);
      setVentas(v.data);
      setProductos(prods.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const cargarTopProductos = async () => {
    try {
      const { data } = await api.get(`/reportes/productos-mas-vendidos?fecha=${fecha}&periodo=${periodoTop}`);
      setTopProductos(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Genera datos del gráfico según el periodo, tomando como referencia la
  // fecha elegida arriba (antes el gráfico siempre usaba "ahora" e ignoraba
  // la fecha seleccionada).
  const obtenerDatosGrafico = () => {
    const ref = inicioDelDia(fecha); // 00:00 del día elegido
    const total = v => parseFloat(v.total) || 0;

    if (periodo === 'diario') {
      // Las 24 horas del día elegido
      const horas = Array.from({ length: 24 }, (_, h) => ({ nombre: `${h}:00`, total: 0 }));
      ventas.forEach(v => {
        const d = new Date(v.creado_en);
        if (fechaLocal(d) === fecha) horas[d.getHours()].total += total(v);
      });
      return horas;
    }

    if (periodo === 'semanal') {
      // Los 7 días que terminan en la fecha elegida
      const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dias = {};
      for (let i = 6; i >= 0; i--) {
        const key = sumarDias(fecha, -i);
        dias[key] = { nombre: `${nombres[inicioDelDia(key).getDay()]} ${key.slice(8)}`, total: 0 };
      }
      ventas.forEach(v => {
        const key = fechaLocal(new Date(v.creado_en));
        if (dias[key]) dias[key].total += total(v);
      });
      return Object.values(dias);
    }

    if (periodo === 'mensual') {
      // Las 4 semanas (28 días) que terminan en la fecha elegida.
      // Antes los días 29-30 se perdían por un error de cálculo.
      const semanas = [1, 2, 3, 4].map(n => ({ nombre: `Semana ${n}`, total: 0 }));
      const finDia = new Date(ref); finDia.setDate(finDia.getDate() + 1);
      ventas.forEach(v => {
        const diffDias = Math.floor((finDia - new Date(v.creado_en)) / 86400000);
        if (diffDias >= 0 && diffDias < 28) semanas[3 - Math.floor(diffDias / 7)].total += total(v);
      });
      return semanas;
    }

    // anual: los 12 meses que terminan en el mes de la fecha elegida
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      meses[`${d.getFullYear()}-${d.getMonth()}`] = { nombre: nombresMeses[d.getMonth()], total: 0 };
    }
    ventas.forEach(v => {
      const d = new Date(v.creado_en);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (meses[key]) meses[key].total += total(v);
    });
    return Object.values(meses);
  };

  const stockBajo = productos.filter(p => p.stock <= p.stock_minimo);

  const etiquetaPeriodoTop = {
    diario: 'del día',
    semanal: 'últimos 7 días',
    mensual: 'últimos 30 días',
    anual: 'últimos 12 meses',
  }[periodoTop];

  if (cargando) return <p style={{ padding: '20px' }}>Cargando...</p>;

  return (
    <div style={styles.contenedor}>

      {/* TOPBAR */}
      <div style={styles.topbar}>
        <h2 style={styles.titulo}>Reportes</h2>
        <div style={styles.fechaWrap}>
          <label style={styles.fechaLabel}>Fecha:</label>
          <input
            type="date"
            style={styles.fechaInput}
            value={fecha}
            onChange={e => setFecha(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.body}>

        {/* MÉTRICAS */}
        <div style={styles.grid4}>
          <div style={styles.metrica}>
            <div style={styles.metricaIcono}>💰</div>
            <div style={styles.metricaValor}>S/ {parseFloat(resumen?.total_dinero || 0).toFixed(2)}</div>
            <div style={styles.metricaLabel}>Total vendido del día</div>
          </div>
          <div style={styles.metrica}>
            <div style={styles.metricaIcono}>🧾</div>
            <div style={styles.metricaValor}>{resumen?.total_ventas || 0}</div>
            <div style={styles.metricaLabel}>Ventas del día</div>
          </div>
          <div style={styles.metrica}>
            <div style={styles.metricaIcono}>💵</div>
            <div style={styles.metricaValor}>S/ {parseFloat(resumen?.efectivo || 0).toFixed(2)}</div>
            <div style={styles.metricaLabel}>Efectivo</div>
          </div>
          <div style={styles.metrica}>
            <div style={styles.metricaIcono}>📱</div>
            <div style={styles.metricaValor}>S/ {parseFloat(resumen?.yape || 0).toFixed(2)}</div>
            <div style={styles.metricaLabel}>Yape</div>
          </div>
        </div>

        {/* GRÁFICO CON FILTRO DE PERIODO */}
        <div style={styles.card}>
          <div style={styles.cardHeaderFlex}>
            <h3 style={styles.cardTitulo}>Ventas</h3>
            <div style={styles.filtros}>
              {['diario', 'semanal', 'mensual', 'anual'].map(p => (
                <button
                  key={p}
                  style={{ ...styles.btnFiltro, ...(periodo === p ? styles.btnFiltroActivo : {}) }}
                  onClick={() => setPeriodo(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={obtenerDatosGrafico()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`S/ ${Number(v).toFixed(2)}`, 'Total']} />
              <Bar dataKey="total" fill="#1a1a2e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.grid2}>

          {/* ÚLTIMAS VENTAS */}
          <div style={styles.card}>
            <h3 style={styles.cardTitulo}>Últimas ventas</h3>
            {ventas.length === 0 ? (
              <p style={styles.sinDatos}>No hay ventas registradas</p>
            ) : (
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Vendedor</th>
                    <th style={styles.th}>Método</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.slice(0, 6).map(v => (
                    <tr key={v.id}>
                      <td style={styles.td}>{v.id}</td>
                      <td style={styles.td}>{v.vendedor}</td>
                      <td style={styles.td}>{v.metodo_pago}</td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>S/ {parseFloat(v.total).toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#aaa', fontSize: '11px' }}>
                        {new Date(v.creado_en).toLocaleString('es-PE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* PRODUCTOS MÁS VENDIDOS */}
          <div style={styles.card}>
            <div style={styles.cardHeaderFlex}>
              <h3 style={styles.cardTitulo}>Productos más vendidos ({etiquetaPeriodoTop})</h3>
              <div style={styles.filtros}>
                {['diario', 'semanal', 'mensual', 'anual'].map(p => (
                  <button
                    key={p}
                    style={{ ...styles.btnFiltro, ...(periodoTop === p ? styles.btnFiltroActivo : {}) }}
                    onClick={() => setPeriodoTop(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {topProductos.length === 0 ? (
              <p style={styles.sinDatos}>No hay ventas en este período</p>
            ) : (
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Producto</th>
                    <th style={styles.th}>Unidades</th>
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductos.map((p, i) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        <span style={{ ...styles.ranking, background: i < 3 ? '#1a1a2e' : '#f0f0f0', color: i < 3 ? '#fff' : '#888' }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={styles.td}>{p.nombre}</td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{p.total_vendido}</td>
                      <td style={{ ...styles.td, color: '#2e7d32', fontWeight: '700' }}>
                        S/ {parseFloat(p.total_ingreso).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MÉTODOS DE PAGO */}
        <div style={styles.card}>
          <h3 style={styles.cardTitulo}>Desglose por método de pago</h3>
          <div style={styles.metodosWrap}>
            {[
              { label: 'Efectivo', valor: resumen?.efectivo || 0, color: '#2e7d32', icono: '💵' },
              { label: 'Yape',     valor: resumen?.yape || 0,     color: '#7b1fa2', icono: '📱' },
            ].map(m => {
              const totalDia = parseFloat(resumen?.total_dinero || 1);
              const pct = Math.round((parseFloat(m.valor) / totalDia) * 100) || 0;
              return (
                <div key={m.label} style={styles.metodoFila}>
                  <span style={styles.metodoIcono}>{m.icono}</span>
                  <span style={styles.metodoLabel}>{m.label}</span>
                  <div style={styles.barraWrap}>
                    <div style={{ ...styles.barra, width: `${pct}%`, background: m.color }} />
                  </div>
                  <span style={styles.metodoPct}>{pct}%</span>
                  <span style={styles.metodoValor}>S/ {parseFloat(m.valor).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* STOCK BAJO */}
        {stockBajo.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitulo}>⚠️ Productos con stock bajo</h3>
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Stock actual</th>
                  <th style={styles.th}>Stock mínimo</th>
                </tr>
              </thead>
              <tbody>
                {stockBajo.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.nombre}</td>
                    <td style={{ ...styles.td, color: '#e53935', fontWeight: '700' }}>{p.stock}</td>
                    <td style={styles.td}>{p.stock_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  contenedor: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f4f6f9' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexShrink: 0, flexWrap: 'wrap', gap: '8px' },
  titulo: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e' },
  fechaWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  fechaLabel: { fontSize: '13px', color: '#888' },
  fechaInput: { padding: '7px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  body: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
  metrica: { background: '#fff', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center' },
  metricaIcono: { fontSize: '24px', marginBottom: '8px' },
  metricaValor: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' },
  metricaLabel: { fontSize: '12px', color: '#888' },
  card: { background: '#fff', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflowX: 'auto' },
  cardHeaderFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' },
  cardTitulo: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  filtros: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  btnFiltro: { padding: '5px 12px', borderRadius: '20px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '12px', color: '#888', cursor: 'pointer' },
  btnFiltroActivo: { background: '#1a1a2e', color: '#fff', border: '1px solid #1a1a2e' },
  sinDatos: { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '16px' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600', fontSize: '12px' },
  td: { padding: '10px', borderBottom: '1px solid #f5f5f5', color: '#333' },
  ranking: { width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' },
  metodosWrap: { display: 'flex', flexDirection: 'column', gap: '14px' },
  metodoFila: { display: 'flex', alignItems: 'center', gap: '10px' },
  metodoIcono: { fontSize: '18px' },
  metodoLabel: { width: '60px', fontSize: '13px', fontWeight: '600' },
  barraWrap: { flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' },
  barra: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  metodoPct: { fontSize: '12px', color: '#888', width: '35px', textAlign: 'right' },
  metodoValor: { fontSize: '13px', fontWeight: '700', width: '70px', textAlign: 'right' },
};

export default Reportes;