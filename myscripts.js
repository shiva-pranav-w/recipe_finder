const searchBox = document.querySelector(".search-box");
const recipeList = document.getElementById("recipe-list");
let recipes = [];

async function loadLocalRecipes(){
  const res = await fetch("recipes.json");
  recipes = await res.json();
  displayRecipes(recipes);
}

const spinner = document.getElementById("loading-spinner");

function showSpinner() {
  spinner.classList.remove("hidden");
}

function hideSpinner() {
  spinner.classList.add("hidden");
}

function displayRecipes(recipesToShow){
  recipeList.innerHTML="";
  hideSpinner();
  if(recipesToShow.length === 0){
    recipeList.innerHTML="<p class='no-results'>No local recipes found. Press Enter to search online.</p>";
    return;
  }
  recipesToShow.forEach(recipe => {
    const card = document.createElement("div");
    card.classList.add("recipe-card");
    card.innerHTML = `
            <img src = "${recipe.image}" alt="${recipe.name}">
      <h3>${recipe.name}</h3>
      <ul>
        ${recipe.ingredients.map(i => `<li>${i}</li>`).join("")}
      </ul>
    `; // .join turns array of strings into one big string, innerHTML expects single string, without .join(""), we would get <ul>[object Object]</ul>
    recipeList.appendChild(card);
  });
}

// search filter local json
searchBox.addEventListener("input", async e => {
    const term = e.target.value.toLowerCase().trim();
    if(term===""){
        displayRecipes(filtered);
        return;
    }
    const filtered = recipes.filter(r =>
        r.name.toLowerCase().includes(term) || r.ingredients.some(i => i.toLowerCase().includes(term))
    );
    if(filtered.length > 0){
        displayRecipes(filtered);
    } else {
        showSpinner();
        await searchFromAPI(term);
    }
    
});

// fetch from TheMealDB API when pressing enter
searchBox.addEventListener("keypress", e => {
    if(e.key === "Enter"){
    searchFromAPI(e.target.value);
  }
});

async function searchFromAPI(query) {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
    const data = await res.json();
    hideSpinner();

    if (data.meals) {
      const apiRecipes = data.meals.map(meal => {
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
          const ingredient = meal[`strIngredient${i}`];
          const measure = meal[`strMeasure${i}`];
          if (ingredient && ingredient.trim() !== "") {
            ingredients.push(`${ingredient} - ${measure || ""}`);
          }
        }
        return {
          name: meal.strMeal,
          image: meal.strMealThumb,
          ingredients
        };
      });
      displayRecipes(apiRecipes);
    } else {
      recipeList.innerHTML = "<p class='no-results'>No recipes found online.</p>";
    }
  } catch (err) {
    hideSpinner();
    recipeList.innerHTML = "<p class='no-results'>Error fetching recipes.</p>";
  }
}


async function searchByArea(area) {
    showSpinner();
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`);
    const data = await res.json();
    hideSpinner();
    if(data.meals){
        const detailedMeals = await Promise.all(
            data.meals.map(m =>
                fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`)
                .then(r => r.json())
                .then(d => d.meals[0])
            )
        );
        const apiRecipes = detailedMeals.map(meal => {
            const ingredients = [];
            for (let i = 1; i <= 20; i++) {
                const ingredient = meal[`strIngredient${i}`];
                const measure = meal[`strMeasure${i}`];
                if(ingredient && ingredient.trim() !== ""){
                    ingredients.push(`${ingredient} - ${measure || ""}`);
                }
            }
            return {
                name: meal.strMeal,
                image: meal.strMealThumb,
                ingredients
            };
        });
        displayRecipes(apiRecipes);
    } else {
        recipeList.innerHTML = "<p>No recipes found for this area.</p>";
    }
}

const areaSelect = document.getElementById("area-select");
if (areaSelect) {
  areaSelect.addEventListener("change", e => {
    if (e.target.value) {
      searchByArea(e.target.value);
      searchBox.value="";
    }
  });
}
loadLocalRecipes();