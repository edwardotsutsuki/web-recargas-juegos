# Plataforma de recargas gamer — base backend

Primer entregable: diseño SQL para Supabase, arquitectura modular y Docker Compose.

- [Migración SQL](supabase/migrations/202609060001_initial_schema.sql)
- [Arquitectura, flujo transaccional y contrato REST](docs/architecture.md)
- [Docker Compose](docker-compose.yml)
- [Variables de entorno](.env.example)

```powershell
Copy-Item .env.example .env
# Completar .env antes de iniciar.
docker compose up --build -d
```

El contenedor expone únicamente `GET /health`. Los endpoints comerciales y las RPC
monetarias se describen para la siguiente fase; no están implementados.
Docker usa Supabase gestionado y no levanta un Supabase local.
