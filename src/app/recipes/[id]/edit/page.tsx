import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import RecipeForm from "@/components/recipe/RecipeForm"; // ItemForm 대신 RecipeForm 임포트

export default async function RecipeEditPage({ params }: { params: { id: string } }) {
  console.log("RecipeEditPage: params.id", params.id); // 1. params.id 확인
  const supabase = createSupabaseServerClient();
  const { data: recipe, error } = await supabase
    .from("items")
    .select("*, cited_recipe_ids, profiles!items_user_id_fkey(*), ingredients(*), instructions(*)") // cited_recipe_ids 명시적으로 추가
    .eq("id", params.id)
    .eq("item_type", "recipe")
    .single();

  console.log("RecipeEditPage: Supabase query result - data:", recipe); // 2. 쿼리 결과 데이터 확인
  console.log("RecipeEditPage: Supabase query result - error:", error); // 2. 쿼리 결과 에러 확인

  if (error) {
    console.error("RecipeEditPage: Supabase query error:", error); // 에러 발생 시 로그
    notFound(); // 에러 발생 시 404
  }

  if (!recipe) {
    console.log("RecipeEditPage: Recipe not found, calling notFound()"); // 3. 레시피 없을 시 404
    notFound();
  }

  return <RecipeForm initialData={recipe} />;
}
