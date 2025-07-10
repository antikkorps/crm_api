# Règles de Segmentation

Ce document explique comment créer des règles de segmentation pour les segments dynamiques.

## Format des Règles

Les règles de segmentation peuvent être de trois types :

### 1. Condition Simple

Une condition simple teste un seul champ avec un opérateur et une valeur.

```json
{
  "field": "firstName",
  "operator": "contains",
  "value": "John"
}
```

**Champs disponibles :**

- `firstName` - Prénom du contact
- `lastName` - Nom du contact
- `email` - Email du contact
- `phone` - Téléphone du contact
- `position` - Poste du contact
- `statusId` - ID du statut du contact
- `companyId` - ID de l'entreprise du contact
- `assignedToId` - ID de l'utilisateur assigné

**Opérateurs disponibles :**

- `equals` - Égal à
- `notEquals` - Différent de
- `contains` - Contient (insensible à la casse)
- `notContains` - Ne contient pas (insensible à la casse)
- `startsWith` - Commence par (insensible à la casse)
- `endsWith` - Termine par (insensible à la casse)
- `greaterThan` - Supérieur à
- `lessThan` - Inférieur à

### 2. Condition Complexe

Une condition complexe combine plusieurs conditions avec des opérateurs logiques.

```json
{
  "operator": "AND",
  "conditions": [
    {
      "field": "firstName",
      "operator": "contains",
      "value": "John"
    },
    {
      "field": "email",
      "operator": "contains",
      "value": "gmail.com"
    }
  ]
}
```

**Opérateurs logiques :**

- `AND` - Toutes les conditions doivent être vraies
- `OR` - Au moins une condition doit être vraie

### 3. Tableau de Conditions (Nouveau format)

Un tableau de conditions est automatiquement converti en condition AND.

```json
[
  {
    "field": "firstName",
    "operator": "contains",
    "value": "John"
  },
  {
    "field": "email",
    "operator": "contains",
    "value": "gmail.com"
  }
]
```

**Note :** Ce format est équivalent à une condition AND avec les mêmes conditions.

## Exemples d'Utilisation

### Exemple 1 : Contacts avec prénom contenant "John"

```json
{
  "field": "firstName",
  "operator": "contains",
  "value": "John"
}
```

### Exemple 2 : Contacts actifs OU en attente

```json
{
  "operator": "OR",
  "conditions": [
    {
      "field": "statusId",
      "operator": "equals",
      "value": "ACTIVE"
    },
    {
      "field": "statusId",
      "operator": "equals",
      "value": "PENDING"
    }
  ]
}
```

### Exemple 3 : Contacts avec email Gmail ET prénom commençant par "J"

```json
{
  "operator": "AND",
  "conditions": [
    {
      "field": "email",
      "operator": "contains",
      "value": "gmail.com"
    },
    {
      "field": "firstName",
      "operator": "startsWith",
      "value": "J"
    }
  ]
}
```

### Exemple 4 : Condition complexe imbriquée

```json
{
  "operator": "AND",
  "conditions": [
    {
      "field": "email",
      "operator": "contains",
      "value": "gmail.com"
    },
    {
      "operator": "OR",
      "conditions": [
        {
          "field": "firstName",
          "operator": "startsWith",
          "value": "J"
        },
        {
          "field": "firstName",
          "operator": "startsWith",
          "value": "M"
        }
      ]
    }
  ]
}
```

### Exemple 5 : Format tableau (équivalent à AND)

```json
[
  {
    "field": "email",
    "operator": "contains",
    "value": "gmail.com"
  },
  {
    "field": "firstName",
    "operator": "startsWith",
    "value": "J"
  }
]
```

## Utilisation via l'API

### Créer un segment avec des règles

```bash
POST /api/segments
Content-Type: application/json

{
  "name": "Contacts Gmail avec prénom J",
  "description": "Contacts utilisant Gmail et dont le prénom commence par J",
  "isDynamic": true,
  "rules": {
    "operator": "AND",
    "conditions": [
      {
        "field": "email",
        "operator": "contains",
        "value": "gmail.com"
      },
      {
        "field": "firstName",
        "operator": "startsWith",
        "value": "J"
      }
    ]
  }
}
```

### Évaluer un segment

```bash
POST /api/segments/{segmentId}/evaluate
```

Cette action met à jour automatiquement les membres du segment selon les règles définies.

## Validation

Le système valide automatiquement :

- La présence des champs requis
- La validité des opérateurs
- La structure des conditions complexes
- La non-vacuité des tableaux de conditions

## Erreurs Courantes

1. **Règle manquante** : `"Segment has no rules to evaluate"`
2. **Format invalide** : `"Invalid rule format: must be either a simple condition or a complex condition"`
3. **Champ manquant** : `"Invalid simple rule: field and operator are required"`
4. **Conditions vides** : `"Invalid complex rule: operator and non-empty conditions array are required"`
