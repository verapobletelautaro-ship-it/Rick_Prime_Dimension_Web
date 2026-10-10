RICK_PRIME — LA DIMENSIÓN PRIME
Web estática + funciones Netlify + OAuth2 Discord + puente opcional discord.py

IMPORTANTE
- No reemplaces tu bot.py.
- No publiques el token de tu bot ni el secreto de Discord en GitHub.
- El panel guarda configuración en Netlify Blobs. El puente de Termux la descarga
  y la expone en bot.dashboard_configs, pero no cambia automáticamente tus
  comandos existentes: hay que conectar cada ajuste a la lógica actual del bot.
- Netlify Functions requiere que el sitio esté desplegado en Netlify y que las
  variables de entorno estén configuradas.
- Para que el puente funcione, el bot debe tener acceso a Internet mientras corre.

PASO 1 — Crear aplicación Discord
1. Entra a https://discord.com/developers/applications
2. Crea una aplicación para el sitio (puede ser la misma identidad visual, pero
   NO uses el token del bot como Client Secret).
3. En OAuth2 copia Client ID y Client Secret.
4. Añade como Redirect URL EXACTA:
   https://TU-SITIO.netlify.app/.netlify/functions/auth-callback
5. Guarda cambios. El inicio de sesión usa los scopes identify y guilds; no pide
   contraseña ni token de usuario.

PASO 2 — Publicar en Netlify
1. Sube el contenido de esta carpeta a un repositorio GitHub nuevo.
2. En Netlify importa ese repositorio.
3. Build command: npm install
   Publish directory: public
   Functions directory: netlify/functions (Netlify lo detecta desde netlify.toml).
4. En Netlify > Site configuration > Environment variables añade:
   DISCORD_CLIENT_ID = tu Client ID
   DISCORD_CLIENT_SECRET = tu Client Secret
   DISCORD_REDIRECT_URI = https://TU-SITIO.netlify.app/.netlify/functions/auth-callback
   SESSION_SECRET = una cadena aleatoria larga (mínimo 32 caracteres)
   DASHBOARD_SYNC_TOKEN = otra cadena aleatoria larga y diferente
5. Genera secretos desde Termux, por ejemplo:
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   Ejecuta el comando dos veces y usa cada resultado en una variable distinta.
6. Vuelve a desplegar el sitio después de configurar las variables.
7. Prueba primero el inicio de sesión y el guardado de una configuración.

PASO 3 — Conectar el puente al bot sin borrar bot.py
1. Copia bot-termux/dashboard_bridge.py a la carpeta ~/mi-bot.
2. Instala aiohttp si no está disponible:
   python -m pip install aiohttp
   (discord.py normalmente ya lo instala como dependencia).
3. En Termux, configura la URL de la función y el mismo token secreto:
   export DASHBOARD_SYNC_URL='https://TU-SITIO.netlify.app/.netlify/functions/bot-configs'
   export DASHBOARD_SYNC_TOKEN='EL_MISMO_SECRETO_DE_NETLIFY'
4. En el lugar donde configuras las extensiones de discord.py, carga:
   await bot.load_extension("dashboard_bridge")
   Esto debe ejecutarse dentro de una función async y después de que bot exista.
   Si tu bot no usa extensiones, no pegues esa línea al azar: pide ayuda para
   integrarla en el punto correcto sin duplicar on_ready.
5. Inicia el bot desde esa misma sesión de Termux. El archivo
   dashboard_configs.json aparecerá cuando la sincronización funcione.

QUÉ HACE EL PUENTE
- Consulta el endpoint privado una vez por minuto.
- Verifica con un token separado de los tokens Discord.
- Guarda las configuraciones descargadas en dashboard_configs.json.
- Expone los datos en bot.dashboard_configs para que tus comandos puedan leerlos.
- Por seguridad, no ejecuta código recibido desde la web.

LIMITACIÓN IMPORTANTE
Los campos de bienvenida, logs, antispam y prefijo se guardan y sincronizan, pero
para que cambien el comportamiento de tus comandos actuales hay que enlazarlos
con las estructuras y funciones exactas de tu bot.py. No sobrescribe archivos
de configuración existentes porque sus formatos pueden variar. Cuando esté
publicada la web, se puede hacer esa integración puntual sin reemplazar el bot.
