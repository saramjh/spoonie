/** Post-DB-commit side effects must not turn an already saved item into a failed submission. */
export async function afterCommit(label: string, action: () => void | Promise<unknown>): Promise<void> {
  try {
    await action()
  } catch (error) {
    console.warn("Saved item follow-up failed (" + label + "):", error)
  }
}
