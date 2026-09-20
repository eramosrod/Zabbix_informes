# Patrons del sistema

L'aplicació seguirà una arquitectura client-servidor:

- **Backend**: Node.js amb Express per gestionar les peticions, l'autenticació amb Zabbix i la generació de PDFs.
- **Frontend**: HTML, JavaScript i CSS per a la interfície d'usuari.
- **Integració**: Comunicació amb l'API de Zabbix mitjançant JSON-RPC. Les peticions autenticades utilitzen la capçalera `Authorization: Bearer <token>` per compatibilitat amb Zabbix 6.4/7.0+, amb fallback a `auth` en el cos per a versions antigues.
- **PDF**: Generació de PDFs a partir de la vista del dashboard utilitzant Puppeteer.
