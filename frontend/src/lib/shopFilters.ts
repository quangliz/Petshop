export const DOG_CATEGORY_SLUG = "cho";
export const CAT_CATEGORY_SLUG = "meo";
export const SHARED_PET_CATEGORY_SLUG = "cho-meo";

export const DOG_SHOP_CATEGORY_SLUGS = [DOG_CATEGORY_SLUG, SHARED_PET_CATEGORY_SLUG];
export const CAT_SHOP_CATEGORY_SLUGS = [CAT_CATEGORY_SLUG, SHARED_PET_CATEGORY_SLUG];

const sameSlugSet = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((slug) => rightSet.has(slug));
};

export const buildCategoryFilterHref = (slugs: string | string[]) => {
  const params = new URLSearchParams();
  const slugList = Array.isArray(slugs) ? slugs : [slugs];
  slugList.forEach((slug) => params.append("category_slug", slug));
  return `/shop?${params.toString()}`;
};

export const getCategoryFilterTitle = (slugs: string[]) => {
  if (slugs.length === 1 && slugs[0] === DOG_CATEGORY_SLUG) return "Sản phẩm cho chó";
  if (slugs.length === 1 && slugs[0] === CAT_CATEGORY_SLUG) return "Sản phẩm cho mèo";
  if (sameSlugSet(slugs, DOG_SHOP_CATEGORY_SLUGS)) return "Sản phẩm cho chó";
  if (sameSlugSet(slugs, CAT_SHOP_CATEGORY_SLUGS)) return "Sản phẩm cho mèo";
  return "";
};
