# Patrons del sistema

L'aplicació seguirà una arquitectura client-servidor:

- **Backend**: Node.js amb Express per gestionar les peticions, l'autenticació amb Zabbix i la generació de PDFs.
- **Frontend**: HTML, JavaScript i CSS per a la interfície d'usuari.
- **Integració**: Comunicació amb l'API de Zabbix mitjançant JSON-RPC. Les peticions autenticades utilitzen la capçalera `Authorization: Bearer <token>` per compatibilitat amb Zabbix 6.4/7.0+, amb fallback a `auth` en el cos per a versions antigues.
- **PDF**: Generació de PDFs a partir de la vista del dashboard utilitzant Puppeteer.
- **Programació defensiva**: Totes les funcions de renderització al frontend han de validar les dades d'entrada (comprovar si són arrays) i gestionar els estats buits o d'error de manera elegant. Les crides de renderització han d'estar aïllades en blocs `try-catch`.
- **Tauler de problemes**: Implementació d'un tauler de problemes basat en `event.get` de Zabbix, amb consulta per lots (batch) per a `r_clock` per optimitzar el rendiment, càlcul de durada al frontend i estils personalitzats per a estats (PROBLEM/RESOLVED) i severitats segons la paleta oficial de Zabbix.
- **Filtratge estricte de severitat (Severity Filtering)**: Implementació de doble capa de filtratge per excloure esdeveniments "Not classified" (severity 0):
  - **Capa servidor (`zabbixService.getActiveProblems`)**: Calcula la severitat utilitzant ordre de prioritat `event.severity` > `event.priority` > `event.trigger?.priority`. Descarte tots els esdeveniments amb severitat 0 abans de la serialització de la resposta.
  - **Capa client (`filterClassifiedProblems`)**: Funció de saniteig reutilitzable aplicada al handler `generate-report` i com a defensa en profunditat a `renderDashboard()`.
  - **Funcions de renderització pures**: `renderAlertsTable`, `renderSeverityBarChart`, `renderHostsAlertsTable` depenen exclusivament del seu paràmetre d'entrada (dataset ja sanitejat), sense accedir a variables globals ni estats no filtrats.
  - **Garantia d'integritat**: Assegura que les taules UI, gràfics i exportacions no mostren mai files "Not classified" (grises).
- **Taula Resum d'Alertes (Summary Alerts Table)**: Nova funcionalitat per agrupar i resumir alertes per combinació Host + Trigger + Severitat:
  - **Agrupació per clau composta**: Clau única `${hostName}___${triggerName}` per identificar cada combinació única.
  - **Comptatge i ordenació**: Comptador d'ocurrències per grup, ordenat descendentment (b.count - a.count) per mostrar les alertes més freqüents al capdamunt.
  - **Filtratge temporal integrat**: Hereta el filtratge per `time_from` / `time_till` del backend (`event.get` API Zabbix), garantint consistència amb la resta del dashboard.
  - **Renderització amb badges de severitat**: Reutilitza `getSeverityBadge()` per mostrar severitats amb colors oficials Zabbix (Information, Warning, Average, High, Disaster).
  - **Funcions pures i reutilitzables**: `generateSummaryAlerts()` (processament) i `renderSummaryAlertsTable()` (renderització) separades per responsabilitats.
- **Ordre i estructura de taules al Dashboard (Layout/Responsive)**:
  - **Ordre visual definit**: 1) Estat dels Servidors, 2) Bloque de recuentos (Recompte d'Alertes per Severitat + Recompte d'Alertes per Màquina), 3) Resumen d'Alertes, 4) Alertes Actives.
  - **Estructura unificada `table-card full-width`**: Totes les taules principals (Estat dels Servidors, Resumen d'Alertes, Alertes Actives) comparteixen la mateixa estructura: contenidor `table-card full-width` amb `h2` de títol i wrapper `table-responsive` per a la taula, garantint amplada total de pantalla, marges homogènies i scroll horitzontal consistent.
  - **Consistència visual**: Eliminades estructures Bootstrap heterogènies (`card`, `card-header`, `card-body`, `table-striped`, `table-hover`) a favor de l'estructura CSS pròpia del projecte (`.table-card`, `.table-responsive`, `.full-width`).
- **Expansió vertical completa de taules (Eliminació de scroll vertical intern)**:
  - **Objectiu**: Permetre que les taules (Estat dels Servidors, Resumen d'Alertes, Alertes Actives, Recompte d'Alertes per Màquina) es mostrin completament sense barra de scroll vertical intern, independentment del nombre de registres (ex. 40+ línies).
  - **Canvis CSS (`app/public/style.css`)**:
    - Eliminat `max-height: 280px` i `overflow-y: auto` de la classe `.table-responsive`.
    - Afegides regles per desactivar scroll vertical: `max-height: none !important`, `overflow-y: visible !important` per `.table-responsive`, `.card-body`, `.table-container`.
    - Mantenit `overflow-x: auto` per permetre scroll horitzontal en pantalles estretes si cal.
  - **Verificació HTML**: Confirmat que no hi ha estils inline (`style="max-height: ...; overflow-y: scroll;"`) que restringeixin l'alçada de les taules a `app/public/index.html`.
  - **Resultat**: Les taules ara s'expandeixen verticalment de forma dinàmica segons el contingut, mostrant totes les files de forma contínua.
