import { Decimal } from "decimal.js"

/**
 * Calcule le prix total d'un élément de devis
 * @param quantity Quantité
 * @param unitPrice Prix unitaire
 * @param discount Remise (optionnel)
 * @param discountType Type de remise (PERCENTAGE ou FIXED)
 * @param taxRate Taux de TVA (optionnel)
 * @returns Prix total calculé
 */
export function calculateItemTotal(
  quantity: number | string,
  unitPrice: number | string,
  discount?: number | string | null,
  discountType?: string | null,
  taxRate?: number | string | null
): number {
  // Utilise Decimal.js pour éviter les erreurs d'arrondi
  let qty = new Decimal(quantity)
  let price = new Decimal(unitPrice)
  let total = qty.times(price)

  // Appliquer la remise si elle existe
  if (discount && discountType) {
    if (discountType === "PERCENTAGE") {
      total = total.times(new Decimal(1).minus(new Decimal(discount).dividedBy(100)))
    } else if (discountType === "FIXED") {
      total = total.minus(new Decimal(discount))
    }
  }

  return total.toNumber()
}

/**
 * Calcule le montant total d'un devis avec remise globale
 * @param itemsTotal Somme des totaux des éléments
 * @param discountAmount Montant de la remise globale (optionnel)
 * @param discountType Type de remise globale (PERCENTAGE ou FIXED)
 * @returns Montant total après remise
 */
export function calculateQuoteTotal(
  itemsTotal: number | string,
  discountAmount?: number | string | null,
  discountType?: string | null
): number {
  let total = new Decimal(itemsTotal)

  if (discountAmount && discountType) {
    if (discountType === "PERCENTAGE") {
      total = total.times(
        new Decimal(1).minus(new Decimal(discountAmount).dividedBy(100))
      )
    } else if (discountType === "FIXED") {
      total = total.minus(new Decimal(discountAmount))
    }
  }

  return total.toNumber()
}

/**
 * Calcule la TVA sur un montant
 * @param amount Montant hors taxes
 * @param taxRate Taux de TVA
 * @returns Montant de la TVA
 */
export function calculateTax(amount: number | string, taxRate: number | string): number {
  const amountDecimal = new Decimal(amount)
  const taxRateDecimal = new Decimal(taxRate).dividedBy(100)

  return amountDecimal.times(taxRateDecimal).toNumber()
}

/**
 * Calcule les totaux du devis à partir des éléments
 * @param items Éléments du devis
 * @param globalDiscountAmount Remise globale (optionnel)
 * @param globalDiscountType Type de remise globale (optionnel)
 * @param globalTaxRate Taux de TVA global (optionnel)
 * @returns Objet contenant les totaux calculés
 */
export function calculateQuoteTotals(
  items: Array<any>,
  globalDiscountAmount?: number | string | null,
  globalDiscountType?: string | null,
  globalTaxRate?: number | string | null
): {
  subTotal: number
  totalBeforeDiscount: number
  discountAmount: number
  totalAfterDiscount: number
  taxAmount: number
  totalAmount: number
} {
  // Calcul du sous-total (somme des éléments)
  const subTotal = items.reduce((sum, item) => {
    const itemTotal = calculateItemTotal(
      item.quantity,
      item.unitPrice,
      item.discount,
      item.discountType,
      item.taxRate
    )
    return sum + itemTotal
  }, 0)

  // Calcul du total après remise globale
  const totalBeforeDiscount = subTotal
  let discountAmount = 0

  if (globalDiscountAmount && globalDiscountType) {
    if (globalDiscountType === "PERCENTAGE") {
      discountAmount = new Decimal(subTotal)
        .times(new Decimal(globalDiscountAmount).dividedBy(100))
        .toNumber()
    } else {
      discountAmount = Number(globalDiscountAmount)
    }
  }

  const totalAfterDiscount = new Decimal(totalBeforeDiscount)
    .minus(discountAmount)
    .toNumber()

  // Calcul de la TVA
  const taxRate = globalTaxRate ? Number(globalTaxRate) : 0
  const taxAmount = calculateTax(totalAfterDiscount, taxRate)

  // Total final avec TVA
  const totalAmount = new Decimal(totalAfterDiscount).plus(taxAmount).toNumber()

  return {
    subTotal,
    totalBeforeDiscount,
    discountAmount,
    totalAfterDiscount,
    taxAmount,
    totalAmount,
  }
}
