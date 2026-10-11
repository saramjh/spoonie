import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// 실제 폼의 onSubmit 본문을 그대로 실행한다. 네트워크·인증·스토리지는
// 가짜로 대체하여 공개 글이나 운영 계정은 만들지 않는다.
function actualSubmitHandler(
  filename: string,
  scope: Record<string, unknown>,
): (values: Record<string, unknown>) => Promise<void> {
  const filePath = resolve(process.cwd(), filename)
  const file = ts.createSourceFile(filename, readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let expression = ""
  function find(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "onSubmit" && node.initializer) {
      expression = node.initializer.getText(file)
    }
    ts.forEachChild(node, find)
  }
  find(file)
  if (!expression) throw new Error("Expected real onSubmit handler in " + filename)
  const compiled = ts.transpileModule("const onSubmit = " + expression + ";", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  return new Function(...Object.keys(scope), compiled + "\nreturn onSubmit;")(...Object.values(scope)) as (values: Record<string, unknown>) => Promise<void>
}

function setup(kind: "recipe" | "post", options: { failFirstSave?: boolean; missingAuthFirst?: boolean } = {}) {
  const calls: string[] = []
  let releaseAuth!: () => void
  const authWait = new Promise<void>((resolve) => { releaseAuth = resolve })
  const user = { id: "isolated-fake-user", email: "test@example.invalid", user_metadata: {} }
  let authCalls = 0
  const toast = vi.fn()
  const afterCommit = async (_label: string, action: () => unknown) => { await action() }
  const scope: Record<string, unknown> = {
    isSubmitting: false,
    setIsSubmitting: vi.fn(),
    submitLock: { current: false },
    supabase: { auth: { getUser: async () => {
      await authWait
      authCalls++
      return { data: { user: options.missingAuthFirst && authCalls === 1 ? null : user }, error: null }
    } } },
    mainImages: kind === "recipe" ? [{ file: new File([], "saved.jpg"), preview: "https://cdn.invalid/saved.jpg" }] : [],
    instructionImages: [],
    thumbnailIndex: 0,
    isEditMode: false,
    initialData: null,
    bucketId: "isolated-bucket",
    uploadImagesOptimized: vi.fn(async () => []),
    resolveImageUploadOrder: vi.fn(() => ({ imageUrls: kind === "recipe" ? ["https://cdn.invalid/saved.jpg"] : [], newUrls: [] })),
    uploadInstructionImages: vi.fn(async () => []),
    attachInstructionImages: vi.fn(() => []),
    buildRecipeItemPayload: vi.fn(() => ({ title: "test recipe" })),
    buildPostItemPayload: vi.fn(() => ({ content: "test post" })),
    saveRecipeRows: vi.fn(async () => {
      calls.push("recipe-db-attempt")
      if (options.failFirstSave && calls.filter((x) => x === "recipe-db-attempt").length === 1) throw Error("explicit database rejection")
      calls.push("recipe-db-commit")
      return { itemId: "mock-id", ingredientsToInsert: [] }
    }),
    savePostRow: vi.fn(async () => {
      calls.push("post-db-attempt")
      if (options.failFirstSave && calls.filter((x) => x === "post-db-attempt").length === 1) throw Error("explicit database rejection")
      calls.push("post-db-commit")
      return { itemId: "mock-id" }
    }),
    afterCommit,
    draft: { finishPublish: async () => { calls.push("draft-finished") } },
    cacheManager: { addNewItem: async () => {}, updateItem: async () => {}, revalidateHomeFeed: async () => {} },
    logEvent: async () => {},
    revalidateItemPage: async () => {},
    toast,
    entrySource: null,
    forkFrom: null,
    onboardingDraft: null,
    onNavigateBack: () => { calls.push("navigated") },
    router: { replace: () => {}, push: () => {} },
    removeDroppedImages: vi.fn(),
    globalMutate: () => {},
    notificationService: { notifyRecipeCited: async () => {} },
    returnToSourcePath: () => null,
    sourceRecipeId: null,
    sourceOrigin: null,
    cleanupUncommittedImages: vi.fn(async () => {}),
    console,
    process,
    File,
    Item: undefined,
    bucket: "isolated-bucket",
  }
  const filename = kind === "recipe"
    ? "src/features/recipe/components/RecipeForm.tsx"
    : "src/components/items/PostForm.tsx"
  const submit = actualSubmitHandler(filename, scope)
  return { scope, submit, calls, releaseAuth }
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS", "isolated-test-bucket")
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("real Recipe/Recipeed onSubmit bodies - mocked auth/storage/DB", () => {
  for (const kind of ["recipe", "post"] as const) {
    it(kind + " saves exactly once when two submit events race before React rerenders", async () => {
      const { submit, releaseAuth, calls } = setup(kind)
      const value = kind === "recipe"
        ? { title: "Saved", description: "", ingredients: [], instructions: [], cited_recipe_ids: [] }
        : { content: "Saved", cited_recipe_ids: [], is_public: true }
      const first = submit(value)
      const second = submit(value)
      releaseAuth()
      await Promise.all([first, second])
      expect(calls.filter((call) => call.endsWith("db-commit"))).toHaveLength(1)
      // Even if client navigation is delayed, a second submit cannot duplicate the committed item.
      await submit(value)
      expect(calls.filter((call) => call.endsWith("db-commit"))).toHaveLength(1)
    })

    it(kind + " unlocks after a confirmed database failure so the author can retry", async () => {
      const { submit, releaseAuth, calls } = setup(kind, { failFirstSave: true })
      const value = kind === "recipe"
        ? { title: "Saved", ingredients: [], instructions: [], cited_recipe_ids: [] }
        : { content: "Saved", cited_recipe_ids: [], is_public: true }
      const first = submit(value)
      releaseAuth()
      await first
      expect(calls.filter((call) => call.endsWith("db-commit"))).toHaveLength(0)
      await submit(value)
      expect(calls.filter((call) => call.endsWith("db-commit"))).toHaveLength(1)
    })

    it(kind + " permits resubmission after missing login", async () => {
      const { submit, releaseAuth, calls } = setup(kind, { missingAuthFirst: true })
      const value = kind === "recipe"
        ? { title: "Saved", ingredients: [], instructions: [], cited_recipe_ids: [] }
        : { content: "Saved", cited_recipe_ids: [], is_public: true }
      const first = submit(value)
      releaseAuth()
      await first
      expect(calls.filter((call) => call.endsWith("db-commit"))).toHaveLength(0)
      await submit(value)
      expect(calls.filter((call) => call.endsWith("db-commit"))).toHaveLength(1)
    })
  }
})
