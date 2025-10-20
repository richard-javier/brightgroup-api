// backend/server.js
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173' // Permite la conexión desde tu frontend de Vite
}));
app.use(express.json());

// ----------------------------------------------------------------
// 1. CONFIGURACIÓN DE BASE DE DATOS (MYSQL)
// ----------------------------------------------------------------
const db = mysql.createConnection({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, // CONFIRMAR CREDENCIALES
    password: process.env.DB_PASSWORD, // CONFIRMAR CREDENCIALES
    database: 'brightgroup_db' 
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL.');

    // Creación de tabla: Se ejecuta solo la primera vez que inicia el servidor
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS contactos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            message TEXT,
            submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.query(createTableSQL, (err) => {
        if (err) console.error('Error creando la tabla:', err);
    });
});

// ----------------------------------------------------------------
// 2. CONFIGURACIÓN DE ENVÍO DE CORREO (NODEMAILER)
// ----------------------------------------------------------------
const transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS // ⚠️ USA UNA CONTRASEÑA DE APLICACIÓN DE GOOGLE
    }
});


// ----------------------------------------------------------------
// 3. RUTA API PARA EL FORMULARIO (Guarda en DB y Envía Correo)
// ----------------------------------------------------------------
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).send({ success: false, message: 'Faltan campos requeridos.' });
    }

    // A. GUARDAR EN MYSQL
    const sql = 'INSERT INTO contactos (name, email, message) VALUES (?, ?, ?)';
    db.query(sql, [name, email, message], (dbErr, result) => {
        if (dbErr) {
            console.error('Error al guardar en la base de datos:', dbErr);
            return res.status(500).send({ success: false, message: 'Error al guardar el contacto en la base de datos.' });
        }
        
        console.log('Contacto guardado con ID:', result.insertId);

        // B. ENVIAR CORREO (Solo si la base de datos fue exitosa)
        const mailOptions = {
            from: 'rjcp1420l@gmail.com',
            to: 'richardacs1967@gmail.com', // Correo destino (rjcp142000@hotmail.com)
            subject: `[BRIGHTGROUP] Nuevo Mensaje de ${name}`,
            html: `
                <h1>Nuevo Contacto de Landing Page</h1>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Mensaje:</strong> ${message}</p>
            `
        };

        transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
                console.error('Error al enviar correo:', mailErr);
                // Reportamos éxito a React, ya que el dato se guardó, pero avisamos del fallo del correo.
                return res.send({ success: true, message: 'Datos guardados, pero falló el envío de correo (Revisa logs).' });
            } else {
                console.log('Correo enviado:', info.response);
                // Éxito completo: Guardado y Correo enviados
                return res.send({ success: true, message: 'Mensaje enviado y guardado con éxito.' });
            }
        });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor de backend corriendo en http://localhost:${PORT}`);
});