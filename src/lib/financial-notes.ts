/**
 * Simple-language notes for financial/accounting terms.
 * Used by InfoTooltip next to labels so admin/management can understand reports.
 */
export const FINANCIAL_TERM_NOTES: Record<string, string> = {
  sales:
    "Everything customers paid for completed sales in this period, after discounts. The figure every margin is measured against.",
  takings:
    "Everything customers paid for completed sales, VAT included. This is the money that came in; not all of it is ours to keep.",
  tax: "VAT and the levies (NHIL, GETFund, COVID) inside the takings. It is held for GRA, so it comes off before we count revenue.",
  netSales:
    "Takings minus VAT and levies: the business's real revenue, and the figure every margin is measured against.",
  discounts:
    "Money knocked off bills at the till. Already deducted from takings; shown so you can see what it cost.",
  tillSpends:
    "Cash spent from the drawer before spends had to be filed under an expense category. Counted as a cost so it is not lost.",
  refunds: "Paid sales given back to the customer. Already left out of takings, so not deducted again.",
  voids: "Tickets cancelled before the money was kept. No money changed hands, but the food may have been made.",
  deposits: "Cash moved from the drawer into MoMo or the bank. A transfer, not a cost.",
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
  paymentMethod:
    "How the customer paid: Cash, Mobile Money, Card, etc. Use this to reconcile what you have in hand or in the bank.",
  variance:
    "When the amount you counted (e.g. cash in till) doesn’t match what the system says. Investigate and add a note when this happens.",
};
