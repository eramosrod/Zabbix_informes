# Context actiu

S'ha solucionat l'error d'autenticació amb la API de Zabbix (versions 6.4/7.0+) implementant un mecanisme de fallback en el mètode `user.login` de `backend/zabbixService.js`. També s'ha millorat el logging d'errors en les crides JSON-RPC per facilitar el diagnòstic.

## Tasques realitzades
- [x] Configurar .roocodeignore i .roocoderules.
- [x] Crear theme.config.js per a l'estil visual.
- [x] Implementar backend (Node.js/Express) i frontend (Paso 1: Login).
- [x] Implementar frontend (Paso 2: Filtres i consulta a Zabbix).
- [x] Implementar lògica de dades (Paso 3: Obtenció de mètriques).
- [x] Implementar dashboard i exportació a PDF (Paso 4).
- [x] Solucionar error d'autenticació Zabbix API (fallback `user.login`).
- [x] Auditar mètodes JSON-RPC i millorar logging d'errors.
