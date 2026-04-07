import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cinco-fuegos-pro-v6";

// -------------------- DATOS INICIALES --------------------

const initialState = {
  businessName: "Cinco Fuegos",
  products: [
    {
      id: 1,
      name: "Fogonero con ruedas 1.20",
      category: "Fogoneros",
      price: 750000,
      cost: 420000,
      includes: "Incluye media parrilla y cruz de asador",
      active: true,
    },
    {
      id: 2,
      name: "Fogonero plano 1.20",
      category: "Fogoneros",
      price: 650000,
      cost: 350000,
      includes: "Incluye media parrilla y cruz de asador",
      active: true,
    },
    {
      id: 3,
      name: "Provolera",
      category: "Accesorios",
      price: 25000,
      cost: 12000,
      includes: "",
      active: true,
    },
  ],
  vendors: [
    { id: 1, name: "Lucas", commissionRate: 0.15, active: true },
    { id: 2, name: "Milagros", commissionRate: 0.15, active: true },
    { id: 3, name: "Nacho", commissionRate: 0.15, active: true },
    { id: 4, name: "Joaco", commissionRate: 0.15, active: true },
    { id: 5, name: "Papá", commissionRate: 0, active: true },
  ],
  customers: [],
  movements: [],
  chat: [
    {
      id: 1,
      author: "app",
      text:
        "Probá mensajes como: 'agrega cliente Juan telefono 1123456789 direccion Palermo 1234', 'vendi fogonero con ruedas 1.20 a Juan por Lucas', 'seña 200000 de Juan', 'pague hierro 300000', 'pague comision a Lucas', 'agrega producto Mesa de comedor a 450000 costo 260000 categoria Muebleria'.",
      createdAt: new Date().toISOString(),
    },
  ],
};

// -------------------- HELPERS --------------------

function formatMoney(n) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function formatDate(d) {
  return new Date(d).toLocaleString("es-AR");
}

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[$]/g, "")
    .trim();
}

function getAllAmounts(text) {
  const matches = text.match(/\d[\d.]*/g);
  if (!matches) return [];
  return matches.map((v) => Number(v.replace(/\./g, ""))).filter(Boolean);
}

function getAmount(text) {
  const values = getAllAmounts(text);
  return values.length ? Math.max(...values) : 0;
}

function inferVendor(text, vendors) {
  const t = normalize(text);
  return vendors.find((v) => t.includes(normalize(v.name))) || null;
}

function inferCustomer(text, customers) {
  const t = normalize(text);
  return customers.find((c) => t.includes(normalize(c.name))) || null;
}

function inferProduct(text, products) {
  const t = normalize(text);

  const exact = [...products]
    .sort((a, b) => b.name.length - a.name.length)
    .find((p) => t.includes(normalize(p.name)));

  if (exact) return exact;

  if (t.includes("ruedas")) {
    return products.find((p) => normalize(p.name).includes("ruedas")) || null;
  }
  if (t.includes("plano")) {
    return products.find((p) => normalize(p.name).includes("plano")) || null;
  }
  if (t.includes("provolera")) {
    return products.find((p) => normalize(p.name).includes("provolera")) || null;
  }

  return null;
}

function inferExpenseCategory(text) {
  const t = normalize(text);
  if (t.includes("hierro") || t.includes("chapa") || t.includes("material")) return "material";
  if (t.includes("mano") || t.includes("soldador") || t.includes("pintor")) return "mano de obra";
  if (t.includes("envio") || t.includes("envío") || t.includes("flete")) return "envio";
  if (t.includes("comision")) return "comision";
  if (t.includes("publicidad") || t.includes("meta") || t.includes("instagram") || t.includes("facebook")) return "publicidad";
  if (t.includes("alquiler")) return "alquiler";
  if (t.includes("nafta") || t.includes("combustible")) return "nafta";
  if (t.includes("herramienta")) return "herramientas";
  return "otros";
}

function parseAddCustomer(text) {
  const nameMatch = text.match(/agrega cliente (.+?) telefono/i);
  const phoneMatch = text.match(/telefono (\d+)/i);
  const addressMatch = text.match(/direccion (.+)/i);

  if (!nameMatch) return null;

  return {
    name: nameMatch[1].trim(),
    phone: phoneMatch?.[1] || "",
    address: addressMatch?.[1]?.trim() || "",
  };
}

function parseAddProduct(text) {
  const original = text.trim();
  const nameMatch =
    original.match(/agrega producto (.+?) a /i) ||
    original.match(/nuevo producto (.+?) a /i);

  const allAmounts = getAllAmounts(original);
  const price = allAmounts[0] || 0;
  const costMatch = original.match(/costo (\d[\d.]*)/i);
  const categoryMatch = original.match(/categoria ([A-Za-zÁÉÍÓÚáéíóúñÑ ]+)/i);

  if (!nameMatch || !price) return null;

  return {
    name: nameMatch[1].trim(),
    price,
    cost: costMatch ? Number(costMatch[1].replace(/\./g, "")) : 0,
    category: categoryMatch?.[1]?.trim() || "General",
  };
}

// -------------------- COMPONENTES UI --------------------

function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
      {subtitle ? <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>{subtitle}</p> : null}
    </div>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricTitle}>{title}</div>
      <div style={styles.metricValue}>{value}</div>
      {subtitle ? <div style={styles.metricSubtitle}>{subtitle}</div> : null}
    </div>
  );
}

// -------------------- APP --------------------

export default function App() {
  const [state, setState] = useState(initialState);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function addChat(author, text, baseState = state) {
    return {
      ...baseState,
      chat: [
        ...baseState.chat,
        {
          id: Date.now() + Math.random(),
          author,
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  function handleMessage() {
    if (!message.trim()) return;

    let nextState = addChat("yo", message, state);
    const text = message.trim();
    const t = normalize(text);
    const amount = getAmount(text);
    const vendor = inferVendor(text, nextState.vendors);
    const customer = inferCustomer(text, nextState.customers);
    const product = inferProduct(text, nextState.products);

    // -------- AGREGAR CLIENTE --------
    if (t.includes("agrega cliente")) {
      const parsed = parseAddCustomer(text);
      if (!parsed) {
        setState(addChat("app", "No pude crear el cliente.", nextState));
        setMessage("");
        return;
      }

      nextState = {
        ...nextState,
        customers: [
          {
            id: Date.now(),
            name: parsed.name,
            phone: parsed.phone,
            address: parsed.address,
            createdAt: new Date().toISOString(),
          },
          ...nextState.customers,
        ],
      };

      setState(addChat("app", `Cliente agregado: ${parsed.name}`, nextState));
      setMessage("");
      return;
    }

    // -------- AGREGAR PRODUCTO --------
    if (t.includes("agrega producto") || t.includes("nuevo producto")) {
      const parsed = parseAddProduct(text);

      if (!parsed) {
        setState(
          addChat(
            "app",
            "No pude crear el producto. Probá: agrega producto Mesa de comedor a 450000 costo 260000 categoria Muebleria",
            nextState
          )
        );
        setMessage("");
        return;
      }

      nextState = {
        ...nextState,
        products: [
          {
            id: Date.now(),
            name: parsed.name,
            category: parsed.category,
            price: parsed.price,
            cost: parsed.cost,
            includes: "",
            active: true,
          },
          ...nextState.products,
        ],
      };

      setState(addChat("app", `Producto agregado: ${parsed.name}`, nextState));
      setMessage("");
      return;
    }

    // -------- VENTA --------
    if (t.includes("vendi") || t.includes("venta")) {
      const saleAmount = amount || product?.price || 0;
      const cost = product?.cost || 0;
      const commission = vendor ? Math.round(saleAmount * (vendor.commissionRate || 0)) : 0;
      const margin = saleAmount - cost - commission;

      nextState = {
        ...nextState,
        movements: [
          {
            id: Date.now() + Math.random(),
            type: "venta",
            concept: text,
            productId: product?.id || null,
            productName: product?.name || "Producto",
            productCategory: product?.category || "General",
            customerId: customer?.id || null,
            customerName: customer?.name || "",
            total: saleAmount,
            paid: 0,
            pending: saleAmount,
            cost,
            commission,
            vendorName: vendor?.name || "",
            margin,
            status: "pendiente",
            createdAt: new Date().toISOString(),
          },
          ...nextState.movements,
        ],
      };

      setState(
        addChat(
          "app",
          `Venta registrada: ${product?.name || "Producto"} · ${formatMoney(saleAmount)}`,
          nextState
        )
      );
      setMessage("");
      return;
    }

    // -------- SEÑA --------
    if (t.includes("seña") || t.includes("sena")) {
      if (!customer) {
        setState(addChat("app", "No encontré el cliente para cargar la seña.", nextState));
        setMessage("");
        return;
      }

      let updated = false;

      nextState = {
        ...nextState,
        movements: nextState.movements.map((m) => {
          if (
            !updated &&
            m.type === "venta" &&
            normalize(m.customerName) === normalize(customer.name)
          ) {
            const newPaid = (m.paid || 0) + amount;
            const newPending = Math.max((m.total || 0) - newPaid, 0);
            updated = true;
            return {
              ...m,
              paid: newPaid,
              pending: newPending,
              status: newPending === 0 ? "cobrado" : "con seña",
            };
          }
          return m;
        }),
      };

      setState(
        addChat("app", `Seña registrada para ${customer.name}: ${formatMoney(amount)}`, nextState)
      );
      setMessage("");
      return;
    }

    // -------- PAGO COMISION AUTOMATICA --------
    if (t.includes("comision") && vendor && (t.includes("pague") || t.includes("pago"))) {
      const generated = nextState.movements
        .filter((m) => m.type === "venta" && normalize(m.vendorName) === normalize(vendor.name))
        .reduce((acc, m) => acc + (m.commission || 0), 0);

      const paid = nextState.movements
        .filter(
          (m) =>
            m.type === "gasto" &&
            m.category === "comision" &&
            normalize(m.vendorName || "") === normalize(vendor.name)
        )
        .reduce((acc, m) => acc + (m.amount || 0), 0);

      const pending = Math.max(generated - paid, 0);

      if (!pending) {
        setState(addChat("app", `No hay comisión pendiente para ${vendor.name}.`, nextState));
        setMessage("");
        return;
      }

      nextState = {
        ...nextState,
        movements: [
          {
            id: Date.now() + Math.random(),
            type: "gasto",
            concept: `Pago comisión a ${vendor.name}`,
            amount: pending,
            category: "comision",
            vendorName: vendor.name,
            createdAt: new Date().toISOString(),
          },
          ...nextState.movements,
        ],
      };

      setState(
        addChat("app", `Comisión pagada a ${vendor.name}: ${formatMoney(pending)}`, nextState)
      );
      setMessage("");
      return;
    }

    // -------- GASTO --------
    if (
      t.includes("pague") ||
      t.includes("pago") ||
      t.includes("compre") ||
      t.includes("compré") ||
      t.includes("gasto") ||
      t.includes("transferi") ||
      t.includes("transferí") ||
      t.includes("mano de obra") ||
      t.includes("envio") ||
      t.includes("envío")
    ) {
      const category = inferExpenseCategory(text);

      nextState = {
        ...nextState,
        movements: [
          {
            id: Date.now() + Math.random(),
            type: "gasto",
            concept: text,
            amount,
            category,
            vendorName: vendor?.name || "",
            createdAt: new Date().toISOString(),
          },
          ...nextState.movements,
        ],
      };

      setState(addChat("app", `Gasto registrado: ${formatMoney(amount)}`, nextState));
      setMessage("");
      return;
    }

    setState(addChat("app", "No entendí bien el mensaje.", nextState));
    setMessage("");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cinco-fuegos-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetData() {
    if (window.confirm("¿Seguro querés borrar todos los datos?")) {
      setState(initialState);
    }
  }

  function updateProduct(id, field, value) {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  }

  function updateCustomer(id, field, value) {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  }

  function updateMovement(id, field, value) {
    setState((prev) => ({
      ...prev,
      movements: prev.movements.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  }

  function deleteMovement(id) {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    setState((prev) => ({
      ...prev,
      movements: prev.movements.filter((m) => m.id !== id),
    }));
  }

  const summary = useMemo(() => {
    const sales = state.movements.filter((m) => m.type === "venta");
    const expenses = state.movements.filter((m) => m.type === "gasto");

    const totalSales = sales.reduce((acc, m) => acc + (m.total || 0), 0);
    const totalCollected = sales.reduce((acc, m) => acc + (m.paid || 0), 0);
    const totalPending = sales.reduce((acc, m) => acc + (m.pending || 0), 0);
    const totalExpenses = expenses.reduce((acc, m) => acc + (m.amount || 0), 0);
    const totalCommissionGenerated = sales.reduce((acc, m) => acc + (m.commission || 0), 0);
    const totalCost = sales.reduce((acc, m) => acc + (m.cost || 0), 0);
    const totalMargin = sales.reduce((acc, m) => acc + (m.margin || 0), 0);

    const productPerformance = state.products.map((p) => {
      const productSales = sales.filter(
        (m) => normalize(m.productName) === normalize(p.name)
      );
      const units = productSales.length;
      const revenue = productSales.reduce((acc, m) => acc + (m.total || 0), 0);
      const costs = productSales.reduce((acc, m) => acc + (m.cost || 0), 0);
      const commissions = productSales.reduce((acc, m) => acc + (m.commission || 0), 0);
      const margin = revenue - costs - commissions;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        units,
        revenue,
        costs,
        commissions,
        margin,
      };
    });

    const customerSales = state.customers.map((c) => {
      const salesForCustomer = sales.filter(
        (m) => normalize(m.customerName) === normalize(c.name)
      );
      const total = salesForCustomer.reduce((acc, m) => acc + (m.total || 0), 0);
      const paid = salesForCustomer.reduce((acc, m) => acc + (m.paid || 0), 0);
      const pending = salesForCustomer.reduce((acc, m) => acc + (m.pending || 0), 0);

      return {
        ...c,
        orders: salesForCustomer.length,
        total,
        paid,
        pending,
      };
    });

    return {
      totalSales,
      totalCollected,
      totalPending,
      totalExpenses,
      totalCommissionGenerated,
      totalCost,
      totalMargin,
      productPerformance,
      customerSales,
    };
  }, [state]);

  const filteredMovements = useMemo(() => {
    return state.movements.filter((m) => {
      const typeOk = typeFilter === "todos" || m.type === typeFilter;
      const categoryOk =
        categoryFilter === "todas" ||
        m.category === categoryFilter ||
        m.productCategory === categoryFilter;
      const text = `${m.concept || ""} ${m.customerName || ""} ${m.vendorName || ""} ${m.productName || ""}`.toLowerCase();
      const searchOk = text.includes(search.toLowerCase());

      return typeOk && categoryOk && searchOk;
    });
  }, [state.movements, typeFilter, categoryFilter, search]);

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <div style={styles.brandLine}>🔥 {state.businessName}</div>
          <div style={styles.brandSub}>
            Panel para ventas, clientes, productos, señas y rentabilidad
          </div>
        </div>
        <div style={styles.topActions}>
          <button style={styles.secondaryButton} onClick={exportData}>
            Exportar
          </button>
          <button style={styles.secondaryButtonDanger} onClick={resetData}>
            Reiniciar
          </button>
        </div>
      </div>

      <div style={styles.navTabs}>
        {[
          ["dashboard", "Dashboard"],
          ["cargar", "Cargar"],
          ["movimientos", "Movimientos"],
          ["productos", "Productos"],
          ["clientes", "Clientes"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={activeTab === key ? styles.activeTabButton : styles.tabButton}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <>
          <SectionTitle
            title="Vista general"
            subtitle="Lo importante del negocio, rápido y claro."
          />

          <div style={styles.grid4}>
            <MetricCard
              title="Vendido"
              value={formatMoney(summary.totalSales)}
              subtitle="Total de ventas"
            />
            <MetricCard
              title="Cobrado"
              value={formatMoney(summary.totalCollected)}
              subtitle="Incluye señas"
            />
            <MetricCard
              title="Pendiente"
              value={formatMoney(summary.totalPending)}
              subtitle="Saldo por cobrar"
            />
            <MetricCard
              title="Margen estimado"
              value={formatMoney(summary.totalMargin)}
              subtitle="Ventas - costo - comisión"
            />
          </div>

          <div style={styles.twoCols}>
            <div style={styles.panel}>
              <SectionTitle
                title="Margen por producto"
                subtitle="Para ver qué conviene vender."
              />
              <div style={styles.stack}>
                {summary.productPerformance.map((p) => (
                  <div key={p.id} style={styles.listRowBlock}>
                    <div>
                      <div style={styles.rowTitle}>{p.name}</div>
                      <div style={styles.rowSubtitle}>
                        {p.category} · {p.units} venta(s)
                      </div>
                    </div>
                    <div style={styles.vendorGrid}>
                      <span>Facturación: <strong>{formatMoney(p.revenue)}</strong></span>
                      <span>Costos: <strong>{formatMoney(p.costs)}</strong></span>
                      <span>Comisiones: <strong>{formatMoney(p.commissions)}</strong></span>
                      <span>Margen: <strong>{formatMoney(p.margin)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.panel}>
              <SectionTitle
                title="Clientes y saldos"
                subtitle="Para saber a quién entregarle y cuánto falta cobrar."
              />
              <div style={styles.stack}>
                {summary.customerSales.length === 0 ? (
                  <div style={styles.emptyState}>Todavía no hay clientes.</div>
                ) : (
                  summary.customerSales.map((c) => (
                    <div key={c.id} style={styles.listRowBlock}>
                      <div>
                        <div style={styles.rowTitle}>{c.name}</div>
                        <div style={styles.rowSubtitle}>
                          {c.phone || "Sin teléfono"} · {c.address || "Sin dirección"}
                        </div>
                      </div>
                      <div style={styles.vendorGrid}>
                        <span>Total: <strong>{formatMoney(c.total)}</strong></span>
                        <span>Cobrado: <strong>{formatMoney(c.paid)}</strong></span>
                        <span>Pendiente: <strong>{formatMoney(c.pending)}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "cargar" && (
        <div style={styles.twoCols}>
          <div style={styles.panel}>
            <SectionTitle
              title="Carga por mensaje"
              subtitle="Escribí como hablás."
            />
            <div style={styles.composer}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ej: vendi fogonero con ruedas 1.20 a Juan por Lucas"
                style={styles.textarea}
              />
              <div style={styles.quickActions}>
                <button
                  style={styles.quickButton}
                  onClick={() =>
                    setMessage("agrega cliente Juan telefono 1123456789 direccion Palermo 1234")
                  }
                >
                  Cliente ejemplo
                </button>
                <button
                  style={styles.quickButton}
                  onClick={() =>
                    setMessage("vendi fogonero con ruedas 1.20 a Juan por Lucas")
                  }
                >
                  Venta ejemplo
                </button>
                <button
                  style={styles.quickButton}
                  onClick={() => setMessage("seña 200000 de Juan")}
                >
                  Seña ejemplo
                </button>
                <button
                  style={styles.quickButton}
                  onClick={() => setMessage("pague hierro 300000")}
                >
                  Gasto ejemplo
                </button>
                <button
                  style={styles.quickButton}
                  onClick={() => setMessage("pague comision a Lucas")}
                >
                  Comisión automática
                </button>
                <button
                  style={styles.quickButton}
                  onClick={() =>
                    setMessage("agrega producto Mesa de comedor a 450000 costo 260000 categoria Muebleria")
                  }
                >
                  Producto nuevo
                </button>
              </div>
              <button style={styles.primaryButton} onClick={handleMessage}>
                Procesar mensaje
              </button>
            </div>
          </div>

          <div style={styles.panel}>
            <SectionTitle title="Actividad" subtitle="Confirmaciones rápidas." />
            <div style={styles.chatBox}>
              {state.chat.map((m) => (
                <div key={m.id} style={m.author === "yo" ? styles.chatUser : styles.chatApp}>
                  <div>{m.text}</div>
                  <div style={styles.chatTime}>{formatDate(m.createdAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "movimientos" && (
        <div style={styles.panel}>
          <SectionTitle
            title="Movimientos"
            subtitle="Buscá, filtrá, editá y corregí."
          />

          <div style={styles.filtersRow}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={styles.select}
            >
              <option value="todos">Todos los tipos</option>
              <option value="venta">Ventas</option>
              <option value="gasto">Gastos</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.select}
            >
              <option value="todas">Todas las categorías</option>
              <option value="material">material</option>
              <option value="mano de obra">mano de obra</option>
              <option value="envio">envio</option>
              <option value="comision">comision</option>
              <option value="publicidad">publicidad</option>
              <option value="alquiler">alquiler</option>
              <option value="nafta">nafta</option>
              <option value="herramientas">herramientas</option>
              <option value="otros">otros</option>
              {[...new Set(state.products.map((p) => p.category))].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={styles.searchInput}
            />
          </div>

          <div style={styles.stack}>
            {filteredMovements.length === 0 ? (
              <div style={styles.emptyState}>No hay movimientos con esos filtros.</div>
            ) : (
              filteredMovements.map((m) => (
                <div key={m.id} style={styles.movementRowEdit}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <input
                      value={m.concept || ""}
                      onChange={(e) => updateMovement(m.id, "concept", e.target.value)}
                      style={styles.editInput}
                    />
                    <div style={styles.rowSubtitle}>
                      {m.type}
                      {m.type === "venta" ? ` · ${m.productName || ""}` : ""}
                      {m.category ? ` · ${m.category}` : ""}
                      {m.customerName ? ` · cliente: ${m.customerName}` : ""}
                    </div>
                    <div style={styles.rowSubtitle}>{formatDate(m.createdAt)}</div>
                  </div>

                  <div style={styles.editSide}>
                    {m.type === "venta" ? (
                      <>
                        <input
                          type="number"
                          value={m.total || 0}
                          onChange={(e) =>
                            updateMovement(m.id, "total", Number(e.target.value))
                          }
                          style={styles.editAmount}
                        />
                        <input
                          type="number"
                          value={m.paid || 0}
                          onChange={(e) =>
                            updateMovement(m.id, "paid", Number(e.target.value))
                          }
                          style={styles.editAmount}
                        />
                      </>
                    ) : (
                      <input
                        type="number"
                        value={m.amount || 0}
                        onChange={(e) =>
                          updateMovement(m.id, "amount", Number(e.target.value))
                        }
                        style={styles.editAmount}
                      />
                    )}

                    <button
                      onClick={() => deleteMovement(m.id)}
                      style={styles.deleteButton}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "productos" && (
        <div style={styles.panel}>
          <SectionTitle
            title="Productos"
            subtitle="Editá nombre, precio, costo y categoría."
          />
          <div style={styles.stack}>
            {state.products.map((p) => (
              <div key={p.id} style={styles.productEditRow}>
                <input
                  value={p.name}
                  onChange={(e) => updateProduct(p.id, "name", e.target.value)}
                  style={styles.editInput}
                />
                <input
                  value={p.category}
                  onChange={(e) => updateProduct(p.id, "category", e.target.value)}
                  style={styles.editInputSmall}
                />
                <input
                  type="number"
                  value={p.price}
                  onChange={(e) => updateProduct(p.id, "price", Number(e.target.value))}
                  style={styles.editInputSmall}
                />
                <input
                  type="number"
                  value={p.cost}
                  onChange={(e) => updateProduct(p.id, "cost", Number(e.target.value))}
                  style={styles.editInputSmall}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "clientes" && (
        <div style={styles.panel}>
          <SectionTitle
            title="Clientes"
            subtitle="Tocás el cliente y ya tenés teléfono, dirección y deuda."
          />
          <div style={styles.stack}>
            {state.customers.length === 0 ? (
              <div style={styles.emptyState}>Todavía no hay clientes cargados.</div>
            ) : (
              state.customers.map((c) => {
                const customerSales = state.movements.filter(
                  (m) => m.type === "venta" && normalize(m.customerName) === normalize(c.name)
                );
                const total = customerSales.reduce((acc, m) => acc + (m.total || 0), 0);
                const paid = customerSales.reduce((acc, m) => acc + (m.paid || 0), 0);
                const pending = customerSales.reduce((acc, m) => acc + (m.pending || 0), 0);

                return (
                  <div key={c.id} style={styles.customerCard}>
                    <div style={styles.customerHeader}>
                      <div>
                        <div style={styles.rowTitle}>{c.name}</div>
                        <div style={styles.rowSubtitle}>{c.phone || "Sin teléfono"}</div>
                        <div style={styles.rowSubtitle}>{c.address || "Sin dirección"}</div>
                      </div>
                      <div style={styles.vendorGrid}>
                        <span>Total: <strong>{formatMoney(total)}</strong></span>
                        <span>Pagado: <strong>{formatMoney(paid)}</strong></span>
                        <span>Pendiente: <strong>{formatMoney(pending)}</strong></span>
                      </div>
                    </div>

                    <div style={styles.customerEditGrid}>
                      <input
                        value={c.name}
                        onChange={(e) => updateCustomer(c.id, "name", e.target.value)}
                        style={styles.editInput}
                      />
                      <input
                        value={c.phone}
                        onChange={(e) => updateCustomer(c.id, "phone", e.target.value)}
                        style={styles.editInput}
                      />
                      <input
                        value={c.address}
                        onChange={(e) => updateCustomer(c.id, "address", e.target.value)}
                        style={styles.editInput}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------- ESTILOS --------------------

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #09090b 0%, #111827 100%)",
    color: "#f8fafc",
    fontFamily: "Inter, Arial, sans-serif",
    padding: 20,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  brandLine: {
    fontSize: 34,
    fontWeight: 800,
    color: "#f43f5e",
    letterSpacing: -0.5,
  },
  brandSub: {
    color: "#94a3b8",
    marginTop: 4,
  },
  topActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  navTabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  tabButton: {
    padding: "10px 14px",
    background: "#111827",
    color: "#cbd5e1",
    border: "1px solid #1f2937",
    borderRadius: 999,
    cursor: "pointer",
  },
  activeTabButton: {
    padding: "10px 14px",
    background: "#e11d48",
    color: "#ffffff",
    border: "1px solid #e11d48",
    borderRadius: 999,
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(225,29,72,0.25)",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
  },
  panel: {
    background: "rgba(15, 23, 42, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
  },
  metricCard: {
    background:
      "linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(17,24,39,0.98) 100%)",
    border: "1px solid rgba(148,163,184,0.16)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
  },
  metricTitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -0.5,
  },
  metricSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
  },
  composer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  textarea: {
    minHeight: 130,
    resize: "vertical",
    borderRadius: 18,
    border: "1px solid #334155",
    background: "#020617",
    color: "#f8fafc",
    padding: 16,
    fontSize: 15,
    outline: "none",
  },
  primaryButton: {
    padding: "14px 18px",
    borderRadius: 16,
    background: "#e11d48",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#111827",
    color: "#fff",
    border: "1px solid #374151",
    cursor: "pointer",
  },
  secondaryButtonDanger: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#3f0d19",
    color: "#fff",
    border: "1px solid #7f1d1d",
    cursor: "pointer",
  },
  quickActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  quickButton: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#0f172a",
    color: "#cbd5e1",
    border: "1px solid #334155",
    cursor: "pointer",
  },
  chatBox: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: 520,
    overflow: "auto",
  },
  chatUser: {
    alignSelf: "flex-end",
    background: "#e11d48",
    color: "white",
    padding: 12,
    borderRadius: 18,
    maxWidth: "86%",
  },
  chatApp: {
    alignSelf: "flex-start",
    background: "#111827",
    color: "#f8fafc",
    padding: 12,
    borderRadius: 18,
    maxWidth: "86%",
    border: "1px solid #1f2937",
  },
  chatTime: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  listRowBlock: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: 14,
    background: "#0b1220",
    borderRadius: 18,
    border: "1px solid #172033",
    flexWrap: "wrap",
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  rowSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  vendorGrid: {
    display: "grid",
    gap: 4,
    textAlign: "right",
    color: "#cbd5e1",
  },
  emptyState: {
    padding: 18,
    borderRadius: 18,
    background: "#0b1220",
    border: "1px dashed #334155",
    color: "#94a3b8",
  },
  filtersRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  select: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#020617",
    color: "#fff",
    border: "1px solid #334155",
  },
  searchInput: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#020617",
    color: "#fff",
    border: "1px solid #334155",
    minWidth: 280,
    flex: 1,
  },
  movementRowEdit: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    padding: 14,
    background: "#0b1220",
    borderRadius: 18,
    border: "1px solid #172033",
    flexWrap: "wrap",
  },
  editInput: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    background: "#020617",
    color: "#fff",
    border: "1px solid #334155",
  },
  editInputSmall: {
    minWidth: 140,
    padding: 10,
    borderRadius: 10,
    background: "#020617",
    color: "#fff",
    border: "1px solid #334155",
  },
  editAmount: {
    width: 140,
    padding: 10,
    borderRadius: 10,
    background: "#020617",
    color: "#fff",
    border: "1px solid #334155",
  },
  editSide: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "flex-end",
  },
  deleteButton: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "#7f1d1d",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  productEditRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 10,
    padding: 14,
    background: "#0b1220",
    borderRadius: 18,
    border: "1px solid #172033",
  },
  customerCard: {
    padding: 14,
    background: "#0b1220",
    borderRadius: 18,
    border: "1px solid #172033",
  },
  customerHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  customerEditGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
};
