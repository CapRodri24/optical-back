const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");

const app = express();

const allowedOrigins = [
  "http://localhost:8080",
  "https://optilabs.netlify.app",  
  "https://optical-back.onrender.com",    
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.some((allowedOrigin) =>
        origin.includes(allowedOrigin.replace(/https?:\/\//, "")),
      )
    ) {
      return callback(null, true);
    }

    const msg = `El origen ${origin} no tiene permiso de acceso.`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const loginRoutes = require("./src/routes/loginroutes");
app.use("/api/login", loginRoutes);
const crearTiendaRoutes = require("./src/routes/crearTiendaroutes");
app.use("/api/crearTienda", crearTiendaRoutes);
const usuariosRoutes = require("./src/routes/usuariosRoutes");
app.use("/api/usuariosRoutes", usuariosRoutes);
const formularioUserRoutes = require("./src/routes/formularioUserRoutes");
app.use("/api/formulario-usuario", formularioUserRoutes);
const materialesRoutes = require("./src/routes/materialesRoutes");
app.use("/api/materiales", materialesRoutes);
const organicoRoutes = require("./src/routes/organicoRoutes");
app.use("/api/organico", organicoRoutes);
const organicoFormularioRoutes = require("./src/routes/organicoFormularioRoutes");
app.use("/api/organico-formulario", organicoFormularioRoutes);
const clientesRoutes = require("./src/routes/clientesRoutes");
app.use("/api/clientes", clientesRoutes);
const HistorialVentasRoutes = require("./src/routes/HistorialVentasRoutes");
app.use("/api/historial-ventas", HistorialVentasRoutes);
const PagosPendientesRoutes = require("./src/routes/PagosPendientesRoutes");
app.use("/api/pagos-pendientes", PagosPendientesRoutes);
const EntregasPendientesRoutes = require("./src/routes/EntregasPendientesRoutes");
app.use("/api/entregas-pendientes", EntregasPendientesRoutes);
const cajaRoutes = require("./src/routes/CajaRoutes");
app.use("/api/caja", cajaRoutes);
const reportesRoutes = require("./src/routes/reportesRoutes");
app.use("/api/reportes", reportesRoutes);
const DashboardRoutes = require("./src/routes/DashboardRoutes");
app.use("/api/dashboard", DashboardRoutes);
const ConfiguracionRoutes = require("./src/routes/ConfiguracionRoutes");
app.use("/api/configuracion", ConfiguracionRoutes);
const SpiderAdminRoutes = require("./src/routes/SpiderAdminRoutes");
app.use("/api/spider-admin", SpiderAdminRoutes);
const RouteMedidasOftalmicasRoutess = require("./src/routes/MedidasOftalmicasRoutes");
app.use("/api/medidas-oftalmicas", RouteMedidasOftalmicasRoutess);
const NuevaVentaRoutes = require("./src/routes/NuevaVentaRoutes");
app.use("/api/nueva-venta", NuevaVentaRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`,
  });
});

const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

startServer();
