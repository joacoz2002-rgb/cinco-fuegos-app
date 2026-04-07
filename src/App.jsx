import React, { useMemo, useState, useEffect } from "react";

const STORAGE_KEY = "cinco-fuegos-app";

const productosBase = [
  { id: 1, nombre: "Fogonero plano 80", precio: 600000 },
  { id: 2, nombre: "Fogonero plano 100", precio: 600000 },
  { id: 3, nombre: "Fogonero plano 120", precio: 600000 },
  { id: 4, nombre: "Fogonero con ruedas 100", precio: 750000 },
  { id: 5, nombre: "Fogonero con ruedas 120", precio: 750000 },
  { id: 6, nombre: "Fogonero plano completo", precio: 700000 },
  { id: 7, nombre: "Fogonero con ruedas completo", precio: 850000 },
  { id: 8, nombre: "Provolera", precio: 25000 },
  { id: 9, nombre: "Porta provola", precio: 15000 },
  { id: 10, nombre: "Porta olla", precio: 15000 },
];

const vendedoresBase = [
  { nombre: "Lucas", comision: 0.15 },
  { nombre: "Milagros", comision: 0.15 },
  { nombre: "Nacho", comision: 0.15 },
  { nombre: "Joaco", comision: 0.15 },
  { nombre: "Papá", comision: 0 },
];

const gastosFijosBase = [
  { nombre: "Redes", monto: 300000 },
  { nombre: "Alquiler", monto: 40000 },
  { nombre: "Nafta", monto: 300000 },
];

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\$/g, "")
    .trim();
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

function obtenerMonto(texto) {
  const encontrados = texto.match(/\d[\d.]*/g);
  if (!encontrados) return 0;
  const numeros = encontrados.map((x) => Number(x.replace(/\./g, ""))).filter(Boolean);
  return numeros.length ? Math.max(...numeros) : 0;
}

function detectarVendedor(texto) {
  const t = normalizar(texto);
  return vendedoresBase.find((v) => t.includes(normalizar(v.nombre))) || null;
}

function detectarProducto(texto) {
  const t = normalizar(texto);

  if (t.includes("provolera")) return productosBase.find((p) => p.nombre === "Provolera");
  if (t.includes("porta provola")) return productosBase.find((p) => p.nombre === "Porta provola");
  if (t.includes("porta olla")) return productosBase.find((p) => p.nombre === "Porta olla");
  if (t.includes("ruedas completo")) return productosBase.find((p) => p.nombre === "Fogonero con ruedas completo");
  if (t.includes("plano completo")) return productosBase.find((p) => p.nombre === "Fogonero plano completo");
  if (t.includes("ruedas 120")) return productosBase.find((p) => p.nombre === "Fogonero con ruedas 120");
  if (t.includes("ruedas 100")) return productosBase.find((p) => p.nombre === "Fogonero con ruedas 100");
  if (t.includes("plano 120")) return productosBase.find((p) => p.nombre === "Fogonero plano 120");
  if (t.includes("plano 100")) return productosBase.find((p) => p.nombre === "Fogonero plano 100");
  if (t.includes("plano 80")) return productosBase.find((p) => p.nombre === "Fogonero plano 80");
  if (t.includes("fogonero")) return productosBase.find((p) => p.nombre === "Fogonero plano 100");

  return null;
}

function detectarCliente(texto) {
  const match =
    texto.match(/ a ([A-Za-zÁÉÍÓÚáéíóúñÑ ]+)$/) ||
    texto.match(/ para ([A-Za-zÁÉÍÓÚáéíóúñÑ ]+)$/) ||
    texto.match(/ de ([A-Za-zÁÉÍÓÚáéíóúñÑ ]+)$/);

  return match ? match[1].trim() : "";
}

function clasificarMensaje(texto, estado) {
  const t = normalizar(texto);
  const monto = obtenerMonto(texto);
  const vendedor = detectarVendedor(texto);
  const producto = detectarProducto(texto);
  const cliente = detectarCliente(texto);

  if (t.includes("vendi") || t.includes("vendi ") || t.includes("venta")) {
    return {
      tipo: "venta",
      mensaje: `Venta cargada por ${formatoMoneda(monto || producto?.precio || 0)}`,
      ejecutar: () => {
        const nuevo = {
          id: Date.now(),
          tipo: "venta",
          concepto: producto ? producto.nombre : "Venta",
          monto: monto || producto?.precio || 0,
          cliente: cliente || "",
          vendedor: vendedor ? vendedor.nombre : "",
          comisionGenerada: vendedor ? Math.round((producto?.precio || monto || 0) * vendedor.comision) : 0,
          fecha: new Date().toISOString(),
        };
        return {
          ...estado,
          movimientos: [nuevo, ...estado.movimientos],
        };
      },
    };
  }

  if (t.includes("comision")) {
    return {
      tipo: "comision",
      mensaje: `Comisión cargada por ${formatoMoneda(monto)}`,
      ejecutar: () => {
        const nuevo = {
          id: Date.now(),
          tipo: "comision",
          concepto: `Pago comisión ${vendedor ? vendedor.nombre : ""}`,
          monto,
          cliente: "",
          vendedor: vendedor ? vendedor.nombre : "",
          fecha: new Date().toISOString(),
        };
        return {
          ...estado,
          movimientos: [nuevo, ...estado.movimientos],
        };
      },
    };
  }

  if (
    t.includes("compre") ||
    t.includes("compré") ||
    t.includes("hierro") ||
    t.includes("chapa") ||
    t.includes("material")
  ) {
    return {
      tipo: "compra",
      mensaje: `Compra/gasto cargado por ${formatoMoneda(monto)}`,
      ejecutar: () => {
        const nuevo = {
          id: Date.now(),
          tipo: "compra",
          concepto: texto,
          monto,
          cliente: "",
          vendedor: "",
          fecha: new Date().toISOString(),
        };
        return {
          ...estado,
          movimientos: [nuevo, ...estado.movimientos],
        };
      },
    };
  }

  if (t.includes("pedido") || t.includes("tengo que hacer")) {
    return {
      tipo: "pedido",
      mensaje: `Pedido creado${cliente ? " para " + cliente : ""}`,
      ejecutar: () => {
        const nuevoPedido = {
          id: Date.now(),
          cliente: cliente || "Sin cliente",
          producto: producto ? producto.nombre : "Fogonero",
          estado: "Pendiente",
          fecha: new Date().toISOString(),
        };
        return {
          ...estado,
          pedidos: [nuevoPedido, ...estado.pedidos],
        };
      },
    };
  }

  if (t.includes("termine") || t.includes("terminé") || t.includes("terminado")) {
    return {
      tipo: "terminado",
      mensaje: `Pedido marcado como terminado`,
      ejecutar: () => {
        const pedidosActualizados = estado.pedidos.map((p) =>
          cliente && p.cliente.toLowerCase() === cliente.toLowerCase()
            ? { ...p, estado: "Terminado" }
            : p
        );
        return {
          ...estado,
          pedidos: pedidosActualizados,
        };
      },
    };
  }

  return {
    tipo: "otro",
    mensaje: "No lo pude entender bien. Probá con más claridad.",
    ejecutar: () => estado,
  };
}

export default function App() {
  const [estado, setEstado] = useState({
    movimientos: [],
    pedidos: [],
    chat: [
      {
        autor: "app",
        texto:
          "Escribí algo como: 'compre hierro por 350000', 'vendi fogonero plano 100 a 780000 a Juan', 'pague comision a Lucas 90000', 'pedido fogonero con ruedas 120 para Pedro'",
      },
    ],
  });

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      setEstado(JSON.parse(guardado));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }, [estado]);

  const resumen = useMemo(() => {
    const ventas = estado.movimientos
      .filter((m) => m.tipo === "venta")
      .reduce((acc, m) => acc + m.monto, 0);

    const compras = estado.movimientos
      .filter((m) => m.tipo === "compra")
      .reduce((acc, m) => acc + m.monto, 0);

    const comisiones = estado.movimientos
      .filter((m) => m.tipo === "comision")
      .reduce((acc, m) => acc + m.monto, 0);

    const gastosFijos = gastosFijosBase.reduce((acc, g) => acc + g.monto, 0);

    return {
      ventas,
      compras,
      comisiones,
      gastosFijos,
      resultado: ventas - compras - comisiones - gastosFijos,
    };
  }, [estado.movimientos]);

  function enviarMensaje() {
    if (!mensaje.trim()) return;

    const resultado = clasificarMensaje(mensaje, estado);
    const nuevoEstado = resultado.ejecutar();

    setEstado({
      ...nuevoEstado,
      chat: [
        ...estado.chat,
        { autor: "yo", texto: mensaje },
        { autor: "app", texto: resultado.mensaje },
      ],
    });

    setMensaje("");
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Cinco Fuegos Control</h1>
      <p>App simple para cargar ventas, compras, comisiones y pedidos escribiendo mensajes.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 15 }}>
          <strong>Ventas</strong>
          <div>{formatoMoneda(resumen.ventas)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 15 }}>
          <strong>Compras</strong>
          <div>{formatoMoneda(resumen.compras)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 15 }}>
          <strong>Comisiones</strong>
          <div>{formatoMoneda(resumen.comisiones)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 15 }}>
          <strong>Resultado</strong>
          <div>{formatoMoneda(resumen.resultado)}</div>
        </div>
      </div>

      <div style={{ marginTop: 30, border: "1px solid #ddd", borderRadius: 12, padding: 15 }}>
        <h2>Cargar por mensaje</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej: vendi fogonero plano 100 a 780000 a Juan por Lucas"
            style={{ flex: 1, minWidth: 250, padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <button onClick={enviarMensaje} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}>
            Enviar
          </button>
        </div>

        <div style={{ marginTop: 15 }}>
          {estado.chat.map((c, i) => (
            <div
              key={i}
              style={{
                background: c.autor === "yo" ? "#111" : "#f3f3f3",
                color: c.autor === "yo" ? "#fff" : "#000",
                padding: 10,
                borderRadius: 10,
                marginBottom: 8,
              }}
            >
              {c.texto}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 30 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 15 }}>
          <h2>Movimientos</h2>
          {estado.movimientos.length === 0 ? (
            <p>No hay movimientos.</p>
          ) : (
            estado.movimientos.map((m) => (
              <div key={m.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
                <strong>{m.concepto}</strong>
                <div>Tipo: {m.tipo}</div>
                <div>Monto: {formatoMoneda(m.monto)}</div>
                {m.cliente ? <div>Cliente: {m.cliente}</div> : null}
                {m.vendedor ? <div>Vendedor: {m.vendedor}</div> : null}
              </div>
            ))
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 15 }}>
          <h2>Pedidos</h2>
          {estado.pedidos.length === 0 ? (
            <p>No hay pedidos.</p>
          ) : (
            estado.pedidos.map((p) => (
              <div key={p.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
                <strong>{p.cliente}</strong>
                <div>{p.producto}</div>
                <div>Estado: {p.estado}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}