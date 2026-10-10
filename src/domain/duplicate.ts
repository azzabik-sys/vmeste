/** Та же сумма в той же категории в тот же календарный день. Ввод не блокирует. */
export function sameExpenseOnDay(
  expenses: { id: string; categoryId: string; amount: number; spentOn: string }[],
  draft: { id?: string; categoryId: string; amount: number; spentOn: string },
): boolean {
  const cents = Math.round(draft.amount * 100)
  return expenses.some(
    (expense) =>
      expense.id !== draft.id &&
      expense.categoryId === draft.categoryId &&
      expense.spentOn === draft.spentOn &&
      Math.round(expense.amount * 100) === cents,
  )
}
