# API CRM - Documentation

## Système de Versioning de l'API

L'API utilise un système de versioning pour assurer la compatibilité ascendante. Les routes sont accessibles via:

- `/api/v1/...` - Version 1 explicite de l'API
- `/api/...` - Redirection automatique vers la dernière version stable (actuellement v1)

### Exemples d'utilisation:

Ces deux routes sont équivalentes et pointent vers la même ressource:

- `/api/v1/contacts`
- `/api/contacts`

Cependant, il est recommandé d'utiliser la version explicite (`/api/v1/...`) dans vos intégrations pour éviter des problèmes de compatibilité lors des futures mises à jour.

## Routes principales

# crm_api

This is a koa project for CRM API.

### To generate a JWT_SECRET

```bash
openssl rand -base64 48
```

### When ready to deploy

install sequelize-cli

```bash
npm install --save-dev sequelize-cli
```

initialiser la sructure de la base de données

```bash
npx sequelize-cli init
```

Créer la migration sur la base des modeles existants

```bash
npx sequelize-cli migration:generate --name initial-schema
```

et désactiver sync dans l'index.ts de l'app

```javascript
// En production, utilisez des migrations au lieu de sync
await sequelize.sync({ alter: true })
```
