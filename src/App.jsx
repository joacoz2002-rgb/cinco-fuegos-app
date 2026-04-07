import React, { useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "cinco-fuegos-pro";

const productos = [
  {
    nombre: "Fogonero con ruedas 1.20",
    precio: 750000,
  },
  {
    nombre: "Fogonero plano 1.20",
    precio: 650000,
  },
];

function format(n) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function App() {
  const [data, setData] = useState({
    movimientos: [],
    pedidos: [],
    chat: [],
  });

  const [input, setInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setData(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const resumen = useMemo(() => {
    const ventas = data.movimientos
      .filter((m) => m.tipo === "venta")
      .reduce((a, b) => a + b.monto, 0);

    const gastos = data.movimientos
      .filter((m) => m.tipo === "gasto")
      .reduce((a, b) => a + b.monto, 0);

    return {
      ventas,
      gastos,
      resultado: ventas - gastos,
    };
  }, [data]);

  function detectarProducto(texto) {
    const t = texto.toLowerCase();

    if (t.includes("ruedas")) return productos[0];
    if (t.includes("plano")) return productos[1];

    return null;
  }

  function procesar() {
    if (!input.trim()) return;

    let nuevo = { ...data };
    const texto = input.toLowerCase();

    // 🔴 VENTA
    if (texto.includes("vendi")) {
      const prod = detectarProducto(input);

      const monto = prod ? prod.precio : 0;

      nuevo.movimientos.unshift({
        tipo: "venta",
        monto,
        concepto: prod ? prod.nombre : "Venta",
      });

      nuevo.chat.push({ autor: "app", texto: `Venta registrada ${format(monto)}` });
    }

    // 🔵 GASTO
    else if (texto.includes("compre") || texto.includes("gasto")) {
      const monto = 100000;

      nuevo.movimientos.unshift({
        tipo: "gasto",
        monto,
        concepto: "Gasto",
      });

      nuevo.chat.push({ autor: "app", texto: `Gasto registrado ${format(monto)}` });
    }

    // 🟡 PEDIDO
    else if (texto.includes("pedido")) {
      const prod = detectarProducto(input);

      nuevo.pedidos.unshift({
        cliente: input.split("para")[1] || "Cliente",
        producto: prod ? prod.nombre : "Fogonero",
        estado: "Pendiente",
      });

      nuevo.chat.push({ autor: "app", texto: "Pedido creado" });
    }

    else {
      nuevo.chat.push({ autor: "app", texto: "No entendí bien el mensaje" });
    }

    nuevo.chat.push({ autor: "yo", texto: input });

    setData(nuevo);
    setInput("");
  }

  return (
    <div style={{
      background: "#0a0a0a",
      color: "#fff",
      minHeight: "100vh",
      padding: 20,
      fontFamily: "sans-serif"
    }}>

      <h1 style={{ color: "#e11d48" }}>Cinco Fuegos</h1>

      {/* RESUMEN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10 }}>
        <Card title="Ventas" value={format(resumen.ventas)} />
        <Card title="Gastos" value={format(resumen.gastos)} />
        <Card title="Resultado" value={format(resumen.resultado)} />
      </div>

      {/* INPUT */}
      <div style={{ marginTop: 20 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: vendi fogonero con ruedas"
          style={inputStyle}
        />
        <button onClick={procesar} style={btnStyle}>Enviar</button>
      </div>

      {/* CHAT */}
      <div style={boxStyle}>
        {data.chat.map((c, i) => (
          <div key={i} style={{
            background: c.autor === "yo" ? "#e11d48" : "#1a1a1a",
            padding: 10,
            borderRadius: 8,
            marginBottom: 6
          }}>
            {c.texto}
          </div>
        ))}
      </div>

      {/* PEDIDOS */}
      <div style={boxStyle}>
        <h2>Pedidos</h2>
        {data.pedidos.map((p, i) => (
          <div key={i}>
            {p.cliente} - {p.producto} ({p.estado})
          </div>
        ))}
      </div>

    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{
      background: "#111",
      padding: 15,
      borderRadius: 12
    }}>
      <div style={{ color: "#888" }}>{title}</div>
      <div style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}

const inputStyle = {
  padding: 12,
  width: "70%",
  borderRadius: 10,
  border: "1px solid #333",
  background: "#111",
  color: "#fff"
};

const btnStyle = {
  padding: 12,
  marginLeft: 10,
  background: "#e11d48",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer"
};

const boxStyle = {
  background: "#111",
  padding: 15,
  borderRadius: 12,
  marginTop: 20
};
