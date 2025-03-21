import Handlebars from "handlebars"

/**
 * Rend un template en utilisant Handlebars
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  try {
    // Compiler le template
    const compiledTemplate = Handlebars.compile(template)

    // Rendre avec les données
    return compiledTemplate(data)
  } catch (error) {
    console.error("Template rendering error:", error)
    throw new Error(
      `Failed to render template: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

/**
 * Enregistre des helpers personnalisés pour Handlebars
 */
export function registerHelpers(): void {
  // Helper pour formater une date
  Handlebars.registerHelper("formatDate", function <
    T
  >(this: T, date: Date | string, format: string = "DD/MM/YYYY") {
    if (!date) return ""

    try {
      const d = new Date(date)
      // Format simple
      return d.toLocaleDateString()
      // Pour un format plus avancé, on pourrait utiliser date-fns ou similaire
    } catch (e) {
      return ""
    }
  })

  // Helper pour formatage monétaire
  Handlebars.registerHelper("formatCurrency", function <
    T
  >(this: T, value: number, currency: string = "EUR") {
    if (value === undefined || value === null) return ""

    try {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
      }).format(value)
    } catch (e) {
      return value.toString()
    }
  })

  // Helper de condition avancée
  Handlebars.registerHelper("ifCond", function <
    T
  >(this: T, v1: any, operator: string, v2: any, options: Handlebars.HelperOptions) {
    switch (operator) {
      case "==":
        return v1 == v2 ? options.fn(this) : options.inverse(this)
      case "===":
        return v1 === v2 ? options.fn(this) : options.inverse(this)
      case "!=":
        return v1 != v2 ? options.fn(this) : options.inverse(this)
      case "!==":
        return v1 !== v2 ? options.fn(this) : options.inverse(this)
      case "<":
        return v1 < v2 ? options.fn(this) : options.inverse(this)
      case "<=":
        return v1 <= v2 ? options.fn(this) : options.inverse(this)
      case ">":
        return v1 > v2 ? options.fn(this) : options.inverse(this)
      case ">=":
        return v1 >= v2 ? options.fn(this) : options.inverse(this)
      default:
        return options.inverse(this)
    }
  })
}
