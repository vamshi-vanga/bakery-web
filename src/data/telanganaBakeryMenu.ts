/**
 * Preloaded Telangana Bakery Menus & Costs
 * Sourced directly from local Telangana bakery menus (Hyderabad, Secunderabad, Warangal, Nizamabad)
 */

export type BakeryScale = 'small' | 'medium' | 'large';

export interface TelanganaMenuItem {
  name: string;
  category: string;
  price: number;
  unit?: string;
  tier: 'small' | 'medium' | 'large';
}

export interface BakeryScaleOption {
  scale: BakeryScale;
  title: string;
  subtitle: string;
  badge: string;
  itemCount: number;
  description: string;
  popularItems: string[];
}

export const BAKERY_SCALE_OPTIONS: BakeryScaleOption[] = [
  {
    scale: 'small',
    title: 'Small Scale Bakery',
    subtitle: 'Counter & Hot Snacks (45 items)',
    badge: 'Essential Staples',
    itemCount: 45,
    description: 'Neighborhood hot puff counter, fresh daily milk breads, Osmania & fruit biscuits, and tea-time snacks.',
    popularItems: ['Veg / Egg / Chicken Puffs', 'Osmania & Fruit Biscuits', 'Milk Bread', 'Pineapple Pastry', 'Veg Roll'],
  },
  {
    scale: 'medium',
    title: 'Medium Scale Bakery',
    subtitle: 'Full Bakery & Cafe (80 items)',
    badge: 'Most Popular',
    itemCount: 80,
    description: 'Full snack counter with burgers, sandwiches, french fries, celebration cakes (500g/1kg), muffins, and shakes.',
    popularItems: ['Burgers & Sandwiches', 'Black Forest Cake (500g)', 'Margherita Pizza', 'Oreo Shake', 'Peri Peri Fries'],
  },
  {
    scale: 'large',
    title: 'Large Scale Bakery',
    subtitle: 'Bakery Cafe & Live Kitchen (320+ items)',
    badge: 'Comprehensive',
    itemCount: 324,
    description: 'Expansive bakery cafe featuring exotic pizzas, pastas, broasted chicken, dessert cakes, mojitos, and sweets.',
    popularItems: ['Full Pizza & Pasta Menu', 'Exotic Truffle Cakes', 'Mojitos & Frappes', 'Broasted Chicken', 'Traditional Sweets'],
  },
];

export const TELANGANA_BAKERY_MENU: TelanganaMenuItem[] = [
  {
    "name": "Veg Puff",
    "category": "Puffs & Savouries",
    "price": 20,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Egg Puff",
    "category": "Puffs & Savouries",
    "price": 20,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Paneer Puff",
    "category": "Puffs & Savouries",
    "price": 25,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Chicken Puff",
    "category": "Puffs & Savouries",
    "price": 30,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Butter Paneer Puff",
    "category": "Puffs & Savouries",
    "price": 45,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Butter Chicken Puff",
    "category": "Puffs & Savouries",
    "price": 45,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "French Fries",
    "category": "Snacks & Starters",
    "price": 75,
    "unit": "1 serving",
    "tier": "small"
  },
  {
    "name": "Peri Peri Fries",
    "category": "Snacks & Starters",
    "price": 90,
    "unit": "1 serving",
    "tier": "medium"
  },
  {
    "name": "French Fries with Cheese",
    "category": "Snacks & Starters",
    "price": 130,
    "unit": "1 serving",
    "tier": "medium"
  },
  {
    "name": "Chicken Loaded Fries",
    "category": "Snacks & Starters",
    "price": 160,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Veg Salad",
    "category": "Snacks & Starters",
    "price": 110,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Boiled Chicken Salad",
    "category": "Snacks & Starters",
    "price": 140,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Chicken Popcorn Salad",
    "category": "Snacks & Starters",
    "price": 160,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Veg Burger",
    "category": "Burgers & Sandwiches",
    "price": 60,
    "unit": "1 burger",
    "tier": "small"
  },
  {
    "name": "Veg Cheese Burger",
    "category": "Burgers & Sandwiches",
    "price": 70,
    "unit": "1 burger",
    "tier": "small"
  },
  {
    "name": "Veg Grilled Burger",
    "category": "Burgers & Sandwiches",
    "price": 75,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Paneer Burger",
    "category": "Burgers & Sandwiches",
    "price": 110,
    "unit": "1 burger",
    "tier": "medium"
  },
  {
    "name": "Paneer Cheese Burger",
    "category": "Burgers & Sandwiches",
    "price": 120,
    "unit": "1 burger",
    "tier": "medium"
  },
  {
    "name": "Chicken Burger",
    "category": "Burgers & Sandwiches",
    "price": 70,
    "unit": "1 burger",
    "tier": "small"
  },
  {
    "name": "Chicken Cheese Burger",
    "category": "Burgers & Sandwiches",
    "price": 80,
    "unit": "1 burger",
    "tier": "medium"
  },
  {
    "name": "Chicken Grilled Burger",
    "category": "Burgers & Sandwiches",
    "price": 85,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Chicken Zinger Burger",
    "category": "Burgers & Sandwiches",
    "price": 110,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Chicken 65 Burger",
    "category": "Burgers & Sandwiches",
    "price": 110,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Veg Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 45,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Veg Grilled Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 70,
    "unit": "1 sandwich",
    "tier": "small"
  },
  {
    "name": "Veg Cheese Grill Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 80,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Veg Corn Grilled Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 90,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Paneer Grilled Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 110,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Boiled Egg Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 45,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Chicken Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 55,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Chicken Grilled Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 80,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Chicken Cheese Grill Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 90,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Chicken 65 Grilled Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 120,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Veg Roll",
    "category": "Snacks & Starters",
    "price": 50,
    "unit": "1 roll",
    "tier": "small"
  },
  {
    "name": "Veg Hot Dog Roll",
    "category": "Snacks & Starters",
    "price": 70,
    "unit": "1 roll",
    "tier": "large"
  },
  {
    "name": "Paneer Roll",
    "category": "Snacks & Starters",
    "price": 90,
    "unit": "1 roll",
    "tier": "medium"
  },
  {
    "name": "Chicken Roll",
    "category": "Snacks & Starters",
    "price": 60,
    "unit": "1 roll",
    "tier": "small"
  },
  {
    "name": "Chicken Hot Dog Roll",
    "category": "Snacks & Starters",
    "price": 90,
    "unit": "1 roll",
    "tier": "large"
  },
  {
    "name": "Chicken 65 Roll",
    "category": "Snacks & Starters",
    "price": 100,
    "unit": "1 roll",
    "tier": "small"
  },
  {
    "name": "Chicken Popcorn Roll",
    "category": "Snacks & Starters",
    "price": 110,
    "unit": "1 roll",
    "tier": "large"
  },
  {
    "name": "Just Cheese Pizza",
    "category": "Pizzas & Pastas",
    "price": 100,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Veg Pizza",
    "category": "Pizzas & Pastas",
    "price": 130,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Veg Double Cheese Pizza",
    "category": "Pizzas & Pastas",
    "price": 150,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Veg Corn Pizza",
    "category": "Pizzas & Pastas",
    "price": 150,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Veg Cheese Burst Pizza",
    "category": "Pizzas & Pastas",
    "price": 160,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Chicken Pizza",
    "category": "Pizzas & Pastas",
    "price": 160,
    "unit": "1 pizza",
    "tier": "medium"
  },
  {
    "name": "Chicken Corn Pizza",
    "category": "Pizzas & Pastas",
    "price": 170,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Chicken Hot Mexican Pizza",
    "category": "Pizzas & Pastas",
    "price": 180,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Chicken Double Cheese Pizza",
    "category": "Pizzas & Pastas",
    "price": 180,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Chicken Popcorn Pizza",
    "category": "Pizzas & Pastas",
    "price": 200,
    "unit": "1 pizza",
    "tier": "large"
  },
  {
    "name": "Chicken Karti Wrap",
    "category": "Snacks & Starters",
    "price": 100,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Chicken Wrap",
    "category": "Snacks & Starters",
    "price": 110,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Paneer Wrap",
    "category": "Snacks & Starters",
    "price": 120,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Chicken Cheese Wrap",
    "category": "Snacks & Starters",
    "price": 120,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Chicken Arabian Wrap",
    "category": "Snacks & Starters",
    "price": 130,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Chicken Popcorn",
    "category": "Snacks & Starters",
    "price": 100,
    "unit": "10 pieces",
    "tier": "medium"
  },
  {
    "name": "Broasted Chicken Wings",
    "category": "Snacks & Starters",
    "price": 130,
    "unit": "4 pieces",
    "tier": "medium"
  },
  {
    "name": "Broasted Chicken Sticks",
    "category": "Snacks & Starters",
    "price": 130,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Broasted Chicken",
    "category": "Snacks & Starters",
    "price": 240,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Pineapple Pastry",
    "category": "Cakes & Pastries",
    "price": 30,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Butterscotch Pastry",
    "category": "Cakes & Pastries",
    "price": 35,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Black Forest Pastry",
    "category": "Cakes & Pastries",
    "price": 40,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Chocolate Truffle Pastry",
    "category": "Cakes & Pastries",
    "price": 70,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Casata Pastry",
    "category": "Cakes & Pastries",
    "price": 70,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Pudding",
    "category": "Traditional Sweets",
    "price": 50,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Chocolate Doughnut",
    "category": "Traditional Sweets",
    "price": 50,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Choco Lava",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Chocolate Brownie",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 piece",
    "tier": "medium"
  },
  {
    "name": "Bun Maska",
    "category": "Breads & Buns",
    "price": 45,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Choco Vanilla Cake",
    "category": "Cakes & Pastries",
    "price": 400,
    "unit": "500 g, egg",
    "tier": "medium"
  },
  {
    "name": "Black Forest Cake",
    "category": "Cakes & Pastries",
    "price": 400,
    "unit": "500 g, egg",
    "tier": "medium"
  },
  {
    "name": "Chocolate Cake",
    "category": "Cakes & Pastries",
    "price": 425,
    "unit": "500 g, egg",
    "tier": "medium"
  },
  {
    "name": "Choco Caramel Cake",
    "category": "Cakes & Pastries",
    "price": 450,
    "unit": "500 g, egg",
    "tier": "medium"
  },
  {
    "name": "Classic Margherita",
    "category": "Pizzas & Pastas",
    "price": 109,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Corn Delight",
    "category": "Pizzas & Pastas",
    "price": 149,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Paneer Pizza",
    "category": "Pizzas & Pastas",
    "price": 189,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Veg Overloaded Pizza",
    "category": "Pizzas & Pastas",
    "price": 189,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Wild Mushroom Pizza",
    "category": "Pizzas & Pastas",
    "price": 199,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Veg Exotic Pizza",
    "category": "Pizzas & Pastas",
    "price": 199,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Paneer Tandoori Pizza",
    "category": "Pizzas & Pastas",
    "price": 219,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Roasted Chicken Pizza",
    "category": "Pizzas & Pastas",
    "price": 199,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Spicy Chicken Hut Pizza",
    "category": "Pizzas & Pastas",
    "price": 219,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Butter Chicken Pizza",
    "category": "Pizzas & Pastas",
    "price": 229,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Chicken Tikka Pizza",
    "category": "Pizzas & Pastas",
    "price": 239,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Supreme Chicken Pizza",
    "category": "Pizzas & Pastas",
    "price": 249,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Pepper Pesto Pizza",
    "category": "Pizzas & Pastas",
    "price": 249,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Basil Sauce Pizza",
    "category": "Pizzas & Pastas",
    "price": 269,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Basil Sauce Pizza",
    "category": "Pizzas & Pastas",
    "price": 289,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Pepper Pesto Pizza",
    "category": "Pizzas & Pastas",
    "price": 289,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Classic Aloo Tikka Burger",
    "category": "Burgers & Sandwiches",
    "price": 109,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Exotic Burger",
    "category": "Burgers & Sandwiches",
    "price": 129,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Chilly Cheese Burger",
    "category": "Burgers & Sandwiches",
    "price": 139,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Paneer Tikka Burger",
    "category": "Burgers & Sandwiches",
    "price": 149,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Tandoori Paneer Burger",
    "category": "Burgers & Sandwiches",
    "price": 169,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Omlette Overloaded Burger",
    "category": "Burgers & Sandwiches",
    "price": 149,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Grilled Burger",
    "category": "Burgers & Sandwiches",
    "price": 169,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Special Crunchy Burger",
    "category": "Burgers & Sandwiches",
    "price": 199,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "White Sauce Pasta",
    "category": "Pizzas & Pastas",
    "price": 310,
    "unit": "Veg",
    "tier": "medium"
  },
  {
    "name": "Dairy Variety Pasta",
    "category": "Pizzas & Pastas",
    "price": 325,
    "unit": "Veg",
    "tier": "large"
  },
  {
    "name": "Pink Sauce Pasta",
    "category": "Pizzas & Pastas",
    "price": 325,
    "unit": "Veg",
    "tier": "large"
  },
  {
    "name": "Pesto Basil Pasta",
    "category": "Pizzas & Pastas",
    "price": 340,
    "unit": "Veg",
    "tier": "large"
  },
  {
    "name": "Classic Veg Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 99,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Sweet Corn Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 129,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Chilli Cheese Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 149,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Boiled Egg Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 109,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Omelette Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 149,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Grilled Chicken Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 169,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Classic Veg Wrap",
    "category": "Snacks & Starters",
    "price": 129,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Spring Paneer Wrap",
    "category": "Snacks & Starters",
    "price": 149,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Paneer Butter Masala Wrap",
    "category": "Snacks & Starters",
    "price": 189,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Spicy Chicken Wrap",
    "category": "Snacks & Starters",
    "price": 169,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Butter Chicken Wrap",
    "category": "Snacks & Starters",
    "price": 189,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Crunchy Chicken Wrap",
    "category": "Snacks & Starters",
    "price": 199,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Plain Garlic Bread",
    "category": "Breads & Buns",
    "price": 99,
    "unit": "1 serving",
    "tier": "medium"
  },
  {
    "name": "Cheese Garlic Bread",
    "category": "Breads & Buns",
    "price": 129,
    "unit": "1 serving",
    "tier": "medium"
  },
  {
    "name": "Salted Fries",
    "category": "Snacks & Starters",
    "price": 140,
    "unit": "Small",
    "tier": "large"
  },
  {
    "name": "Chicken Strips",
    "category": "Snacks & Starters",
    "price": 170,
    "unit": "Small; listed as 4 pcs",
    "tier": "large"
  },
  {
    "name": "Chicken Popcorn",
    "category": "Snacks & Starters",
    "price": 199,
    "unit": "Small; listed as 6 pcs",
    "tier": "medium"
  },
  {
    "name": "Chicken Wings",
    "category": "Snacks & Starters",
    "price": 240,
    "unit": "Small; listed as 4 pcs",
    "tier": "large"
  },
  {
    "name": "Veg Nuggets",
    "category": "Snacks & Starters",
    "price": 79,
    "unit": "6 pieces",
    "tier": "small"
  },
  {
    "name": "Cheesy Balls",
    "category": "Snacks & Starters",
    "price": 89,
    "unit": "6 pieces",
    "tier": "medium"
  },
  {
    "name": "Chicken Nuggets",
    "category": "Snacks & Starters",
    "price": 149,
    "unit": "6 pieces",
    "tier": "medium"
  },
  {
    "name": "Brownie with Ice Cream",
    "category": "Cakes & Pastries",
    "price": 149,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Vanilla Milkshake",
    "category": "Beverages & Shakes",
    "price": 100,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Strawberry Milkshake",
    "category": "Beverages & Shakes",
    "price": 120,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Butterscotch Milkshake",
    "category": "Beverages & Shakes",
    "price": 129,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Mango Milkshake",
    "category": "Beverages & Shakes",
    "price": 139,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Chocolate Milkshake",
    "category": "Beverages & Shakes",
    "price": 149,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Lichi Milkshake",
    "category": "Beverages & Shakes",
    "price": 149,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Blueberry Milkshake",
    "category": "Beverages & Shakes",
    "price": 149,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Virgin Mojito",
    "category": "Beverages & Shakes",
    "price": 89,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Lime Mint Mojito",
    "category": "Beverages & Shakes",
    "price": 89,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Strawberry Mojito",
    "category": "Beverages & Shakes",
    "price": 99,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Watermelon Mojito",
    "category": "Beverages & Shakes",
    "price": 99,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Orange Mojito",
    "category": "Beverages & Shakes",
    "price": 99,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Blue Curacao Mojito",
    "category": "Beverages & Shakes",
    "price": 109,
    "unit": "1 glass",
    "tier": "large"
  },
  {
    "name": "Fruit Biscuit",
    "category": "Biscuits & Cookies",
    "price": 200,
    "unit": "Listed price; unit not stated",
    "tier": "small"
  },
  {
    "name": "Khara Biscuit",
    "category": "Biscuits & Cookies",
    "price": 140,
    "unit": "Listed price; unit not stated",
    "tier": "small"
  },
  {
    "name": "Chicken 65 Pizza",
    "category": "Pizzas & Pastas",
    "price": 200,
    "unit": "10 inches",
    "tier": "large"
  },
  {
    "name": "Chicken Pizza",
    "category": "Pizzas & Pastas",
    "price": 150,
    "unit": "10 inches",
    "tier": "medium"
  },
  {
    "name": "Chicken 65 Burger",
    "category": "Burgers & Sandwiches",
    "price": 110,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Chicken 65 Roll",
    "category": "Snacks & Starters",
    "price": 80,
    "unit": "1 roll",
    "tier": "small"
  },
  {
    "name": "Grilled Rumali Chicken",
    "category": "Snacks & Starters",
    "price": 80,
    "unit": "1 wrap",
    "tier": "large"
  },
  {
    "name": "Milk Bread",
    "category": "Breads & Buns",
    "price": 40,
    "unit": "Listed price; weight not stated",
    "tier": "small"
  },
  {
    "name": "Till Toast",
    "category": "Breads & Buns",
    "price": 45,
    "unit": "Listed price; pack size not stated",
    "tier": "small"
  },
  {
    "name": "Fruit Toast",
    "category": "Breads & Buns",
    "price": 45,
    "unit": "Listed price; pack size not stated",
    "tier": "small"
  },
  {
    "name": "Slice Cake",
    "category": "Cakes & Pastries",
    "price": 85,
    "unit": "250 g",
    "tier": "small"
  },
  {
    "name": "Chocolate Donut",
    "category": "Cakes & Pastries",
    "price": 45,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Osmania Biscuit",
    "category": "Biscuits & Cookies",
    "price": 75,
    "unit": "Unit/pack not stated",
    "tier": "small"
  },
  {
    "name": "Dry Fruit Laddu",
    "category": "Traditional Sweets",
    "price": 275,
    "unit": "Unit/pack not stated",
    "tier": "medium"
  },
  {
    "name": "Butterscotch Cake",
    "category": "Cakes & Pastries",
    "price": 300,
    "unit": "Size not stated",
    "tier": "large"
  },
  {
    "name": "Mix Sweet",
    "category": "Traditional Sweets",
    "price": 145,
    "unit": "Unit/weight not stated",
    "tier": "medium"
  },
  {
    "name": "Navratan Khara",
    "category": "Biscuits & Cookies",
    "price": 125,
    "unit": "Unit/pack not stated",
    "tier": "large"
  },
  {
    "name": "Gulab Jamun Black",
    "category": "Traditional Sweets",
    "price": 145,
    "unit": "Unit/quantity not stated",
    "tier": "medium"
  },
  {
    "name": "Gulab Jamun Brown",
    "category": "Traditional Sweets",
    "price": 145,
    "unit": "Unit/quantity not stated",
    "tier": "large"
  },
  {
    "name": "Sadi Bread",
    "category": "Breads & Buns",
    "price": 45,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Chicken Burger",
    "category": "Burgers & Sandwiches",
    "price": 70,
    "unit": "1 burger",
    "tier": "small"
  },
  {
    "name": "Dilkhush",
    "category": "Snacks & Starters",
    "price": 10,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Donut",
    "category": "Cakes & Pastries",
    "price": 20,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Khova Puri",
    "category": "Traditional Sweets",
    "price": 25,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Plum Cake",
    "category": "Cakes & Pastries",
    "price": 40,
    "unit": "Size not visible",
    "tier": "small"
  },
  {
    "name": "Fine Biscuit",
    "category": "Biscuits & Cookies",
    "price": 10,
    "unit": "Unit/pack not stated",
    "tier": "large"
  },
  {
    "name": "Bun",
    "category": "Breads & Buns",
    "price": 8,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Sheermal",
    "category": "Breads & Buns",
    "price": 15,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Til Toast",
    "category": "Breads & Buns",
    "price": 50,
    "unit": "250 g",
    "tier": "medium"
  },
  {
    "name": "Bread",
    "category": "Breads & Buns",
    "price": 40,
    "unit": "Size/weight not stated",
    "tier": "large"
  },
  {
    "name": "Fruit Bread",
    "category": "Breads & Buns",
    "price": 40,
    "unit": "Size/weight not stated",
    "tier": "large"
  },
  {
    "name": "Khari Puff",
    "category": "Puffs & Savouries",
    "price": 60,
    "unit": "250 g",
    "tier": "large"
  },
  {
    "name": "Tie Puff",
    "category": "Puffs & Savouries",
    "price": 60,
    "unit": "250 g",
    "tier": "large"
  },
  {
    "name": "Rusk Toast",
    "category": "Breads & Buns",
    "price": 70,
    "unit": "250 g",
    "tier": "large"
  },
  {
    "name": "Strawberry Pastry",
    "category": "Cakes & Pastries",
    "price": 30,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chocolate Pastry",
    "category": "Cakes & Pastries",
    "price": 40,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Butter Cream Pastry",
    "category": "Cakes & Pastries",
    "price": 15,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Pineapple Cool Cake",
    "category": "Cakes & Pastries",
    "price": 320,
    "unit": "1 kg",
    "tier": "medium"
  },
  {
    "name": "Strawberry Cool Cake",
    "category": "Cakes & Pastries",
    "price": 400,
    "unit": "1 kg",
    "tier": "large"
  },
  {
    "name": "Butterscotch Cool Cake",
    "category": "Cakes & Pastries",
    "price": 400,
    "unit": "1 kg",
    "tier": "medium"
  },
  {
    "name": "Chocolate Cool Cake",
    "category": "Cakes & Pastries",
    "price": 500,
    "unit": "1 kg",
    "tier": "large"
  },
  {
    "name": "Pineapple Cake",
    "category": "Cakes & Pastries",
    "price": 600,
    "unit": "1 kg",
    "tier": "large"
  },
  {
    "name": "Chocolate Truffle Cake",
    "category": "Cakes & Pastries",
    "price": 750,
    "unit": "1 kg",
    "tier": "large"
  },
  {
    "name": "Mousse Cake",
    "category": "Cakes & Pastries",
    "price": 600,
    "unit": "1 kg",
    "tier": "large"
  },
  {
    "name": "Dark Chocolate Doughnut",
    "category": "Cakes & Pastries",
    "price": 30,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "White Chocolate Doughnut",
    "category": "Cakes & Pastries",
    "price": 30,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chocolate Muffin",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "Menu listing; pack size not stated",
    "tier": "medium"
  },
  {
    "name": "Blueberry Filled Muffin",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "Menu listing; pack size not stated",
    "tier": "large"
  },
  {
    "name": "Palak Paneer Puff",
    "category": "Puffs & Savouries",
    "price": 24,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Veg Samosa",
    "category": "Puffs & Savouries",
    "price": 16,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Ginger Chicken Puff",
    "category": "Puffs & Savouries",
    "price": 24,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Ginger Paneer Puff",
    "category": "Puffs & Savouries",
    "price": 24,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Veg Hot Dog",
    "category": "Snacks & Starters",
    "price": 45,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Veg Roll",
    "category": "Snacks & Starters",
    "price": 35,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Veg Spring Roll",
    "category": "Snacks & Starters",
    "price": 35,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Paneer Tikka Roll",
    "category": "Snacks & Starters",
    "price": 35,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Paneer Cheese Roll",
    "category": "Snacks & Starters",
    "price": 45,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Veg Pizza Bun",
    "category": "Breads & Buns",
    "price": 35,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Aloo Capsicum Savoury",
    "category": "Snacks & Starters",
    "price": 40,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Veg Manchuria",
    "category": "Snacks & Starters",
    "price": 26,
    "unit": "Listed serving not stated",
    "tier": "large"
  },
  {
    "name": "Chicken Hot Dog",
    "category": "Snacks & Starters",
    "price": 50,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chicken Roll",
    "category": "Snacks & Starters",
    "price": 40,
    "unit": "1 piece",
    "tier": "small"
  },
  {
    "name": "Chicken Tikka Roll",
    "category": "Snacks & Starters",
    "price": 40,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chicken Spring Roll",
    "category": "Snacks & Starters",
    "price": 40,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chicken Cheese Roll",
    "category": "Snacks & Starters",
    "price": 45,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Butter Chicken Roll",
    "category": "Snacks & Starters",
    "price": 40,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chicken Pizza Bun",
    "category": "Breads & Buns",
    "price": 45,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chicken 65",
    "category": "Snacks & Starters",
    "price": 40,
    "unit": "Listed serving not stated",
    "tier": "large"
  },
  {
    "name": "Chicken Cutlet",
    "category": "Snacks & Starters",
    "price": 30,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Mini Veg Burger",
    "category": "Burgers & Sandwiches",
    "price": 45,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Mini Chicken Burger",
    "category": "Burgers & Sandwiches",
    "price": 50,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Veg Burger",
    "category": "Burgers & Sandwiches",
    "price": 60,
    "unit": "1 burger",
    "tier": "small"
  },
  {
    "name": "Veg Corn Burger",
    "category": "Burgers & Sandwiches",
    "price": 65,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Paneer Tikka Burger",
    "category": "Burgers & Sandwiches",
    "price": 75,
    "unit": "1 burger",
    "tier": "large"
  },
  {
    "name": "Chicken Burger",
    "category": "Burgers & Sandwiches",
    "price": 65,
    "unit": "1 burger",
    "tier": "small"
  },
  {
    "name": "Mini Veg Pizza",
    "category": "Pizzas & Pastas",
    "price": 65,
    "unit": "Mini; 4.5 inch / 2–4 pieces note on board",
    "tier": "large"
  },
  {
    "name": "Mini Chicken Pizza",
    "category": "Pizzas & Pastas",
    "price": 70,
    "unit": "Mini; 4.5 inch / 2–4 pieces note on board",
    "tier": "large"
  },
  {
    "name": "Extra Cheese",
    "category": "Pizzas & Pastas",
    "price": 10,
    "unit": "Per pizza; mini/standard board section",
    "tier": "large"
  },
  {
    "name": "Paneer Tikka Pizza",
    "category": "Pizzas & Pastas",
    "price": 120,
    "unit": "Medium",
    "tier": "medium"
  },
  {
    "name": "Veg Mix Cheese Pizza",
    "category": "Pizzas & Pastas",
    "price": 100,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Onion Cheese Pizza",
    "category": "Pizzas & Pastas",
    "price": 100,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Plain Cheese Pizza",
    "category": "Pizzas & Pastas",
    "price": 100,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Hot Mexican Pizza",
    "category": "Pizzas & Pastas",
    "price": 100,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Paneer Cheese Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Paneer Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Samosa Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Corn Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Cutlet Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Mushroom Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Hot & Spicy Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Chicken Mix Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Chicken Hot Mexican Pizza",
    "category": "Pizzas & Pastas",
    "price": 110,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Chicken Tikka Pizza",
    "category": "Pizzas & Pastas",
    "price": 130,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Chicken Hot & Spicy Pizza",
    "category": "Pizzas & Pastas",
    "price": 120,
    "unit": "Medium",
    "tier": "large"
  },
  {
    "name": "Veg Family Pizza",
    "category": "Pizzas & Pastas",
    "price": 150,
    "unit": "Family size",
    "tier": "large"
  },
  {
    "name": "Family Paneer Tikka Pizza",
    "category": "Pizzas & Pastas",
    "price": 180,
    "unit": "Family size",
    "tier": "large"
  },
  {
    "name": "Chicken Family Pizza",
    "category": "Pizzas & Pastas",
    "price": 180,
    "unit": "Family size",
    "tier": "large"
  },
  {
    "name": "Family Chicken Tikka Pizza",
    "category": "Pizzas & Pastas",
    "price": 200,
    "unit": "Family size",
    "tier": "large"
  },
  {
    "name": "Chocolate Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 45,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Grilled Veg Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 40,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Grilled Veg Corn Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 45,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Grilled Corn Tikka Sandwich",
    "category": "Burgers & Sandwiches",
    "price": 50,
    "unit": "1 sandwich",
    "tier": "large"
  },
  {
    "name": "Plum Cake",
    "category": "Cakes & Pastries",
    "price": 15,
    "unit": "50 g",
    "tier": "small"
  },
  {
    "name": "Plum / Butter Cream Cake",
    "category": "Cakes & Pastries",
    "price": 340,
    "unit": "Per kg; menu wording combined",
    "tier": "large"
  },
  {
    "name": "Cup Cake",
    "category": "Cakes & Pastries",
    "price": 28,
    "unit": "1 piece",
    "tier": "medium"
  },
  {
    "name": "Vanilla Muffins",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Chocolate Muffins",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Strawberry Muffins",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Blueberry Muffins",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Red Velvet Muffins",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Eggless Muffins",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Almond Muffins",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Chocolate Brownie",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 piece",
    "tier": "medium"
  },
  {
    "name": "Doughnut (any flavour)",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Pie (any flavour)",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Vanilla Tart",
    "category": "Cakes & Pastries",
    "price": 40,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Chocolate Tart",
    "category": "Cakes & Pastries",
    "price": 40,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Kaju Biscuit",
    "category": "Biscuits & Cookies",
    "price": 280,
    "unit": "Per kg",
    "tier": "small"
  },
  {
    "name": "Badam Biscuit",
    "category": "Biscuits & Cookies",
    "price": 280,
    "unit": "Per kg",
    "tier": "small"
  },
  {
    "name": "Coconut Biscuit",
    "category": "Biscuits & Cookies",
    "price": 280,
    "unit": "Per kg",
    "tier": "large"
  },
  {
    "name": "Cake Rusk",
    "category": "Biscuits & Cookies",
    "price": 280,
    "unit": "Per kg",
    "tier": "large"
  },
  {
    "name": "Chand Biscuit",
    "category": "Biscuits & Cookies",
    "price": 240,
    "unit": "Per kg",
    "tier": "small"
  },
  {
    "name": "Salt Biscuit",
    "category": "Biscuits & Cookies",
    "price": 240,
    "unit": "Per kg",
    "tier": "small"
  },
  {
    "name": "Tea Biscuit",
    "category": "Biscuits & Cookies",
    "price": 240,
    "unit": "Per kg",
    "tier": "medium"
  },
  {
    "name": "Khari",
    "category": "Biscuits & Cookies",
    "price": 240,
    "unit": "Per kg",
    "tier": "medium"
  },
  {
    "name": "Brown Bread",
    "category": "Breads & Buns",
    "price": 26,
    "unit": "300 g",
    "tier": "large"
  },
  {
    "name": "Multigrain Bread",
    "category": "Breads & Buns",
    "price": 26,
    "unit": "300 g",
    "tier": "large"
  },
  {
    "name": "Sandwich Bread",
    "category": "Breads & Buns",
    "price": 26,
    "unit": "Size not stated",
    "tier": "large"
  },
  {
    "name": "Double Ka Meetha Bread",
    "category": "Breads & Buns",
    "price": 40,
    "unit": "Size not stated",
    "tier": "large"
  },
  {
    "name": "Cream Bread",
    "category": "Breads & Buns",
    "price": 16,
    "unit": "Size not stated",
    "tier": "large"
  },
  {
    "name": "Pav Bhaji Bread",
    "category": "Breads & Buns",
    "price": 20,
    "unit": "Size not stated",
    "tier": "large"
  },
  {
    "name": "Dilkhush",
    "category": "Breads & Buns",
    "price": 16,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Dilpasand",
    "category": "Breads & Buns",
    "price": 16,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Sirmal",
    "category": "Breads & Buns",
    "price": 20,
    "unit": "1 piece",
    "tier": "large"
  },
  {
    "name": "Burger Buns",
    "category": "Breads & Buns",
    "price": 60,
    "unit": "4 pieces",
    "tier": "large"
  },
  {
    "name": "Pizza Base",
    "category": "Breads & Buns",
    "price": 80,
    "unit": "Pack/size not stated",
    "tier": "large"
  },
  {
    "name": "Jeera Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "small"
  },
  {
    "name": "Fruit Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "large"
  },
  {
    "name": "Butter Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "small"
  },
  {
    "name": "Honey Corn Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "medium"
  },
  {
    "name": "Bournvita Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "large"
  },
  {
    "name": "Choco Chips Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "medium"
  },
  {
    "name": "Oats Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "large"
  },
  {
    "name": "Butterscotch Cookies",
    "category": "Biscuits & Cookies",
    "price": 160,
    "unit": "500 g",
    "tier": "large"
  },
  {
    "name": "Kaju Cookies",
    "category": "Biscuits & Cookies",
    "price": 80,
    "unit": "250 g",
    "tier": "large"
  },
  {
    "name": "Almond Sticks",
    "category": "Biscuits & Cookies",
    "price": 80,
    "unit": "250 g",
    "tier": "large"
  },
  {
    "name": "Pineapple Juice",
    "category": "Beverages & Shakes",
    "price": 30,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Watermelon Juice",
    "category": "Beverages & Shakes",
    "price": 30,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Mosambi Juice",
    "category": "Beverages & Shakes",
    "price": 35,
    "unit": "1 serving",
    "tier": "large"
  },
  {
    "name": "Choco Truffle",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Chips",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Dipping",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Almond",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Orange",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Strawberry",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Crunch",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Walnut",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Excess",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Choco Truffle with Bikes",
    "category": "Cakes & Pastries",
    "price": 750,
    "unit": "Per kg, standard",
    "tier": "large"
  },
  {
    "name": "Choco Truffle with Couple",
    "category": "Cakes & Pastries",
    "price": 750,
    "unit": "Per kg, standard",
    "tier": "large"
  },
  {
    "name": "Choco Truffle with Big Bottle",
    "category": "Cakes & Pastries",
    "price": 850,
    "unit": "Per kg, standard",
    "tier": "large"
  },
  {
    "name": "Choco Caramel",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Total Choco-Chips",
    "category": "Cakes & Pastries",
    "price": 700,
    "unit": "Per kg, standard",
    "tier": "large"
  },
  {
    "name": "Twin Choco-Chips",
    "category": "Cakes & Pastries",
    "price": 700,
    "unit": "Per kg, standard",
    "tier": "large"
  },
  {
    "name": "Coffee Choco-Chips",
    "category": "Cakes & Pastries",
    "price": 65,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Moka Chocolate",
    "category": "Cakes & Pastries",
    "price": 65,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Dark Chocolate",
    "category": "Cakes & Pastries",
    "price": 65,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Butter Almond",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "German Black Forest",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Italian Chocolate",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Milk Chocolate Truffle",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Hazelnut Chocolate",
    "category": "Cakes & Pastries",
    "price": 80,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Deli Orange Gateaux",
    "category": "Cakes & Pastries",
    "price": 65,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Orange Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Kiwi Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Fresh Fruit Gateaux",
    "category": "Cakes & Pastries",
    "price": 60,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Lychee Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Strawberry Delight",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Banana Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Pink Guava Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Apricot Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Blueberry Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Raspberry Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Green Apple Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Passion Fruit Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Red Cherry Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Fruit of Forest Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  },
  {
    "name": "Classic Mango Gateaux",
    "category": "Cakes & Pastries",
    "price": 50,
    "unit": "1 pastry",
    "tier": "large"
  }
];

export function getTelanganaMenuItems(scale: BakeryScale): TelanganaMenuItem[] {
  if (scale === 'small') {
    return TELANGANA_BAKERY_MENU.filter((item) => item.tier === 'small');
  }
  if (scale === 'medium') {
    return TELANGANA_BAKERY_MENU.filter((item) => item.tier === 'small' || item.tier === 'medium');
  }
  return TELANGANA_BAKERY_MENU;
}

export const TELANGANA_CATEGORIES: { name: string; sort_order: number }[] = [
  { name: 'Puffs & Savouries', sort_order: 1 },
  { name: 'Breads & Buns', sort_order: 2 },
  { name: 'Biscuits & Cookies', sort_order: 3 },
  { name: 'Cakes & Pastries', sort_order: 4 },
  { name: 'Burgers & Sandwiches', sort_order: 5 },
  { name: 'Snacks & Starters', sort_order: 6 },
  { name: 'Pizzas & Pastas', sort_order: 7 },
  { name: 'Beverages & Shakes', sort_order: 8 },
  { name: 'Traditional Sweets', sort_order: 9 },
];
