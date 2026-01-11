import { MenuItem, MenuCategoryData } from "@/types";

export const MENU_CATEGORIES: MenuCategoryData[] = [
  {
    id: "rice",
    name: "Rice Dishes",
    description: "Authentic Ghanaian rice dishes",
  },
  {
    id: "noodles",
    name: "Noodles",
    description: "Delicious noodle dishes",
  },
  {
    id: "sandwiches",
    name: "Sandwiches & Snacks",
    description: "Quick bites and snacks",
  },
  {
    id: "sides",
    name: "Sides",
    description: "Perfect accompaniments",
  },
  {
    id: "drinks",
    name: "Drinks",
    description: "Refreshing beverages",
  },
];

export const MENU_ITEMS: MenuItem[] = [
  // Rice Dishes
  {
    id: "jollof-grilled-chicken-large",
    name: "Jollof with Grilled Chicken",
    description: "Large portion of authentic jollof rice with perfectly grilled chicken",
    price: 50,
    category: "rice",
    popular: true,
    available: true,
  },
  {
    id: "jollof-grilled-chicken-small",
    name: "Jollof with Grilled Chicken",
    description: "Small portion of authentic jollof rice with perfectly grilled chicken",
    price: 40,
    category: "rice",
    available: true,
  },
  {
    id: "fried-rice-grilled-chicken-large",
    name: "Fried Rice with Grilled Chicken",
    description: "Large portion of special fried rice with grilled chicken",
    price: 50,
    category: "rice",
    popular: true,
    available: true,
  },
  {
    id: "fried-rice-grilled-chicken-small",
    name: "Fried Rice with Grilled Chicken",
    description: "Small portion of special fried rice with grilled chicken",
    price: 40,
    category: "rice",
    available: true,
  },
  {
    id: "plain-rice-turkey-stew",
    name: "Plain Rice with Turkey Stew",
    description: "Large portion of plain rice served with delicious turkey stew",
    price: 70,
    category: "rice",
    available: true,
  },
  {
    id: "jollof-goat",
    name: "Jollof with Goat",
    description: "Large portion of jollof rice with tender goat meat",
    price: 70,
    category: "rice",
    available: true,
  },
  {
    id: "assorted-jollof-special",
    name: "Anis Special Assorted Jollof",
    description: "Our signature jollof rice with assorted meats",
    price: 70,
    category: "rice",
    popular: true,
    available: true,
  },
  {
    id: "special-assorted-fried-rice",
    name: "Special Assorted Fried Rice",
    description: "Special fried rice with assorted meats and extra chicken",
    price: 80,
    category: "rice",
    popular: true,
    available: true,
  },
  {
    id: "jollof-only",
    name: "Jollof Rice Only",
    description: "Large portion of jollof rice",
    price: 30,
    category: "sides",
    available: true,
  },
  {
    id: "fried-rice-only",
    name: "Fried Rice Only",
    description: "Large portion of fried rice",
    price: 30,
    category: "sides",
    available: true,
  },
  // Noodles
  {
    id: "indomie-noodles",
    name: "Indomie Noodles",
    description: "Delicious assorted indomie noodles",
    price: 60,
    category: "noodles",
    available: true,
  },
  // Sandwiches & Snacks
  {
    id: "spring-rolls",
    name: "Spring Rolls",
    description: "Crispy spring rolls (6 pieces)",
    price: 30,
    category: "sandwiches",
    available: true,
  },
  {
    id: "samosa",
    name: "Samosa",
    description: "Spiced samosa (6 pieces)",
    price: 30,
    category: "sandwiches",
    available: true,
  },
];

export const getMenuItemsByCategory = (category: string): MenuItem[] => {
  return MENU_ITEMS.filter((item) => item.category === category);
};

export const getPopularItems = (): MenuItem[] => {
  return MENU_ITEMS.filter((item) => item.popular === true);
};

export const getMenuItemById = (id: string): MenuItem | undefined => {
  return MENU_ITEMS.find((item) => item.id === id);
};

