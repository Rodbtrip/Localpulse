// Single source of truth for business categories — must match the
// `shops_category_check` constraint in migration-wider-categories.sql
// exactly. Previously this list was hand-duplicated in three places
// (ShopForm validation, BrowseClient filters, ExploreClient filters),
// which let them silently drift out of sync — server-side validation
// rejected 15 of 23 valid categories because only this file's array
// gets updated when a category is added or changed going forward.
export const CATEGORIES = [
  { value: "coffee", label: "Coffee shop" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
  { value: "salon", label: "Salon" },
  { value: "spa", label: "Spa" },
  { value: "barbershop", label: "Barbershop" },
  { value: "fitness", label: "Gym / fitness studio" },
  { value: "yoga_studio", label: "Yoga studio" },
  { value: "retail", label: "Retail" },
  { value: "bookstore", label: "Bookstore" },
  { value: "grocery", label: "Grocery / market" },
  { value: "auto", label: "Auto services" },
  { value: "pet_services", label: "Pet services" },
  { value: "home_services", label: "Home services" },
  { value: "photography", label: "Photography" },
  { value: "florist", label: "Florist" },
  { value: "cleaning_services", label: "Cleaning services" },
  { value: "childcare", label: "Childcare" },
  { value: "tutoring_education", label: "Tutoring / education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "healthcare_wellness", label: "Healthcare / wellness" },
  { value: "other", label: "Other" },
] as const;

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

// Shared between BrowseClient (customer) and ExploreClient (owner) —
// these two were previously byte-identical duplicated arrays in two
// separate files, a second instance of the same "manually keep two
// lists in sync" risk that caused the earlier category-validation bug.
// Deliberately excludes "other" (not a meaningful filter) and uses
// shorter/pluralized labels suited to filter-chip UI, unlike the
// ShopForm dropdown's singular business-type labels above.
export const FILTER_CATEGORIES: { value: string | null; label: string }[] = [
  { value: "coffee", label: "Coffee" },
  { value: "restaurant", label: "Restaurants" },
  { value: "bakery", label: "Bakeries" },
  { value: "bar", label: "Bars" },
  { value: "salon", label: "Salons" },
  { value: "spa", label: "Spas" },
  { value: "barbershop", label: "Barbershops" },
  { value: "fitness", label: "Fitness" },
  { value: "yoga_studio", label: "Yoga" },
  { value: "retail", label: "Retail" },
  { value: "bookstore", label: "Bookstores" },
  { value: "grocery", label: "Grocery" },
  { value: "auto", label: "Auto" },
  { value: "pet_services", label: "Pet services" },
  { value: "home_services", label: "Home services" },
  { value: "photography", label: "Photography" },
  { value: "florist", label: "Florists" },
  { value: "cleaning_services", label: "Cleaning" },
  { value: "childcare", label: "Childcare" },
  { value: "tutoring_education", label: "Tutoring" },
  { value: "entertainment", label: "Entertainment" },
  { value: "healthcare_wellness", label: "Wellness" },
];
