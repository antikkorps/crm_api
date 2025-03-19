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
