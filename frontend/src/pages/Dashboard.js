import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

function Dashboard() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('diario');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [p, v] = await Promise.all([
          api.get('/productos'),
          api.get('/ventas'),
        ]);
        setProductos(p.data);
        setVentas(v.data);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  if (cargando) return <p>Cargando...</p>;

  // Métricas
  const hoy = new Date().toDateString();
  const ventasHoy = ventas.filter(v => new Date(v.creado_en).toDateString() === hoy);
  const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total), 0);
  const stockBajo = productos.filter(p => p.stock <= p.stock_minimo).length;

  // Función para agrupar ventas según el periodo seleccionado
  const obtenerDatosGrafico = () => {
    const ahora = new Date();

    if (periodo === 'diario') {
      // Últimas 24 horas agrupadas por hora
      const horas = {};
      for (let i = 23; i >= 0; i--) {
        const h = new Date(ahora);
        h.setHours(ahora.getHours() - i, 0, 0, 0);
        const key = `${h.getHours()}:00`;
        horas[key] = 0;
      }
      ventas.forEach(v => {
        const fecha = new Date(v.creado_en);
        const diffHoras = (ahora - fecha) / 3600000;
        if (diffHoras <= 24) {
          const key = `${fecha.getHours()}:00`;
          if (horas[key] !== undefined) {
            horas[key] += parseFloat(v.total);
          }
        }
      });
      return Object.entries(horas).map(([hora, total]) => ({ nombre: hora, total }));
    }

    if (periodo === 'semanal') {
      // Últimos 7 días
      const dias = {};
      const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(ahora);
        d.setDate(ahora.getDate() - i);
        const key = d.toDateString();
        dias[key] = { nombre: nombres[d.getDay()], total: 0 };
      }
      ventas.forEach(v => {
        const key = new Date(v.creado_en).toDateString();
        if (dias[key]) dias[key].total += parseFloat(v.total);
      });
      return Object.values(dias);
    }

    if (periodo === 'mensual') {
      // Últimos 30 días agrupados por semana
      const semanas = {
        'Semana 1': 0, 'Semana 2': 0, 'Semana 3': 0, 'Semana 4': 0,
      };
      ventas.forEach(v => {
        const fecha = new Date(v.creado_en);
        const diffDias = (ahora - fecha) / 86400000;
        if (diffDias <= 30) {
          const semana = Math.floor(diffDias / 7);
          const key = `Semana ${4 - semana}`;
          if (semanas[key] !== undefined) semanas[key] += parseFloat(v.total);
        }
      });
      return Object.entries(semanas).map(([nombre, total]) => ({ nombre, total }));
    }

    if (periodo === 'anual') {
      // Últimos 12 meses
      const meses = {};
      const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(ahora);
        d.setMonth(ahora.getMonth() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        meses[key] = { nombre: nombresMeses[d.getMonth()], total: 0 };
      }
      ventas.forEach(v => {
        const fecha = new Date(v.creado_en);
        const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
        if (meses[key]) meses[key].total += parseFloat(v.total);
      });
      return Object.values(meses);
    }
  };

  const datosGrafico = obtenerDatosGrafico();

  return (
    <div>
      <h2 style={styles.titulo}>Dashboard</h2>

      {/* Métricas */}
      <div style={styles.grid}>
        <div style={styles.tarjeta}>
          <p style={styles.tarjetaLabel}>Ventas hoy</p>
          <p style={styles.tarjetaValor}>S/ {totalHoy.toFixed(2)}</p>
        </div>
        <div style={styles.tarjeta}>
          <p style={styles.tarjetaLabel}>Transacciones hoy</p>
          <p style={styles.tarjetaValor}>{ventasHoy.length}</p>
        </div>
        <div style={styles.tarjeta}>
          <p style={styles.tarjetaLabel}>Total productos</p>
          <p style={styles.tarjetaValor}>{productos.length}</p>
        </div>
        <div style={{ ...styles.tarjeta, ...(stockBajo > 0 ? styles.tarjetaAlerta : {}) }}>
          <p style={styles.tarjetaLabel}>Stock bajo</p>
          <p style={{ ...styles.tarjetaValor, ...(stockBajo > 0 ? { color: '#e53935' } : {}) }}>
            {stockBajo}
          </p>
        </div>
      </div>

      {/* Gráfico de ventas */}
      <div style={styles.seccion}>
        <div style={styles.graficoHeader}>
          <h3 style={styles.seccionTitulo}>Ventas</h3>
          <div style={styles.filtros}>
            {['diario', 'semanal', 'mensual', 'anual'].map(p => (
              <button
                key={p}
                style={{
                  ...styles.filtroBton,
                  ...(periodo === p ? styles.filtroActivo : {}),
                }}
                onClick={() => setPeriodo(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={datosGrafico}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`S/ ${value.toFixed(2)}`, 'Ventas']}
            />
            <Bar dataKey="total" fill="#185FA5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Últimas ventas */}
      <div style={styles.seccion}>
        <h3 style={styles.seccionTitulo}>Últimas ventas</h3>
        {ventas.length === 0 ? (
          <p style={{ color: '#888', fontSize: '14px' }}>No hay ventas registradas aún</p>
        ) : (
          <table style={styles.tabla}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Vendedor</th>
                <th style={styles.th}>Método pago</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ventas.slice(0, 5).map(v => (
                <tr key={v.id}>
                  <td style={styles.td}>{v.id}</td>
                  <td style={styles.td}>{v.vendedor}</td>
                  <td style={styles.td}>{v.metodo_pago}</td>
                  <td style={styles.td}>S/ {parseFloat(v.total).toFixed(2)}</td>
                  <td style={styles.td}>{new Date(v.creado_en).toLocaleString('es-PE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stock bajo */}
      {stockBajo > 0 && (
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitulo}>⚠️ Productos con stock bajo</h3>
          <table style={styles.tabla}>
            <thead>
              <tr>
                <th style={styles.th}>Producto</th>
                <th style={styles.th}>Stock actual</th>
                <th style={styles.th}>Stock mínimo</th>
              </tr>
            </thead>
            <tbody>
              {productos.filter(p => p.stock <= p.stock_minimo).map(p => (
                <tr key={p.id}>
                  <td style={styles.td}>{p.nombre}</td>
                  <td style={{ ...styles.td, color: '#e53935', fontWeight: '600' }}>{p.stock}</td>
                  <td style={styles.td}>{p.stock_minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  titulo: { fontSize: '22px', fontWeight: '700', marginBottom: '20px', color: '#1a1a2e' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  tarjeta: { background: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  tarjetaAlerta: { borderLeft: '4px solid #e53935' },
  tarjetaLabel: { fontSize: '12px', color: '#888', marginBottom: '8px' },
  tarjetaValor: { fontSize: '26px', fontWeight: '700', color: '#1a1a2e' },
  seccion: { background: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' },
  seccionTitulo: { fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: '#1a1a2e' },
  graficoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  filtros: { display: 'flex', gap: '8px' },
  filtroBton: { padding: '6px 14px', borderRadius: '20px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', color: '#666' },
  filtroActivo: { background: '#185FA5', color: '#fff', border: '1px solid #185FA5' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: '600' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' },
};

export default Dashboard;