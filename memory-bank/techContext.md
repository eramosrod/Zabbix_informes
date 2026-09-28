# Context tecnològic

- **Llenguatge**: JavaScript (Node.js)
- **Backend**: Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **API**: Zabbix API (JSON-RPC)
- **PDF**: Puppeteer
- **Autenticació**: Zabbix API Token (via `Authorization: Bearer` header per a Zabbix 6.4/7.0+, amb fallback a `auth` en el cos per a versions antigues)
- **Filtratge de severitat**: Doble capa (servidor + client) per excloure "Not classified" (severity 0):
  - **Servidor (`app/backend/zabbixService.js`)**: `getActiveProblems()` calcula severitat amb prioritat `event.severity` > `event.priority` > `event.trigger?.priority`, descarta severity 0 abans de respondre.
  - **Client (`app/public/script.js`)**: `filterClassifiedProblems()` saniteja `data.activeProblems` al handler `generate-report` i a `renderDashboard()` com a defensa en profunditat.
  - **Funcions pures**: `renderAlertsTable`, `renderSeverityBarChart`, `renderHostsAlertsTable` reben només dataset sanitejat com a paràmetre.
- **Taula Resum d'Alertes (`generateSummaryAlerts`, `renderSummaryAlertsTable`)**:
  - **Agrupació**: Clau composta `${hostName}___${triggerName}` per identificar combinacions úniques Host + Trigger.
  - **Comptatge**: Incrementa comptador per cada ocurrència dins del rang temporal seleccionat.
  - **Ordenació**: Descendent per recuente (b.count - a.count) - alertes més freqüents primer.
  - **Filtratge temporal**: Hereta paràmetres `time_from` / `time_till` de `event.get` API Zabbix via backend.
  - **Severitat**: Reutilitza `getSeverityBadge()` per badges amb colors oficials Zabbix (1=Information, 2=Warning, 3=Average, 4=High, 5=Disaster).
  - **Funcions separades**: Processament (`generateSummaryAlerts`) i renderització (`renderSummaryAlertsTable`) desacoblades.
