# Context actiu

S'ha solucionat l'error d'autenticació amb la API de Zabbix (versions 6.4/7.0+) modificant el mètode `call` de `backend/zabbixService.js` per utilitzar la capçalera `Authorization: Bearer <token>` en lloc d'incloure el paràmetre `auth` en el cos JSON-RPC. S'ha implementat un mecanisme de fallback per mantenir la compatibilitat amb versions antigues de Zabbix.

## Tasques realitzades
- Refactorització completa de l'aplicació d'informes Zabbix.
- Fase 1: Compatibilitat Docker i gestió d'errors implementada.
- Fase 2: Exportació a HTML autònom implementada.
- Fase 3: Banner personalitzat persistent implementat.
- Fase 4: Validació i actualització de la documentació completada.
- [x] Configurar .roocodeignore i .roocoderules.
- [x] Crear theme.config.js per a l'estil visual.
- [x] Implementar backend (Node.js/Express) i frontend (Paso 1: Login).
- [x] Implementar frontend (Paso 2: Filtres i consulta a Zabbix).
- [x] Implementar lògica de dades (Paso 3: Obtenció de mètriques).
- [x] Implementar dashboard i exportació a PDF (Paso 4).
- [x] Solucionar error d'autenticació Zabbix API (fallback `user.login`).
- [x] Auditar mètodes JSON-RPC i millorar logging d'errors.
- [x] Corregir paràmetres en `history.get` (eliminar `search` i utilitzar `item.get` previ).
- [x] Solucionar runtime exception "Uncaught (in promise) TypeError: can't access property 'forEach', data is undefined" mitjançant programació defensiva al frontend i garantint arrays al backend.
- [x] Refactorització del Dashboard: eliminació de KPIs, simplificació de taula de servidors, implementació d'alertes actives via API i optimització per a PDF.
- [x] Afegir columna 'Alertes Actives' a la taula de servidors i refactoritzar la taula d'alertes a 7 columnes amb insígnies de severitat.
- [x] Resoldre error MODULE_NOT_FOUND eliminant la importació obsoleta de `dataProcessor` a `index.js` i `app/index.js`.
