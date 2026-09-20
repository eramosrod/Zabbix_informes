# Patrons del sistema

L'aplicació seguirà una arquitectura client-servidor:

- **Backend**: Node.js amb Express per gestionar les peticions, l'autenticació amb Zabbix i la generació de PDFs.
- **Frontend**: HTML, JavaScript i CSS per a la interfície d'usuari.
- **Integració**: Comunicació amb l'API de Zabbix mitjançant JSON-RPC.
- **PDF**: Generació de PDFs a partir de la vista del dashboard utilitzant Puppeteer.
