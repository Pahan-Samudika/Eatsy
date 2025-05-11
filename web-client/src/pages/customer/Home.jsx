import React, { useState, useEffect } from "react";
import { FaFilterCircleXmark } from "react-icons/fa6";
import { IoSearchSharp } from "react-icons/io5";
import { styles } from "../../styles/styles";
import {
  RestaurantCard,
  SeeMoreButton,
  ShoppingCartButton,
  LocationSelectButton,
  FoodItemCard,
} from "../../components";
import { getAllRestaurants, getAllRestaurantsWithCategories } from "../../utils/fetch-utils/customer/fetch-user";
import { getAllCategories } from "../../utils/fetch-utils/customer/fetch-restaurant";
import { getAllMenuItems } from "../../utils/fetch-utils/restaurant/fetch-restaurant";

function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [foodCategories, setFoodCategories] = useState([]);
  const [featuredRestaurants, setFeaturedRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isRestaurantsLoading, setIsRestaurantsLoading] = useState(true);
  const [isMenuLoading, setIsMenuLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setIsRestaurantsLoading(true);
      setIsMenuLoading(true);

      try {
        const [restaurants, categories, items] = await Promise.all([
          getAllRestaurantsWithCategories(),
          getAllCategories(),
          getAllMenuItems(),
        ]);

        setFeaturedRestaurants(restaurants);
        setFoodCategories(categories);
        setMenuItems(items);
      } catch (error) {
        console.error("Failed to fetch data:", error.message);
      } finally {
        setIsRestaurantsLoading(false);
        setIsMenuLoading(false);
      }
    };

    init();
  }, []);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
  };

  const filteredRestaurants = featuredRestaurants.filter((restaurant) => {
    const matchesSearch =
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.menuItems?.some((item) =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory = selectedCategory
      ? restaurant.categories.includes(selectedCategory)
      : true;

    return matchesSearch && matchesCategory;
  });

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory
      ? item.category?.name === selectedCategory
      : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`${styles.paddingX} relative flex flex-col gap-2`}>
      {/* Top Bar */}
      <div className="flex flex-col p-4 gap-2 justify-center items-center sticky top-0 z-10 bg-base-100/80">
        <div className="flex flex-row gap-2">
          <LocationSelectButton />
          <div className="search flex flex-row items-center border border-accent rounded-full md:w-lg pl-4">
            <IoSearchSharp />
            <input
              type="text"
              placeholder="Search for restaurants, foods, or drinks"
              className="search input border-0 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ShoppingCartButton />
        </div>

        {/* Category Filters */}
        <div
          className={`${styles.paddingX} flex flex-row lg:justify-center w-full rounded-box gap-4 py-4 overflow-x-auto`}
        >
          {foodCategories.map((category) => (
            <div key={category._id} className="flex flex-col items-center">
              <button
                className={`btn btn-ghost btn-circle btn-xl border ${
                  selectedCategory === category.name
                    ? "border-accent bg-base-300"
                    : "border-accent/30"
                }`}
                onClick={() => handleCategoryClick(category.name)}
              >
                {category.icon}
              </button>
              <span className="text-sm badge badge-soft mt-2">
                {category.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Restaurants */}
      <div className="card w-full rounded-none">
        <div className="card-body">
          <div className="card-header flex flex-row justify-between items-center">
            <div className="flex flex-row items-center justify-center gap-2">
              <div className="card-title truncate">Featured Restaurants</div>
              <span className="text-xs badge badge-soft badge-primary">
                {filteredRestaurants.length}
              </span>
              {(searchQuery || selectedCategory) && (
                <button
                  className="btn btn-outline rounded-full bg-base-100 btn-xs"
                  onClick={clearFilters}
                >
                  <FaFilterCircleXmark />
                  <span className="hidden lg:inline-flex text-sm">
                    Clear Filters
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="card-content flex flex-row gap-2 mt-2 overflow-x-auto">
            {!isRestaurantsLoading ? (
              filteredRestaurants.length > 0 ? (
                filteredRestaurants.map((restaurant) => (
                  <RestaurantCard
                    restaurant={restaurant}
                    key={restaurant._id}
                  />
                ))
              ) : (
                <div className="text-center w-full py-4 h-72 flex items-center justify-center bg-base-300/30 rounded-2xl mb-3">
                  <div className="badge badge-soft badge-warning badge-lg">No restaurants found for the selected filters</div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center w-full">
                <span className="loading loading-spinner loading-xl text-primary"></span>
                <p>Loading Restaurants...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Menu Items */}
      <div className="card w-full rounded-none">
        <div className="card-body">
          <div className="card-header flex flex-row justify-between items-center">
            <div className="flex flex-row items-center justify-center gap-2">
              <div className="card-title truncate">Featured Menus</div>
              <span className="text-xs badge badge-soft badge-primary">
                {filteredMenuItems.length}
              </span>
              {(searchQuery || selectedCategory) && (
                <button
                  className="btn btn-outline rounded-full bg-base-100 btn-xs"
                  onClick={clearFilters}
                >
                  <FaFilterCircleXmark />
                  <span className="hidden lg:inline-flex text-sm">
                    Clear Filters
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="card-content flex flex-row gap-2 mt-2 overflow-x-auto">
            {!isMenuLoading ? (
              filteredMenuItems.length > 0 ? (
                filteredMenuItems.map((item) => (
                  <FoodItemCard key={item._id} item={item} />
                ))
              ) : (
                <div className="text-center w-full py-4 h-72 flex items-center justify-center bg-base-300/30 rounded-2xl mb-3">
                  <div className="badge badge-soft badge-warning badge-lg">No menu items found for the selected filters</div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center w-full">
                <span className="loading loading-spinner loading-xl text-primary"></span>
                <p>Loading Menu Items...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

