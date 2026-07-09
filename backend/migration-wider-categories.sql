-- LocalPulse — Migration: wider industry categories
-- Run after migration-automatic-only.sql.
--
-- Expands the original 8-category list (coffee, restaurant, salon,
-- fitness, retail, auto, bar, other) to cover a much broader range of
-- local business types.

alter table shops drop constraint if exists shops_category_check;

alter table shops
  add constraint shops_category_check check (category in (
    'coffee', 'restaurant', 'bakery', 'bar',
    'salon', 'spa', 'barbershop',
    'fitness', 'yoga_studio',
    'retail', 'bookstore', 'grocery',
    'auto', 'pet_services', 'home_services',
    'photography', 'florist', 'cleaning_services',
    'childcare', 'tutoring_education', 'entertainment',
    'healthcare_wellness', 'other'
  ));
