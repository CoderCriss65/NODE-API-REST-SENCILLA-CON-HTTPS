Documentación: API REST de Empleados con HTTPS para Red Local
https://miro.medium.com/max/1400/1*5cCj3pU4lLQd0gBkX3x8dQ.png

Esta guía explica paso a paso cómo configurar una API REST completa para gestionar empleados, utilizando HTTPS para acceso seguro en tu red local.

Tabla de Contenidos
Requisitos Previos

Instalación de Dependencias

Configuración de la Base de Datos

Generación de Certificados SSL

Configuración del Servidor

Endpoints de la API

Ejecución del Servidor

Acceso desde la Red Local

Solución de Problemas

1. Requisitos Previos <a name="requisitos-previos"></a>
Windows 10

Node.js (v14 o superior) - Descargar Node.js

MySQL Server instalado - Descargar MySQL

Conexión a una red local (WiFi/Ethernet)

Terminal PowerShell (ejecutar como Administrador)

Verifica las instalaciones:

powershell
node --version
npm --version
mysql --version
2. Instalación de Dependencias <a name="instalación-de-dependencias"></a>
Crea una carpeta para tu proyecto y ejecuta:

powershell
# Inicializa proyecto Node.js
npm init -y

# Instala dependencias principales
npm install express mysql cors

# Instala herramientas de desarrollo (opcional)
npm install -D nodemon
Dependencias instaladas:

Paquete	Función
express	Framework para construir la API
mysql	Conector para base de datos MySQL
cors	Permite solicitudes entre dominios
nodemon	Reinicia automáticamente el servidor al hacer cambios
3. Configuración de la Base de Datos <a name="configuración-de-la-base-de-datos"></a>
3.1 Crear base de datos y tabla
Ejecuta en MySQL Workbench o línea de comandos:

sql
CREATE DATABASE empresa;

USE empresa;

CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    puesto VARCHAR(100) NOT NULL,
    salario DECIMAL(10, 2) NOT NULL
);

-- Datos de ejemplo
INSERT INTO empleados (nombre, puesto, salario) VALUES 
('Juan Pérez', 'Desarrollador', 3000.00),
('María López', 'Diseñadora', 2800.00);
3.2 Configuración de acceso
Usuario: root

Contraseña: 123 (cambiar por tu contraseña real)

Host: localhost

Base de datos: empresa

4. Generación de Certificados SSL <a name="generación-de-certificados-ssl"></a>
4.1 Instalar OpenSSL
Descarga OpenSSL para Windows:
https://slproweb.com/products/Win32OpenSSL.html

Instala Win64 OpenSSL v1.1.1 Light

Durante instalación selecciona:
Copy OpenSSL DLLs to: The Windows system directory

4.2 Generar certificados
Ejecuta en PowerShell como Administrador:

powershell
# Crear carpeta para certificados
mkdir C:\certificados
cd C:\certificados

# Generar certificado válido para IP local
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=IP:192.168.20.24,DNS:localhost"
Parámetros explicados:

-days 365: Certificado válido por 1 año

-subj "/CN=localhost": Nombre común para localhost

-addext "subjectAltName=IP:192.168.20.24": Permite acceso por IP local

-nodes: Sin contraseña para el certificado

5. Configuración del Servidor <a name="configuración-del-servidor"></a>
Crea un archivo app.js con el siguiente contenido:

javascript
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = 3000;
const LAN_IP = "192.168.20.24"; // Cambiar por tu IP local

// Middlewares
app.use(express.json());
app.use(cors());

// Logger de solicitudes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Conexión MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123", // Cambiar por tu contraseña
  database: "empresa"
});

db.connect(err => {
  if (err) console.error("Error DB:", err);
  else console.log("Conectado a MySQL");
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "src")));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

// [TODOS LOS ENDPOINTS AQUÍ - VER SECCIÓN 6]

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return res.status(500).json({ 
      error: "Error de certificado SSL",
      solucion: "Acepta el certificado en tu navegador"
    });
  }
  
  res.status(500).json({ error: "Error interno del servidor" });
});

// Configuración HTTPS
const httpsOptions = {
  key: fs.readFileSync('C:\\certificados\\key.pem'),
  cert: fs.readFileSync('C:\\certificados\\cert.pem')
};

// Iniciar servidor HTTPS
const server = https.createServer(httpsOptions, app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTPS iniciado en puerto ${PORT}`);
  console.log(`👉 Acceso local: https://localhost:${PORT}`);
  console.log(`👉 Acceso en red: https://${LAN_IP}:${PORT}`);
});

// Manejo de errores del servidor
server.on('error', (error) => {
  console.error('Error del servidor:', error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} está en uso.`);
  } else if (error.code === 'ENOENT') {
    console.error('Certificados no encontrados. Verifica rutas:');
    console.error('C:\\certificados\\key.pem');
    console.error('C:\\certificados\\cert.pem');
  }
});
6. Endpoints de la API <a name="endpoints-de-la-api"></a>
6.1 Obtener todos los empleados
javascript
app.get("/empleados", (req, res) => {
  db.query("SELECT * FROM empleados", (error, results) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.json(results);
    }
  });
});
6.2 Obtener empleado por ID
javascript
app.get("/empleados/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM empleados WHERE id = ?", [id], (error, results) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else if (results.length === 0) {
      res.status(404).json({ mensaje: "Empleado no encontrado" });
    } else {
      res.json(results[0]);
    }
  });
});
6.3 Crear nuevo empleado
javascript
app.post("/empleados", (req, res) => {
  const { nombre, puesto, salario } = req.body;
  if (!nombre || !puesto || !salario) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  db.query(
    "INSERT INTO empleados (nombre, puesto, salario) VALUES (?, ?, ?)",
    [nombre, puesto, salario],
    (error, result) => {
      if (error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(201).json({ 
          mensaje: "Empleado agregado", 
          id: result.insertId 
        });
      }
    }
  );
});
6.4 Actualizar empleado
javascript
app.put("/empleados/:id", (req, res) => {
  const id = req.params.id;
  const { nombre, puesto, salario } = req.body;

  if (!nombre || !puesto || !salario) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  db.query(
    "UPDATE empleados SET nombre = ?, puesto = ?, salario = ? WHERE id = ?",
    [nombre, puesto, salario, id],
    (error, result) => {
      if (error) {
        res.status(500).json({ error: error.message });
      } else if (result.affectedRows === 0) {
        res.status(404).json({ mensaje: "Empleado no encontrado" });
      } else {
        res.json({ mensaje: "Empleado actualizado correctamente" });
      }
    }
  );
});
6.5 Eliminar empleado
javascript
app.delete("/empleados/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM empleados WHERE id = ?", [id], (error, result) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ mensaje: "Empleado no encontrado" });
    } else {
      res.json({ mensaje: "Empleado eliminado correctamente" });
    }
  });
});
6.6 Creación masiva de empleados
javascript
app.post("/empleados/masivo", (req, res) => {
  const empleados = req.body;

  if (!Array.isArray(empleados) || empleados.length === 0) {
    return res.status(400).json({ mensaje: "Debe enviar un array de empleados válido." });
  }

  const valores = empleados.map(({ nombre, puesto, salario }) => 
    [nombre, puesto, salario]
  );

  db.query(
    "INSERT INTO empleados (nombre, puesto, salario) VALUES ?",
    [valores],
    (error, result) => {
      if (error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(201).json({ 
          mensaje: "Empleados agregados correctamente", 
          filasInsertadas: result.affectedRows 
        });
      }
    }
  );
});
7. Ejecución del Servidor <a name="ejecución-del-servidor"></a>
7.1 Iniciar el servidor
powershell
node app.js
7.2 Mensajes esperados
text
✅ Servidor HTTPS iniciado en puerto 3000
👉 Acceso local: https://localhost:3000
👉 Acceso en red: https://192.168.20.24:3000
⚠️  Si ves advertencias de seguridad, acepta el certificado
7.3 Probar con cURL
powershell
# Obtener todos los empleados
curl -k https://localhost:3000/empleados

# Crear nuevo empleado
curl -k -X POST https://localhost:3000/empleados -H "Content-Type: application/json" -d "{\"nombre\":\"Ana Torres\",\"puesto\":\"Gerente\",\"salario\":4500}"
8. Acceso desde la Red Local <a name="acceso-desde-la-red-local"></a>
8.1 Desde tu máquina
text
https://localhost:3000
https://192.168.20.24:3000
8.2 Desde otros dispositivos
Conéctate a la misma red WiFi/Ethernet

Descarga el certificado cert.pem desde C:\certificados

Instálalo como certificado de confianza:

Windows:

Doble clic en cert.pem

Seleccionar "Instalar certificado" > "Local Machine"

Almacenar en "Entidades de certificación raíz de confianza"

Android:

Ajustes > Seguridad > Criptografía > Instalar certificado > CA

iOS:

Descargar certificado

Ajustes > General > Perfiles > Instalar

Accede desde el navegador:

text
https://192.168.20.24:3000/empleados
8.3 Endpoints disponibles
Método	Endpoint	Función
GET	/empleados	Obtener todos los empleados
GET	/empleados/:id	Obtener empleado por ID
POST	/empleados	Crear nuevo empleado
POST	/empleados/masivo	Crear múltiples empleados
PUT	/empleados/:id	Actualizar empleado
DELETE	/empleados/:id	Eliminar empleado
