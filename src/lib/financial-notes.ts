/**
 * Simple-language notes for financial/accounting terms.
 * Used by InfoTooltip next to labels so admin/management can understand reports.
 */
export const FINANCIAL_TERM_NOTES: Record<string, string> = {
  revenue:
    "Total money from sales (orders) in this period. This is what customers paid before we subtract any costs.",
  cogs: "Cost of goods sold: what we spent on ingredients and materials to make the food we sold. Helps us see how much we really make from each sale.",
  grossProfit:
    "Revenue minus ingredient costs. How much we keep from sales before paying rent, staff, or other running costs.",
  grossMargin:
    "Gross profit as a percentage of revenue. A higher % means we keep more from each cedi of sales after ingredient costs.",
  expenses:
    "Running costs like rent, utilities, supplies, and other day-to-day spending. Does not include staff pay.",
  payroll: "Total staff wages and salaries we paid in this period.",
  operatingCost:
    "All non-ingredient costs: expenses plus payroll. What we spend to keep the business running.",
  netProfit:
    "What’s left after we subtract all costs (ingredients, expenses, payroll) from revenue. The real profit for the period.",
  netMargin:
    "Net profit as a percentage of revenue. Shows how much of each cedi of sales becomes profit after all costs.",
  cashIn: "Money that came in from paid orders (sales) in this period.",
  cashOut: "Money we paid out: expenses and payroll.",
  netCash: "Cash in minus cash out. Positive means we received more than we paid in the period.",
  deposits: "Money moved from the till or cash to the bank. Helps match physical cash to bank balance.",
  paymentMethod:
    "How the customer paid: Cash, Mobile Money, Card, etc. Use this to reconcile what you have in hand or in the bank.",
  variance:
    "When the amount you counted (e.g. cash in till) doesn’t match what the system says. Investigate and add a note when this happens.",
};
