export interface ContactStats {
  overview: {
    totalContacts: number
    contactsWithEmail: number
    assignedContacts: number
    newContactsThisMonth: number
    newContactsThisWeek: number
    contactsWithRecentActivity: number
    contactsWithOpportunities: number
    contactsWithQuotes: number
    conversionRate: number
  }
  byStatus: Array<{
    statusId: string
    count: number
    Status: {
      name: string
      color: string
    }
  }>
  topAssignedUsers: Array<{
    assignedToId: string
    contactCount: number
    assignedTo: {
      firstName: string
      lastName: string
      email: string
    }
  }>
  monthlyGrowth: Array<{
    month: string
    count: number
  }>
  contactsByCompany: Array<{
    companyId: string
    contactCount: number
    company: {
      name: string
    }
  }>
  engagement: {
    withRecentActivity: number
    withOpportunities: number
    withQuotes: number
    withWonOpportunities: number
  }
}

export interface SegmentStats {
  overview: {
    totalSegments: number
    dynamicSegments: number
    manualSegments: number
    totalContactsInSegments: number
    recentlyEvaluatedSegments: number
    segmentsNeedingEvaluation: number
  }
  topSegments: Array<{
    id: string
    name: string
    description?: string
    isDynamic: boolean
    contactCount: number
    lastEvaluatedAt?: Date
  }>
  segmentsWithRecentActivity: Array<{
    id: string
    name: string
    contactCount: number
    activityCount: number
  }>
  segmentsWithOpportunities: Array<{
    id: string
    name: string
    contactCount: number
    opportunityCount: number
    totalValue: number
  }>
  segmentsWithQuotes: Array<{
    id: string
    name: string
    contactCount: number
    quoteCount: number
    totalAmount: number
  }>
  monthlySegmentGrowth: Array<{
    month: string
    count: number
  }>
  engagementRates: Array<{
    id: string
    name: string
    contactCount: number
    engagedContacts: number
    engagementRate: number
  }>
  performance: {
    averageContactsPerSegment: number
    segmentsWithActivity: number
    segmentsWithOpportunities: number
    segmentsWithQuotes: number
  }
}
