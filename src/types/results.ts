// Group by status
export interface StatusResult {
  statusId: string
  count: string
  totalValue: string
  weightedValue: string
  Status: {
    name: string
    color: string
  }
}

// Group by assigned user
export interface UserResult {
  assignedToId: string
  count: string
  totalValue: string
  weightedValue: string
  assignedTo: {
    firstName: string
    lastName: string
  }
}
