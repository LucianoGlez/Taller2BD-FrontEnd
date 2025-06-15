// app.js
console.log('✅ app.js loaded');
const API = 'http://localhost:3000/api';
let productsCache = [];

// — Productos —
async function loadProductos() {
  const res = await fetch(`${API}/productos`);
  const productos = await res.json();
  productsCache = productos;
  const tbody = document.getElementById('lista-productos');
  tbody.innerHTML = '';
  if (!productos.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay productos activos</td></tr>';
    return;
  }
  productos.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nombre}</td>
      <td>${p.stock}</td>
      <td>${parseFloat(p.precio).toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1" onclick="promptUpdatePrice(${p.id}, ${parseFloat(p.precio)})">Editar Precio</button>
        <button class="btn btn-sm btn-info me-1" onclick="promptAddStock(${p.id})">+ Stock</button>
        <button class="btn btn-sm btn-danger" onclick="disableProduct(${p.id})">Deshabilitar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('form-nuevo-producto').addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = document.getElementById('p-nombre').value.trim();
  const stock = parseInt(document.getElementById('p-stock').value, 10);
  const precio = parseFloat(document.getElementById('p-precio').value);
  if (!nombre || isNaN(stock) || isNaN(precio)) return alert('Completa todos los campos con valores válidos.');
  try {
    const res = await fetch(`${API}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, stock, precio })
    });
    if (!res.ok) throw new Error('Error ' + res.status);
    e.target.reset();
    await loadProductos();
  } catch (err) {
    alert('Error al crear producto: ' + err);
  }
});

function promptUpdatePrice(id, current) {
  const nuevo = prompt(`Precio actual: ${current.toFixed(2)}\nIngresa el nuevo precio:`);
  if (nuevo === null) return;
  const precio = parseFloat(nuevo);
  if (isNaN(precio)) return alert('Precio inválido');
  fetch(`${API}/productos/precio/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ precio })
  })
    .then(res => res.ok ? loadProductos() : Promise.reject())
    .catch(() => alert('Error al actualizar precio'));
}

function promptAddStock(id) {
  const inc = prompt('¿Cuántas unidades añadir al stock?');
  if (inc === null) return;
  const cantidad = parseInt(inc);
  if (isNaN(cantidad) || cantidad <= 0) return alert('Cantidad inválida');
  fetch(`${API}/productos/stock/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cantidad })
  })
    .then(res => res.ok ? loadProductos() : Promise.reject())
    .catch(() => alert('Error al incrementar stock'));
}

function disableProduct(id) {
  if (!confirm(`¿Deshabilitar producto ID ${id}?`)) return;
  fetch(`${API}/productos/${id}`, { method: 'DELETE' }).then(loadProductos);
}

// — Clientes —
async function loadClients() {
  const res = await fetch(`${API}/clientes`);
  const clientes = await res.json();
  renderClients(clientes);
  const sel = document.getElementById('pedido-cliente');
  sel.innerHTML = '';
  clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.text = `${c.id}: ${c.nombre}`;
    sel.add(opt);
  });
}

function renderClients(clientes) {
  const ul = document.getElementById('lista-clientes');
  ul.innerHTML = '';
  clientes.forEach(c => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${c.id} – ${c.nombre} (${c.tipo})</span>
      <div>
        <button class="btn btn-sm btn-warning me-1" onclick="promptUpdateClientType(${c.id}, '${c.tipo}')">Cambiar Tipo</button>
        <button class="btn btn-sm btn-danger" onclick="disableClient(${c.id})">Desactivar</button>
      </div>`;
    ul.appendChild(li);
  });
}

document.getElementById('form-nuevo-cliente').addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = document.getElementById('c-nombre').value.trim();
  const ciudad = document.getElementById('c-ciudad').value.trim();
  const tipo = document.getElementById('c-tipo').value;
  if (!nombre || !ciudad) {
    alert('Por favor completa todos los campos.');
    return;
  }
  try {
    const res = await fetch(`${API}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, ciudad, tipo })
    });
    const data = await res.json();
    if (!res.ok) throw data;
    e.target.reset();
    await loadClients();
  } catch (err) {
    alert('Error al crear cliente: ' + (err.message || JSON.stringify(err)));
  }
});

function loadAllClients()    { loadClients(); }
function loadNormalClients() { fetch(`${API}/clientes/normales`).then(r=>r.json()).then(renderClients); }
function loadPremiumClients(){ fetch(`${API}/clientes/premium`).then(r=>r.json()).then(renderClients); }

function promptUpdateClientType(id, current) {
  const nuevo = prompt(`Tipo actual: ${current}\nNuevo tipo (normal/premium):`);
  if (!nuevo) return;
  fetch(`${API}/clientes/estado/${id}`, {
    method: 'PUT',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ tipo: nuevo })
  }).then(loadClients);
}

function disableClient(id) {
  if (!confirm(`¿Desactivar cliente ID ${id}?`)) return;
  fetch(`${API}/clientes/${id}`, { method: 'DELETE' }).then(loadClients);
}

// — Pedidos Dinámicos —
function addOrderItem() {
  const container = document.getElementById('order-items');
  const div = document.createElement('div');
  div.className = 'row g-3 align-items-end order-item mb-2';
  div.innerHTML = `
    <div class="col-md-5">
      <label class="form-label">Producto</label>
      <select class="form-select item-producto" required>
        <option value="" disabled selected>Selecciona...</option>
        ${productsCache.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
      </select>
    </div>
    <div class="col-md-3">
      <label class="form-label">Cantidad</label>
      <input type="number" class="form-control item-cantidad" min="1" value="1" required>
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-outline-danger remove-item">🗑️</button>
    </div>
  `;
  container.appendChild(div);
  div.querySelector('.remove-item').onclick = () => div.remove();
}

document.getElementById('add-item').onclick = addOrderItem;

document.getElementById('form-nuevo-pedido').addEventListener('submit', async e => {
  e.preventDefault();
  const items = Array.from(document.querySelectorAll('.order-item')).map(row => ({
    producto_id: parseInt(row.querySelector('.item-producto').value),
    cantidad: parseInt(row.querySelector('.item-cantidad').value)
  }));
  const cliente_id = +document.getElementById('pedido-cliente').value;
  const fecha = document.getElementById('pedido-fecha').value;
  if (!items.length || !cliente_id || !fecha) return alert('Completa todos los datos del pedido');
  try {
    const res = await fetch(`${API}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id, fecha, productos: items })
    });
    const data = await res.json();
    if (!res.ok) throw data;
    document.getElementById('pedido-respuesta').textContent = JSON.stringify(data, null, 2);
    e.target.reset();
    document.getElementById('order-items').innerHTML = '';
    addOrderItem();
    await loadProductos();
  } catch (err) {
    alert('Error al registrar pedido: ' + (err.message || JSON.stringify(err)));
  }
});

// — Estadísticas —
document.getElementById('btn-weekly').addEventListener('click', async () => {
  const data = await (await fetch(`${API}/productos/vendidos/semana`)).json();
  renderStatsTable(data, 'Vendidos Esta Semana');
});

document.getElementById('btn-annual').addEventListener('click', async () => {
  const data = await (await fetch(`${API}/productos/vendidos/anual`)).json();
  renderStatsTable(data, 'Resumen Anual de Ventas');
});

function renderStatsTable(data, title) {
  const div = document.getElementById('estadistica-content');
  if (!data.length) return div.innerHTML = '<p class="text-center">Sin datos</p>';
  let html = `<h3 class="h6">${title}</h3><div class="table-responsive"><table class="table table-sm mb-0"><thead><tr>`;
  Object.keys(data[0]).forEach(k => html += `<th>${k.replace(/_/g, ' ')}</th>`);
  html += '</tr></thead><tbody>';
  data.forEach(row => {
    html += '<tr>' + Object.values(row).map(v => `<td>${v}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table></div>';
  div.innerHTML = html;
}

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  await loadProductos();
  await loadClients();
  addOrderItem();
});
