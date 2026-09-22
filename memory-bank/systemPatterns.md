# Patrons del sistema

L'aplicació seguirà una arquitectura client-servidor:

- **Backend**: Node.js amb Express per gestionar les peticions, l'autenticació amb Zabbix i la generació de PDFs.
- **Frontend**: HTML, JavaScript i CSS per a la interfície d'usuari.
- **Integració**: Comunicació amb l'API de Zabbix mitjançant JSON-RPC. Les peticions autenticades utilitzen la capçalera `Authorization: Bearer <token>` per compatibilitat amb Zabbix 6.4/7.0+, amb fallback a `auth` en el cos per a versions antigues.
- **PDF**: Generació de PDFs a partir de la vista del dashboard utilitzant Puppeteer.
- **Programació defensiva**: Totes les funcions de renderització al frontend han de validar les dades d'entrada (comprovar si són arrays) i gestionar els estats buits o d'error de manera elegant. Les crides de renderització han d'estar aïllades en blocs `try-catch`.
- **Tauler de problemes**: Implementació d'un tauler de problemes basat en `event.get` de Zabbix, amb consulta per lots (batch) per a `r_clock` per optimitzar el rendiment, càlcul de durada al frontend i estils personalitzats per a estats (PROBLEM/RESOLVED) i severitats segons la paleta oficial de Zabbix.
