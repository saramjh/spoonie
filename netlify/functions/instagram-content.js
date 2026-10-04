const EXPERIMENT_VERSION = 'cta_v1';
const HOOK_VARIANT = 'recipe_title_v1';
const SLIDE_STRATEGY = 'hero_gallery_steps_v1';

function uniqueHashtags(tags) {
  return ['집밥', '레시피', 'Spoonie', ...(tags || [])]
    .map((tag) => '#' + String(tag).replace(/\s+/g, ''))
    .filter((tag, index, all) => tag.length > 1 && all.indexOf(tag) === index)
    .slice(0, 10);
}

function selectPhotos(item, steps) {
  const covers = item.image_urls || [];
  const thumbnailIndex = Number.isInteger(item.thumbnail_index) ? item.thumbnail_index : 0;
  const first = covers[thumbnailIndex] || covers[0];
  return [
    first,
    ...covers.filter((url) => url && url !== first),
    ...(steps || []).map((step) => step.image_url),
  ].filter(Boolean).slice(0, 10);
}

function ctaVariantForReleaseOrder(releaseOrder) {
  const order = Number(releaseOrder);
  if (!Number.isFinite(order)) return 'site';
  return order % 2 === 0 ? 'save' : 'site';
}

function ctaText(variant) {
  if (variant === 'save') {
    return '나중에 만들어보고 싶다면 저장해두세요. 분량과 순서, 단계별 사진은 프로필 링크의 Spoonie에서 볼 수 있어요.';
  }
  return '분량과 순서, 단계별 사진은 Spoonie에서 볼 수 있어요. 프로필 링크 → spoonie.kr';
}

function compileInstagramContent(item, ingredients, steps, releaseOrder) {
  const photos = selectPhotos(item, steps);
  const ingredientNames = (ingredients || []).map((ingredient) => ingredient.name).filter(Boolean).slice(0, 6);
  const meta = [
    item.servings ? `${item.servings}인분` : '',
    item.cooking_time_minutes ? `${item.cooking_time_minutes}분` : '',
  ].filter(Boolean).join(' · ');
  const ctaVariant = ctaVariantForReleaseOrder(releaseOrder);
  const tags = uniqueHashtags(item.tags);

  const caption = [
    item.title,
    '',
    item.description || '',
    '',
    ingredientNames.length
      ? `재료: ${ingredientNames.join(', ')}${(ingredients || []).length > ingredientNames.length ? ' 외' : ''}`
      : '',
    meta,
    '',
    ctaText(ctaVariant),
    '',
    tags.join(' '),
  ].filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trim();

  return {
    caption,
    photos,
    experiment: {
      version: EXPERIMENT_VERSION,
      ctaVariant,
      hookVariant: HOOK_VARIANT,
      slideStrategy: SLIDE_STRATEGY,
      contentFormat: photos.length > 1 ? 'carousel' : 'single',
      slideCount: photos.length,
    },
  };
}

module.exports = {
  EXPERIMENT_VERSION,
  compileInstagramContent,
  ctaText,
  ctaVariantForReleaseOrder,
  selectPhotos,
};
