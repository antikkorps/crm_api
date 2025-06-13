import { describe, expect, it } from "@jest/globals"
import {
    calculateItemTotal,
    calculateQuoteTotal,
    calculateQuoteTotals,
    calculateTax,
} from "../../src/services/quoteCalculationService"

describe("Quote Calculation Service", () => {
  describe("calculateItemTotal", () => {
    it("should calculate total without discount", () => {
      const result = calculateItemTotal(2, 100)
      expect(result).toBe(200)
    })

    it("should apply percentage discount correctly", () => {
      const result = calculateItemTotal(2, 100, 10, "PERCENTAGE")
      expect(result).toBe(180) // 200 - 10%
    })

    it("should apply fixed discount correctly", () => {
      const result = calculateItemTotal(2, 100, 20, "FIXED")
      expect(result).toBe(180) // 200 - 20
    })

    it("should handle string inputs", () => {
      const result = calculateItemTotal("2", "100", "10", "PERCENTAGE")
      expect(result).toBe(180)
    })

    it("should ignore discount when discountType is missing", () => {
      const result = calculateItemTotal(2, 100, 10)
      expect(result).toBe(200)
    })

    it("should ignore discount when discount is missing", () => {
      const result = calculateItemTotal(2, 100, null, "PERCENTAGE")
      expect(result).toBe(200)
    })
  })

  describe("calculateQuoteTotal", () => {
    it("should return the same amount when no discount is applied", () => {
      const result = calculateQuoteTotal(1000)
      expect(result).toBe(1000)
    })

    it("should apply percentage discount correctly", () => {
      const result = calculateQuoteTotal(1000, 20, "PERCENTAGE")
      expect(result).toBe(800) // 1000 - 20%
    })

    it("should apply fixed discount correctly", () => {
      const result = calculateQuoteTotal(1000, 200, "FIXED")
      expect(result).toBe(800) // 1000 - 200
    })

    it("should handle string inputs", () => {
      const result = calculateQuoteTotal("1000", "20", "PERCENTAGE")
      expect(result).toBe(800)
    })

    it("should ignore discount when discountType is missing", () => {
      const result = calculateQuoteTotal(1000, 20)
      expect(result).toBe(1000)
    })

    it("should ignore discount when discountAmount is missing", () => {
      const result = calculateQuoteTotal(1000, null, "PERCENTAGE")
      expect(result).toBe(1000)
    })
  })

  describe("calculateTax", () => {
    it("should calculate tax correctly", () => {
      const result = calculateTax(1000, 20)
      expect(result).toBe(200) // 20% of 1000
    })

    it("should handle string inputs", () => {
      const result = calculateTax("1000", "20")
      expect(result).toBe(200)
    })

    it("should handle zero tax rate", () => {
      const result = calculateTax(1000, 0)
      expect(result).toBe(0)
    })
  })

  describe("calculateQuoteTotals", () => {
    const items = [
      { quantity: 2, unitPrice: 100, discount: 0, discountType: null, taxRate: 20 },
      { quantity: 1, unitPrice: 500, discount: 50, discountType: "FIXED", taxRate: 10 },
    ]

    it("should calculate all totals correctly without global discount", () => {
      const result = calculateQuoteTotals(items)

      // Item 1: 2 * 100 = 200
      // Item 2: 1 * 500 - 50 = 450
      // SubTotal = 650
      expect(result.subTotal).toBe(650)
      expect(result.totalBeforeDiscount).toBe(650)
      expect(result.discountAmount).toBe(0)
      expect(result.totalAfterDiscount).toBe(650)
      expect(result.taxAmount).toBe(0) // No global tax rate provided
      expect(result.totalAmount).toBe(650)
    })

    it("should calculate all totals with global percentage discount and tax", () => {
      const result = calculateQuoteTotals(items, 10, "PERCENTAGE", 20)

      // SubTotal = 650
      // Discount = 65 (10%)
      // After discount = 585
      // Tax = 117 (20%)
      // Total = 702
      expect(result.subTotal).toBe(650)
      expect(result.discountAmount).toBe(65)
      expect(result.totalAfterDiscount).toBe(585)
      expect(result.taxAmount).toBe(117)
      expect(result.totalAmount).toBe(702)
    })

    it("should calculate all totals with global fixed discount", () => {
      const result = calculateQuoteTotals(items, 50, "FIXED", 10)

      // SubTotal = 650
      // Discount = 50
      // After discount = 600
      // Tax = 60 (10%)
      // Total = 660
      expect(result.subTotal).toBe(650)
      expect(result.discountAmount).toBe(50)
      expect(result.totalAfterDiscount).toBe(600)
      expect(result.taxAmount).toBe(60)
      expect(result.totalAmount).toBe(660)
    })
  })
})
