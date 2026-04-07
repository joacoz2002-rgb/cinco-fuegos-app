import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cinco-fuegos-control-v4";

const defaultProducts = [
  {
    id: 1,
    name: "Fogonero con ruedas 1.20",
    category: "Fogoneros",
    price: 750000,
    estimatedCost: 420000,
    includes: "Incluye media parrilla y cruz de asador",
    active: true,
  },
  {
    id: 2,
    name: "Fogonero plano con patas 1.20",
    category: "Fogoneros",
    price: 650000,
    estimatedCost: 350000,
    includes: "Incluye media parrilla y cruz de asador",
    active: true,
  },
  {
    id: 3,
    name: "Provolera",
    category: "Accesorios",
    price: 25000,
    estimatedCost: 12000,
    includes: "",
    active: true,
  },
  {
    id: 4,
    name: "Porta provola",
    category: "Accesorios",
    price: 15000,
    estimatedCost: 7000,
    includes: "",
    active: true,
  },
  {
    id: 5,
    name: "Porta olla",
    category: "Accesorios",
    price: 15000,
    estimatedCost: 7000,
    includes: "",
    active: true,
  },
];

const defaultVendors = [
  { id: 1, name: "Lucas", commissionRate: 0.15, active: true },
  { id: 2, name: "Milagros", commissionRate: 0.15, active: true },
  { id: 3, name: "Nacho", commissionRate: 0.15, active: true },
  { id: 4, name: "Joaco", commissionRate: 0.15, active: true },
  { id: 5, name: "Papá", commissionRate: 0, active: true },
];

const defaultCategories = [
  "material",
  "mano de obra",
  "envio",
  "comision",
  "publicidad",
  "alquiler",
  "nafta",
  "herramientas",
  "otros",
];

const initialState = {
  businessName: "Cinco Fuegos",
  businessType: "Fogoneros",
  products: defaultProducts,
  vendors: defaultVendors,
  categories: defaultCategories,
  customers: [],
  movements: [],
  chat: [
    {
      id: 1,
      author: "app",
      text:
        "Probá mensajes como: 'vendi fogonero con ruedas 1.20 a 750000 a Juan por Lucas', 'pague hierro 300000', 'mano de obra 120000', 'pague comision a Lucas', 'agrega producto Mesa de comedor a 450000 costo 260000 categoria Muebleria'.",
      createdAt: new Date().toISOString(),
    },
  ],
};

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

function inferCategory(text) {
  const t = normalize(text);
  if (t.includes("hierro") || t.includes("chapa") || t.includes("material")) return "material";
  if (t.includes("mano") || t.includes("soldador") || t.includes("pintor")) return "mano de obra";
  if (t.includes("envio") || t.includes("envío") || t.includes("flete")) return "envio";
  if (t.includes("comision")) return "comision";
  if (t.includes("publicidad") || t.includes("meta") || t.includes("instagram") || t.includes("facebook")) return "publicidad";
  if (t.includes("alquiler")) return "alquiler";
  if (t.includes("nafta") || t.includes("combustible")) return "nafta";
  if (t.includes("herramienta") || t.includes("amoladora")) return "herramientas";
  return "otros";
}

function inferVendor(text, vendors) {
  const t = normalize(text);
  return vendors.find((v) => t.includes(normalize(v.name))) || null;
}

function inferCustomer(text) {
  const original = text.trim();
  const patterns = [
    / a ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ ]+)/,
    / para ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ ]+)/,
    / de ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ ]+)/,
  ];
  for (const pattern of patterns) {
    const match = original.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
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
  if (t.includes("porta provola")) {
    return products.find((p) => normalize(p.name).includes("porta provola")) || null;
  }
  if (t.includes("porta olla")) {
    return products.find((p) => normalize(p.name).includes("porta olla")) || null;
  }

  return null;
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
    estimatedCost: costMatch ? Number(costMatch[1].replace(/\./g, "")) : 0,
    category: categoryMatch?.[1]?.trim() || "General",
  };
}

function addCustomerIfNeeded(state, customerName) {
  if (!customerName) return state;
  const exists = state.customers.some((c) => normalize(c.name) === normalize(customerName));
  if (exists) return state;

  return {
    ...state,
    customers: [
      {
        id: Date.now() + Math.random(),
        name: customerName,
        createdAt: new Date().toISOString(),
      },
      ...state.customers,
    ],
  };
}

function processMessage(input, state) {
  const text = input.trim();
  const t = normalize(text);
  const amount = getAmount(text);
  const product = inferProduct(text, state.products);
  const vendor = inferVendor(text, state.vendors);
  const customer = inferCustomer(text);

  if (t.includes("agrega producto") || t.includes("nuevo producto")) {
    const parsed = parseAddProduct(text);
    if (!parsed) {
      return {
        nextState: state,
        reply:
          "No pude crear el producto. Probá: agrega producto Mesa de comedor a 450000 costo 260000 categoria Muebleria",
      };
    }

    const newProduct = {
      id: Date.now(),
      name: parsed.name,
      category: parsed.category,
      price: parsed.price,
      estimatedCost: parsed.estimatedCost || 0,
      includes: "",
      active: true,
    };

    return {
      nextState: {
        ...state,
        products: [newProduct, ...state.products],
      },
      reply: `Producto agregado: ${parsed.name} · ${formatMoney(parsed.price)}`,
    };
  }

  if (t.includes("actualiza precio") || t.includes("cambiar precio")) {
    if (!product || !amount) {
      return {
        nextState: state,
        reply: "No pude actualizar el precio. Escribí el producto y el nuevo valor.",
      };
    }

    return {
      nextState: {
        ...state,
        products: state.products.map((p) =>
          p.id === product.id ? { ...p, price: amount } : p
        ),
      },
      reply: `Precio actualizado: ${product.name} → ${formatMoney(amount)}`,
    };
  }

  if (t.includes("actualiza costo") || t.includes("cambiar costo")) {
    if (!product || !amount) {
      return {
        nextState: state,
        reply: "No pude actualizar el costo. Escribí el producto y el nuevo costo.",
      };
    }

    return {
      nextState: {
        ...state,
        products: state.products.map((p) =>
          p.id === product.id ? { ...p, estimatedCost: amount } : p
        ),
      },
      reply: `Costo actualizado: ${product.name} → ${formatMoney(amount)}`,
    };
  }

  if (t.includes("vendi") || t.includes("venta")) {
    const saleAmount = amount || product?.price || 0;
    const commission = vendor ? Math.round(saleAmount * (vendor.commissionRate || 0)) : 0;
    const estimatedCost = product?.estimatedCost || 0;
    const unitMargin = saleAmount - estimatedCost - commission;

    let nextState = { ...state };
    nextState = addCustomerIfNeeded(nextState, customer);

    nextState.movements = [
      {
        id: Date.now() + Math.random(),
        type: "venta",
        amount: saleAmount,
        category: "venta",
        productId: product?.id || null,
        productName: product?.name || "Producto",
        productCategory: product?.category || "General",
        estimatedCost,
        customer: customer || "Sin cliente",
        vendor: vendor?.name || "Sin vendedor",
        commission,
        unitMargin,
        concept: text,
        createdAt: new Date().toISOString(),
      },
      ...nextState.movements,
    ];

    return {
      nextState,
      reply: `Venta registrada · ${product?.name || "Producto"} · ${formatMoney(
        saleAmount
      )}${vendor ? ` · comisión ${formatMoney(commission)}` : ""}`,
    };
  }

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
    if (t.includes("comision") && vendor && !amount) {
      const generated = state.movements
        .filter((m) => m.type === "venta" && normalize(m.vendor) === normalize(vendor.name))
        .reduce((acc, m) => acc + (m.commission || 0), 0);

      const paid = state.movements
        .filter(
          (m) =>
            m.type === "gasto" &&
            m.category === "comision" &&
            normalize(m.vendor || "") === normalize(vendor.name)
        )
        .reduce((acc, m) => acc + m.amount, 0);

      const pending = Math.max(generated - paid, 0);

      if (!pending) {
        return {
          nextState: state,
          reply: `No hay comisión pendiente para ${vendor.name}.`,
        };
      }

      return {
        nextState: {
          ...state,
          movements: [
            {
              id: Date.now() + Math.random(),
              type: "gasto",
              amount: pending,
              category: "comision",
              vendor: vendor.name,
              concept: `Pago comisión a ${vendor.name}`,
              createdAt: new Date().toISOString(),
            },
            ...state.movements,
          ],
        },
        reply: `Comisión pagada a ${vendor.name} · ${formatMoney(pending)}`,
      };
    }

    const category = inferCategory(text);

    return {
      nextState: {
        ...state,
        movements: [
          {
            id: Date.now() + Math.random(),
            type: "gasto",
            amount: amount || 0,
            category,
            concept: text,
            vendor: vendor?.name || "",
            createdAt: new Date().toISOString(),
          },
          ...state.movements,
        ],
      },
      reply: `Gasto registrado · ${category} · ${formatMoney(amount || 0)}`,
    };
  }

  return {
    nextState: state,
    reply:
      "No pude entenderlo bien. Probá con venta, gasto, comisión o agregar producto.",
  };
}

function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
      {subtitle ? (
        <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>{subtitle}</p>
      ) : null}
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

function App() {
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

  const summary = useMemo(() => {
    const sales = state.movements.filter((m) => m.type === "venta");
    const expenses = state.movements.filter((m) => m.type === "gasto");

    const totalSales = sales.reduce((acc, m) => acc + m.amount, 0);
    const totalExpenses = expenses.reduce((acc, m) => acc + m.amount, 0);

    const totalCommissionsGenerated = sales.reduce(
      (acc, m) => acc + (m.commission || 0),
      0
    );
    const totalCommissionsPaid = expenses
      .filter((m) => m.category === "comision")
      .reduce((acc, m) => acc + m.amount, 0);

    const pendingCommissions = Math.max(
      totalCommissionsGenerated - totalCommissionsPaid,
      0
    );

    const byCategory = state.categories.reduce((acc, cat) => {
      acc[cat] = expenses
        .filter((m) => m.category === cat)
        .reduce((sum, m) => sum + m.amount, 0);
      return acc;
    }, {});

    const productPerformance = state.products
      .map((product) => {
        const productSales = sales.filter(
          (m) => normalize(m.productName) === normalize(product.name)
        );
        const revenue = productSales.reduce((acc, m) => acc + m.amount, 0);
        const units = productSales.length;
        const commissions = productSales.reduce(
          (acc, m) => acc + (m.commission || 0),
          0
        );
        const estimatedCostTotal = productSales.reduce(
          (acc, m) => acc + (m.estimatedCost || 0),
          0
        );
        const margin = revenue - commissions - estimatedCostTotal;

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          revenue,
          units,
          estimatedCostTotal,
          commissions,
          margin,
          averagePrice: units ? revenue / units : 0,
          price: product.price,
          estimatedCost: product.estimatedCost || 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const vendorPerformance = state.vendors
      .map((vendor) => {
        const vendorSales = sales.filter(
          (m) => normalize(m.vendor) === normalize(vendor.name)
        );
        const revenue = vendorSales.reduce((acc, m) => acc + m.amount, 0);
        const generated = vendorSales.reduce(
          (acc, m) => acc + (m.commission || 0),
          0
        );
        const paid = expenses
          .filter(
            (m) =>
              m.category === "comision" &&
              normalize(m.vendor || "") === normalize(vendor.name)
          )
          .reduce((acc, m) => acc + m.amount, 0);

        return {
          name: vendor.name,
          revenue,
          salesCount: vendorSales.length,
          generated,
          paid,
          pending: Math.max(generated - paid, 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const customerPerformance = state.customers
      .map((customer) => {
        const customerSales = sales.filter(
          (m) => normalize(m.customer) === normalize(customer.name)
        );
        const revenue = customerSales.reduce((acc, m) => acc + m.amount, 0);
        return { name: customer.name, revenue, orders: customerSales.length };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalSales,
      totalExpenses,
      totalCommissionsGenerated,
      totalCommissionsPaid,
      pendingCommissions,
      profit: totalSales - totalExpenses - pendingCommissions,
      byCategory,
      productPerformance,
      vendorPerformance,
      customerPerformance,
      totalMovements: state.movements.length,
    };
  }, [state]);

  const filteredMovements = useMemo(() => {
    return state.movements.filter((m) => {
      const matchesType = typeFilter === "todos" || m.type === typeFilter;
      const matchesCategory =
        categoryFilter === "todas" ||
        m.category === categoryFilter ||
        m.productCategory === categoryFilter;

      const text = `${m.concept} ${m.customer || ""} ${m.vendor || ""} ${
        m.productName || ""
      }`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [state.movements, typeFilter, categoryFilter, search]);

  function handleSend() {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now() + Math.random(),
      author: "yo",
      text: message,
      createdAt: new Date().toISOString(),
    };

    const { nextState, reply } = processMessage(message, state);

    const appMessage = {
      id: Date.now() + Math.random() + 1,
      author: "app",
      text: reply,
      createdAt: new Date().toISOString(),
    };

    setState({ ...nextState, chat: [...state.chat, userMessage, appMessage] });
    setMessage("");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.businessName.toLowerCase().replace(/\s+/g, "-")}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetData() {
    if (window.confirm("¿Seguro querés borrar todos los datos?")) {
      setState(initialState);
    }
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

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <div style={styles.brandLine}>{state.businessName}</div>
          <div style={styles.brandSub}>
            Panel operativo y financiero · sirve para fogoneros hoy y mueblería mañana
          </div>
        </div>
        <div style={styles.topActions}>
          <button style={styles.secondaryButton} onClick={exportData}>
            Exportar datos
          </button>
          <button style={styles.secondaryButtonDanger} onClick={resetData}>
            Reiniciar
          </button>
        </div>
      </div>

      <div style={styles.navTabs}>
        {[
          ["dashboard", "Dashboard"],
          ["carga", "Cargar"],
          ["movimientos", "Movimientos"],
          ["productos", "Productos"],
          ["equipo", "Equipo"],
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
            subtitle="Lo importante, claro y rápido: ventas, gastos, comisiones y rentabilidad."
          />

          <div style={styles.grid4}>
            <MetricCard
              title="Ventas totales"
              value={formatMoney(summary.totalSales)}
              subtitle={`${summary.totalMovements} movimientos cargados`}
            />
            <MetricCard
              title="Gastos totales"
              value={formatMoney(summary.totalExpenses)}
              subtitle="Materiales, mano de obra, envíos y más"
            />
            <MetricCard
              title="Comisión pendiente"
              value={formatMoney(summary.pendingCommissions)}
              subtitle={`Generadas: ${formatMoney(summary.totalCommissionsGenerated)}`}
            />
            <MetricCard
              title="Ganancia estimada"
              value={formatMoney(summary.profit)}
              subtitle="Ventas - gastos - comisión pendiente"
            />
          </div>

          <div style={styles.twoCols}>
            <div style={styles.panel}>
              <SectionTitle
                title="Gastos por categoría"
                subtitle="Para entender en qué se va la plata."
              />
              <div style={styles.stack}>
                {state.categories.map((cat) => (
                  <div key={cat} style={styles.listRow}>
                    <span style={styles.badge}>{cat}</span>
                    <strong>{formatMoney(summary.byCategory[cat] || 0)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.panel}>
              <SectionTitle
                title="Margen por producto"
                subtitle="Clave para saber qué conviene vender."
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
                      <span>Costo estimado: <strong>{formatMoney(p.estimatedCostTotal)}</strong></span>
                      <span>Comisiones: <strong>{formatMoney(p.commissions)}</strong></span>
                      <span>Margen: <strong>{formatMoney(p.margin)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "carga" && (
        <div style={styles.twoCols}>
          <div style={styles.panel}>
            <SectionTitle
              title="Carga por mensaje"
              subtitle="Escribí como hablás. La app intenta clasificar sola."
            />
            <div style={styles.composer}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ej: vendi fogonero con ruedas 1.20 a 750000 a Juan por Lucas"
                style={styles.textarea}
              />
              <div style={styles.quickActions}>
                <button
                  style={styles.quickButton}
                  onClick={() =>
                    setMessage("vendi fogonero con ruedas 1.20 a 750000 a Juan por Lucas")
                  }
                >
                  Venta ejemplo
                </button>
                <button
                  style={styles.quickButton}
                  onClick={() => setMessage("pague hierro 300000")}
                >
                  Material ejemplo
                </button>
                <button
                  style={styles.quickButton}
                  onClick={() => setMessage("mano de obra 120000")}
                >
                  Mano de obra
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
                    setMessage(
                      "agrega producto Mesa de comedor a 450000 costo 260000 categoria Muebleria"
                    )
                  }
                >
                  Nuevo producto
                </button>
              </div>
              <button style={styles.primaryButton} onClick={handleSend}>
                Procesar mensaje
              </button>
            </div>
          </div>

          <div style={styles.panel}>
            <SectionTitle
              title="Chat de actividad"
              subtitle="Confirmaciones rápidas para operar todos los días."
            />
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
            subtitle="Filtrá, buscá, editá y corregí."
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
              {state.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              {[...new Set(state.products.map((p) => p.category))].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, producto, vendedor o texto..."
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
                      {m.type} · {m.category || m.productCategory || "-"}
                      {m.customer ? ` · cliente: ${m.customer}` : ""}
                      {m.vendor ? ` · vendedor: ${m.vendor}` : ""}
                    </div>
                    <div style={styles.rowSubtitle}>{formatDate(m.createdAt)}</div>
                  </div>

                  <div style={styles.editSide}>
                    <input
                      type="number"
                      value={m.amount || 0}
                      onChange={(e) =>
                        updateMovement(m.id, "amount", Number(e.target.value))
                      }
                      style={styles.editAmount}
                    />

                    {m.type === "gasto" ? (
                      <select
                        value={m.category || "otros"}
                        onChange={(e) => updateMovement(m.id, "category", e.target.value)}
                        style={styles.editSelect}
                      >
                        {state.categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : null}

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
        <div style={styles.twoCols}>
          <div style={styles.panel}>
            <SectionTitle
              title="Catálogo"
              subtitle="Fogoneros hoy, mueblería mañana. Todo en el mismo sistema."
            />
            <div style={styles.stack}>
              {state.products.map((p) => (
                <div key={p.id} style={styles.listRowBlock}>
                  <div>
                    <div style={styles.rowTitle}>{p.name}</div>
                    <div style={styles.rowSubtitle}>
                      {p.category}
                      {p.includes ? ` · ${p.includes}` : ""}
                    </div>
                  </div>
                  <div style={styles.vendorGrid}>
                    <span>Precio: <strong>{formatMoney(p.price)}</strong></span>
                    <span>Costo: <strong>{formatMoney(p.estimatedCost || 0)}</strong></span>
                    <span>Margen unitario estimado: <strong>{formatMoney((p.price || 0) - (p.estimatedCost || 0))}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.panel}>
            <SectionTitle
              title="Qué sumar después"
              subtitle="Para llevarlo a nivel muy serio."
            />
            <div style={styles.recommendList}>
              <div style={styles.recommendItem}>Señas y saldo pendiente por cliente</div>
              <div style={styles.recommendItem}>Costo real por orden en vez de estimado</div>
              <div style={styles.recommendItem}>Estado de producción y entregas</div>
              <div style={styles.recommendItem}>Stock de materiales y alertas</div>
              <div style={styles.recommendItem}>Caja diaria y cierre mensual</div>
              <div style={styles.recommendItem}>Usuarios separados para dueño y vendedores</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "equipo" && (
        <div style={styles.panel}>
          <SectionTitle
            title="Vendedores y comisiones"
            subtitle="Cuánto vende cada uno, cuánto genera y cuánto sigue pendiente."
          />
          <div style={styles.stack}>
            {summary.vendorPerformance.map((v) => (
              <div key={v.name} style={styles.listRowBlock}>
                <div>
                  <div style={styles.rowTitle}>{v.name}</div>
                  <div style={styles.rowSubtitle}>{v.salesCount} venta(s)</div>
                </div>
                <div style={styles.vendorGrid}>
                  <span>Facturado: <strong>{formatMoney(v.revenue)}</strong></span>
                  <span>Generado: <strong>{formatMoney(v.generated)}</strong></span>
                  <span>Pagado: <strong>{formatMoney(v.paid)}</strong></span>
                  <span>Pendiente: <strong>{formatMoney(v.pending)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "clientes" && (
        <div style={styles.panel}>
          <SectionTitle
            title="Clientes"
            subtitle="Para ver quién compra más y empezar a ordenar relaciones comerciales."
          />
          <div style={styles.stack}>
            {summary.customerPerformance.length === 0 ? (
              <div style={styles.emptyState}>Todavía no hay clientes detectados.</div>
            ) : (
              summary.customerPerformance.map((c) => (
                <div key={c.name} style={styles.listRowBlock}>
                  <div>
                    <div style={styles.rowTitle}>{c.name}</div>
                    <div style={styles.rowSubtitle}>{c.orders} compra(s)</div>
                  </div>
                  <div style={styles.rowValue}>{formatMoney(c.revenue)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

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
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: 12,
    background: "#0b1220",
    borderRadius: 16,
    border: "1px solid #172033",
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
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#1e293b",
    color: "#fda4af",
    fontSize: 12,
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  rowSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  rowValue: {
    fontWeight: 800,
    fontSize: 18,
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
    marginBottom: 8,
  },
  editAmount: {
    width: 140,
    padding: 10,
    borderRadius: 10,
    background: "#020617",
    color: "#fff",
    border: "1px solid #334155",
  },
  editSelect: {
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
  emptyState: {
    padding: 18,
    borderRadius: 18,
    background: "#0b1220",
    border: "1px dashed #334155",
    color: "#94a3b8",
  },
  recommendList: {
    display: "grid",
    gap: 10,
  },
  recommendItem: {
    padding: 14,
    borderRadius: 16,
    background: "#0b1220",
    border: "1px solid #172033",
    color: "#e2e8f0",
  },
  vendorGrid: {
    display: "grid",
    gap: 4,
    textAlign: "right",
    color: "#cbd5e1",
  },
};
