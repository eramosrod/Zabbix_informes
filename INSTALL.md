# Manual d'Instal·lació - Zabbix Informes

Aquest document detalla com instal·lar i executar l'aplicació d'informes de Zabbix.

## Requisits previs
- Docker
- Docker Compose

## Passos d'instal·lació

1. **Clonar el repositori** (si encara no ho has fet):
   ```bash
   git clone <url-del-repositori>
   cd Zabbix_informes
   ```

2. **Arrencar l'aplicació amb Docker**:
   Executa la següent comanda per construir la imatge i arrencar el contenidor:
   ```bash
   docker-compose up --build
   ```

3. **Accedir al Dashboard**:
   Un cop el contenidor estigui en marxa, obre el teu navegador i accedeix a:
   `http://localhost:3000`

## Desenvolupament
Si vols fer canvis al codi, el contenidor està configurat per servir els fitxers actuals. Després de fer canvis, pot ser necessari reconstruir la imatge si canvies les dependències (`package.json`).
