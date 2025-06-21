const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");
const https = require('https'); // Módulo HTTPS añadido
const fs = require('fs');       // Módulo File System añadido

const app = express();
const PORT = 3000;
const LAN_IP = "192.168.20.24"; // Tu IP local

// Middleware para permitir JSON y evitar problemas de CORS
app.use(express.json());
app.use(cors());

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123",
  database: "empresa"
});

db.connect(err => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
  } else {
    console.log("Conectado a la base de datos MySQL");
  }
});

// Servir archivos estáticos desde la carpeta "src"
app.use(express.static(path.join(__dirname, "src")));

// Ruta principal para servir "index.html"
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "index.html"));
})

// 📌 1️⃣ Obtener todos los empleados
app.get("/empleados", (request, response) => {
  db.query("SELECT * FROM empleados", (error, results) => {
    if (error) {
      response.status(500).json({ error: error.message });
    } else {
      response.json(results);
    }
  });
});

// 📌 2️⃣ Obtener un empleado por su ID
app.get("/empleados/:id", (request, response) => {
  const id = request.params.id;
  db.query("SELECT * FROM empleados WHERE id = ?", [id], (error, results) => {
    if (error) {
      response.status(500).json({ error: error.message });
    } else if (results.length === 0) {
      response.status(404).json({ mensaje: "Empleado no encontrado" });
    } else {
      response.json(results[0]); // Devuelve solo el empleado encontrado
    }
  });
});

// 📌 3️⃣ Agregar un nuevo empleado
app.post("/empleados", (request, response) => {
  const { nombre, puesto, salario } = request.body;
  if (!nombre || !puesto || !salario) {
    return response.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  db.query(
    "INSERT INTO empleados (nombre, puesto, salario) VALUES (?, ?, ?)",
    [nombre, puesto, salario],
    (error, result) => {
      if (error) {
        response.status(500).json({ error: error.message });
      } else {
        response.status(201).json({ mensaje: "Empleado agregado", id: result.insertId });
      }
    }
  );
});

app.post("/empleados/masivo", (request, response) => {
  const empleados = request.body;

  // Validar que el array no esté vacío
  if (!Array.isArray(empleados) || empleados.length === 0) {
    return response.status(400).json({ mensaje: "Debe enviar un array de empleados válido." });
  }

  // Construir los valores para la consulta SQL
  const valores = empleados.map(({ nombre, puesto, salario }) => [nombre, puesto, salario]);

  // Query de inserción masiva
  const sql = "INSERT INTO empleados (nombre, puesto, salario) VALUES ?";

  db.query(sql, [valores], (error, result) => {
    if (error) {
      response.status(500).json({ error: error.message });
    } else {
      response.status(201).json({ mensaje: "Empleados agregados correctamente", filasInsertadas: result.affectedRows });
    }
  });
});

// 📌 4️⃣ Actualizar un empleado
app.put("/empleados/:id", (request, response) => {
  const id = request.params.id;
  const { nombre, puesto, salario } = request.body;

  if (!nombre || !puesto || !salario) {
    return response.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  db.query(
    "UPDATE empleados SET nombre = ?, puesto = ?, salario = ? WHERE id = ?",
    [nombre, puesto, salario, id],
    (error, result) => {
      if (error) {
        response.status(500).json({ error: error.message });
      } else if (result.affectedRows === 0) {
        response.status(404).json({ mensaje: "Empleado no encontrado" });
      } else {
        response.json({ mensaje: "Empleado actualizado correctamente" });
      }
    }
  );
});

// 📌 5️⃣ Eliminar un empleado
app.delete("/empleados/:id", (request, response) => {
  const id = request.params.id;

  db.query("DELETE FROM empleados WHERE id = ?", [id], (error, result) => {
    if (error) {
      response.status(500).json({ error: error.message });
    } else if (result.affectedRows === 0) {
      response.status(404).json({ mensaje: "Empleado no encontrado" });
    } else {
      response.json({ mensaje: "Empleado eliminado correctamente" });
    }
  });
});

// Configuración HTTPS
// Reemplaza la sección HTTPS al final del código por esto:
const httpsOptions = {
    key: fs.readFileSync('C:\\certificados\\key.pem'),
    cert: fs.readFileSync('C:\\certificados\\cert.pem')
  };
  
  https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor HTTPS accesible en:`);
    console.log(`👉 https://localhost:${PORT}`);
    console.log(`👉 https://${LAN_IP}:${PORT}`);
    console.log('⚠️  Los dispositivos en la red deben aceptar el certificado');
  });