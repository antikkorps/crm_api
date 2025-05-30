import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Transaction } from "sequelize"
import { convertQuoteToPurchaseOrder } from "../../src/services/quoteConversionService"
import { NotFoundError } from "../../src/utils/errors"

// Définir des types pour les mocks
interface MockQuoteItem {
  id: string
  get: jest.Mock
}

interface MockQuote {
  id: string
  get: jest.Mock
  update: jest.Mock
}

interface MockPurchaseOrder {
  id: string
  get: jest.Mock
}

// Déclaration des mocks
const mockQuoteFindOne = jest.fn()
const mockPurchaseOrderCreate = jest.fn()
const mockPurchaseOrderItemCreate = jest.fn()

// Mock des modèles Sequelize
jest.mock("../../src/models", () => ({
  Quote: {
    findOne: mockQuoteFindOne,
  },
  PurchaseOrder: {
    create: mockPurchaseOrderCreate,
  },
  PurchaseOrderItem: {
    create: mockPurchaseOrderItemCreate,
  },
}))

describe("Quote Conversion Service", () => {
  // Utiliser any pour éviter les erreurs de typage, puis assigner à notre interface
  let mockQuote: any
  let mockQuoteItems: any[]
  let mockPurchaseOrder: any
  let mockTransaction: Partial<Transaction>

  beforeEach(() => {
    // Réinitialiser l'état avant chaque test
    jest.clearAllMocks()

    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    } as Partial<Transaction>

    mockQuoteItems = [
      {
        id: "item1",
        get: jest.fn((field: string) => {
          const values: Record<string, any> = {
            productId: "product1",
            description: "Item 1",
            quantity: 2,
            unitPrice: 100,
            discount: 0,
            discountType: null,
            taxRate: 20,
            totalPrice: 200,
            position: 0,
          }
          return values[field]
        }),
      },
      {
        id: "item2",
        get: jest.fn((field: string) => {
          const values: Record<string, any> = {
            productId: "product2",
            description: "Item 2",
            quantity: 1,
            unitPrice: 500,
            discount: 50,
            discountType: "FIXED",
            taxRate: 10,
            totalPrice: 450,
            position: 1,
          }
          return values[field]
        }),
      },
    ]

    mockQuote = {
      id: "quote1",
      get: jest.fn((field: string) => {
        if (field === "items") {
          return mockQuoteItems
        }

        const values: Record<string, any> = {
          id: "quote1",
          status: "ACCEPTED",
          title: "Test Quote",
          description: "Test Description",
          validUntil: new Date("2025-12-31"),
          discountAmount: 10,
          discountType: "PERCENTAGE",
          taxRate: 20,
          notes: "Test notes",
          terms: "Test terms",
          companyId: "client1",
          contactId: "contact1",
          totalAmount: 650,
          tenantId: "tenant1",
          termsAndConditionsId: "terms1",
          taxes: 130,
        }
        return values[field]
      }),
      update: jest.fn(),
    }

    mockPurchaseOrder = {
      id: "po1",
      get: jest.fn((field) => (field === "id" ? "po1" : null)),
    }

    // Configurer les mocks
    mockQuoteFindOne.mockResolvedValue(mockQuote)
    mockPurchaseOrderCreate.mockResolvedValue(mockPurchaseOrder)
    mockPurchaseOrderItemCreate.mockImplementation((data: any) => {
      return Promise.resolve({
        id: `poitem${Math.random()}`,
        ...data,
      })
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("should throw error if quote is not found", async () => {
    mockQuoteFindOne.mockResolvedValue(null)

    await expect(
      convertQuoteToPurchaseOrder(
        "nonexistent",
        "user1",
        "tenant1",
        mockTransaction as Transaction
      )
    ).rejects.toThrow(NotFoundError)
  })

  it("should throw error if quote is not in ACCEPTED status", async () => {
    mockQuote.get = jest.fn((field: string) => {
      const values: Record<string, any> = {
        id: "quote1",
        status: "DRAFT", // Not ACCEPTED
        clientId: "client1",
        contactId: "contact1",
        tenantId: "tenant1",
      }
      return values[field]
    })

    await expect(
      convertQuoteToPurchaseOrder(
        "quote1",
        "user1",
        "tenant1",
        mockTransaction as Transaction
      )
    ).rejects.toThrow("Only accepted quotes can be converted to purchase orders")
  })

  it("should convert quote to purchase order successfully", async () => {
    const result = await convertQuoteToPurchaseOrder(
      "quote1",
      "user1",
      "tenant1",
      mockTransaction as Transaction
    )

    // Vérifier que la fonction crée un bon de commande
    expect(mockPurchaseOrderCreate).toHaveBeenCalled()

    // Vérifier que les éléments sont créés
    expect(mockPurchaseOrderItemCreate).toHaveBeenCalledTimes(2)

    // Vérifier que le statut du devis est mis à jour
    expect(mockQuote.update).toHaveBeenCalledWith(
      {
        status: "CONVERTED_TO_PO",
        convertedToId: "po1",
        convertedToType: "PURCHASE_ORDER",
      },
      { transaction: mockTransaction }
    )

    // Vérifier que le résultat est le bon de commande
    expect(result).toBe(mockPurchaseOrder)
  })
})
