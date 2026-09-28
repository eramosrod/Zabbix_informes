# Context del producte

L'objectiu és crear una aplicació web que permeti als usuaris generar informes de Zabbix per Host Group.

## Funcionalitats clau
- Autenticació amb Zabbix via API Token.
- Selecció de Host Groups i rangs de dates.
- Visualització de mètriques (CPU, RAM, Disk, Alerts, ICMP) en un dashboard.
- **Taula "Resumen d'Alertes"**: Agrupació i resum d'alertes per Host + Trigger + Severitat, amb comptatge d'ocurrències i ordenació descendent per freqüència (estil Zabbix Report > 100 most busy triggers). Filtratge per rang temporal seleccionat per l'usuari.
- Exportació del dashboard a PDF professional utilitzant Puppeteer.
