export const INCOME_CATEGORIES = [
  { id: "sponsorship", label: "Sponsorship" },
  { id: "affiliate", label: "Affiliate Income" },
  { id: "ad_share", label: "Ad Revenue Share" },
  { id: "retainer", label: "Monthly Retainer" },
  { id: "annual_contract", label: "Annual Contract / Retainer" },
  { id: "hosting_services", label: "Cloud & Hosting Services" },
  { id: "other_income", label: "Other Income" }
] as const;

export const EXPENSE_CATEGORIES = [
  { id: "ad_spend", label: "Ad Spend" },
  { id: "content_production", label: "Content Production" },
  { id: "freelancer_pay", label: "Freelancer/Contractor Pay" },
  { id: "tools_subscriptions", label: "Tools & Subscriptions" },
  { id: "cloud_vps_hosting", label: "Cloud & VPS Hosting (Hetzner, AWS)" },
  { id: "domain_licenses", label: "Domains & Software Licenses" },
  { id: "other_expense", label: "Other Expense" }
] as const;

export type IncomeCategory = typeof INCOME_CATEGORIES[number]["id"];
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]["id"];
export type TransactionCategory = IncomeCategory | ExpenseCategory;

export function getCategoryLabel(id: string): string {
  const inc = INCOME_CATEGORIES.find((c) => c.id === id);
  if (inc) return inc.label;
  const exp = EXPENSE_CATEGORIES.find((c) => c.id === id);
  if (exp) return exp.label;
  return id;
}
