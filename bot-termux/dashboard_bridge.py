"""
Puente opcional para el bot discord.py existente.
No reemplaza bot.py. Consulta las configuraciones del panel y las expone como
bot.dashboard_configs[guild_id]. Debes conectar esas opciones a tus comandos
existentes antes de que cambien su comportamiento.
"""
import asyncio
import json
import os
from pathlib import Path
import aiohttp
import discord
from discord.ext import commands

CONFIG_PATH = Path("dashboard_configs.json")
SYNC_URL = os.getenv("DASHBOARD_SYNC_URL", "").strip()
SYNC_TOKEN = os.getenv("DASHBOARD_SYNC_TOKEN", "").strip()
POLL_SECONDS = 60

class DashboardBridge(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.bot.dashboard_configs = {}
        self.task = asyncio.create_task(self.sync_loop())

    def cog_unload(self):
        self.task.cancel()

    async def sync_loop(self):
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            if SYNC_URL and SYNC_TOKEN:
                try:
                    timeout = aiohttp.ClientTimeout(total=15)
                    async with aiohttp.ClientSession(timeout=timeout) as session:
                        async with session.get(
                            SYNC_URL,
                            headers={"Authorization": f"Bearer {SYNC_TOKEN}"}
                        ) as response:
                            if response.status == 200:
                                payload = await response.json()
                                configs = payload.get("configs", [])
                                self.bot.dashboard_configs = {
                                    str(c["guild_id"]): c for c in configs
                                    if c.get("guild_id")
                                }
                                CONFIG_PATH.write_text(
                                    json.dumps(self.bot.dashboard_configs, indent=2, ensure_ascii=False),
                                    encoding="utf-8"
                                )
                                print(f"[Rick_Prime Dashboard] {len(configs)} configuraciones sincronizadas.")
                            elif response.status == 401:
                                print("[Rick_Prime Dashboard] Token de sincronización rechazado; revisa la variable.")
                            else:
                                print(f"[Rick_Prime Dashboard] HTTP {response.status}")
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    print(f"[Rick_Prime Dashboard] Error de sincronización: {exc}")
            await asyncio.sleep(POLL_SECONDS)

async def setup(bot):
    await bot.add_cog(DashboardBridge(bot))
