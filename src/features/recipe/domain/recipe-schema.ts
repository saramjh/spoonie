/** 레시피 편집 입력 문자열과 검증 완료 후 저장값의 계약.
 * 입력 tags는 쉼표 구분 문자열, 제출 tags는 문자열 배열이다.
 */
import * as z from "zod"

export const recipeSchema = z.object({
	title: z.string().min(3, "제목은 3글자 이상이어야 합니다."),
	description: z.string().optional(),
	servings: z.coerce.number<string | number>().min(1, "인분은 1 이상이어야 합니다."),
	cooking_time_minutes: z.coerce.number<string | number>().min(1, "조리시간은 1분 이상이어야 합니다."),
	is_public: z.boolean(),
	ingredients: z
		.array(
			z.object({
				name: z.string().min(1, "재료 이름을 입력하세요."),
				amount: z.coerce.number<string | number>().positive("수량은 0보다 커야 합니다."),
				unit: z.string().min(1, "단위를 입력하세요."),
			})
		)
		.min(1, "재료를 하나 이상 추가해주세요."),
	instructions: z
		.array(
			z.object({
				description: z.string().min(1, "조리법 설명을 입력하세요."),
				image_url: z.string().optional(), // 조리법 이미지 URL
			})
		)
		.min(1, "조리법을 하나 이상 추가해주세요."),
	color_label: z.string().nullable().optional(),
	tags: z
		.string()
		.optional()
		.transform((str) =>
			str
				? str
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag.length > 0)
				: []
		)
		.pipe(z.array(z.string())),
	cited_recipe_ids: z.array(z.string()).optional(), // 참고 레시피 ID 배열
})

export type RecipeFormValues = z.input<typeof recipeSchema>
export type RecipeSubmitValues = z.output<typeof recipeSchema>
