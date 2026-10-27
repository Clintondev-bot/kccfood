# Revisión y correcciones — octubre 2026

## Errores corregidos

### Ventas y caja
- **Combos cobrados de más:** si un producto estaba suelto en el carrito y también dentro de un combo, las unidades del combo se guardaban con el precio normal. La venta quedaba registrada por más de lo que se cobró.
- **Stock negativo:** el stock se revisaba y se descontaba en dos pasos separados. Dos ventas al mismo tiempo, o el mismo producto en dos líneas, podían dejar el stock en negativo. Ahora el descuento se hace en un solo paso y solo si el stock alcanza.
- **Descuentos sin límite:** el servidor aceptaba descuentos negativos, mayores al subtotal o mayores a 100 %. Ahora los rechaza.
- **Cantidades y precios inválidos:** ahora se rechazan cantidades en 0, negativas o con decimales, y precios negativos.
- **Detalle de venta sin vendedor:** el campo "Vendedor" salía vacío.
- **Ventas sin cliente ocultas:** las ventas antiguas sin cliente no aparecían en la lista.
- **Filtro "Desde":** incluía ventas de la noche anterior por un problema de zona horaria.
- **Filtros por fecha incompletos:** solo se usaban las últimas 100 ventas. Ahora el servidor busca todas las ventas del rango elegido.

### Reportes
- **Reportes en cero de noche:** después de las 7 p. m. la fecha "de hoy" pasaba al día siguiente (UTC), y en pantalla aparecía un día vacío. Esto se corrigió en el frontend y en el backend.
- **Gráficos mensual y anual con montos bajos:** se calculaban solo con las últimas 100 ventas. Ahora usan el último año completo.
- **Gráficos y fecha elegida:** los gráficos ahora siguen la fecha elegida arriba.
- **Vista "mensual":** perdía los días 29 y 30.
- **Pantallas pequeñas:** las tarjetas ya no se aplastan en celular.

### Productos e inventario
- **Stock que no se guardaba:** al editar un producto, el campo "Stock" se ignoraba.
- **"Sin categoría" fallaba:** ahora el producto se guarda sin categoría.
- **Imagen grande o inválida:** ya no aparece el mensaje genérico "Error al guardar"; ahora se explica el motivo.
- **Recetas:** cualquier vendedor podía cambiarlas; ahora solo el administrador. Además se validan las cantidades y los ingredientes repetidos.
- **Ajuste de stock de ingredientes:** ahora se validan el tipo y la cantidad, y una salida no deja el stock bajo 0.
- **Compras:** el formulario ya no permite registrar la misma compra dos veces por doble clic, y se validan las cantidades.

### Clientes y usuarios
- **Historial de compras del cliente:** se quedaba en "Cargando..." porque faltaba la ruta en el servidor.
- **Usuarios desactivados:** antes podían seguir usando el sistema hasta que su sesión expiraba (8 h). Ahora pierden el acceso al instante.
- **Auto-bloqueo del admin:** el admin ya no puede desactivarse a sí mismo ni quitarse su rol.
- **Email repetido:** al editar un usuario con un email repetido ahora sale un mensaje claro.
- **Sesión expirada:** la app ahora vuelve al login. Antes se quedaba abierta pero sin datos.

### Otros
- **Errores técnicos ocultos:** el servidor ya no envía al navegador los mensajes internos de MySQL.
- **Archivos sin uso eliminados:** `Dashboard.js` e `Ingredientes.js` (este último tenía `localhost` fijo) y `App.css`.
- **Pruebas automáticas:** se agregaron para la lógica de ventas. Se ejecutan con `cd backend && npm test`.

## Pendientes recomendados (requieren cambios en la base de datos)
1. **Combos en la base de datos.** Hoy se guardan en el navegador (`localStorage`), así que un combo creado en la PC no aparece en el celular de la caja.
2. **Logo y nombre del negocio en la base de datos.** Pasa lo mismo: se guardan en cada navegador por separado.
3. **Precios desde el servidor.** El servidor confía en el precio que envía el navegador. Lo ideal es que use el `precio_venta` de la base de datos, y que el precio de los combos venga de una tabla `combos`.
4. **Observación de la venta.** El campo "Agregar observación" no se guarda; falta la columna `observacion` en `ventas`.
5. **Zona horaria de MySQL.** Si el servidor de la base de datos está en UTC, conviene fijar `time_zone = '-05:00'` para que `DATE(creado_en)` coincida con el día en Perú.
