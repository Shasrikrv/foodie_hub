import pool from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

const mealName = async (mealTitle) => {
  const invalidFields = [];
  if (!mealTitle.mealName) invalidFields.push("mealName");
  if (invalidFields.length) {
    return `Invalid fields -${invalidFields.join(",")}`;
  }

  const contentId = uuidv4();
  await pool.query(
    "INSERT INTO content (content_id, mealname) VALUES ($1, $2)",
    [contentId, mealTitle.mealName]
  );
  return { content_id: contentId };
};

const createPost = async (postData) => {
  const invalidFields = [];
  if (!postData.title) invalidFields.push("title");
  if (!postData.userId) invalidFields.push("userId");
  if (!postData.contentId) invalidFields.push("contentId");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const postId = uuidv4();
  const visibility = ["friends", "everyone"].includes(postData.visibility) ? postData.visibility : "everyone";
  const result = await pool.query(
    "INSERT INTO posts (post_id, title, user_id, content_id, createdate, image_url, visibility) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)",
    [postId, postData.title, postData.userId, postData.contentId, postData.imageUrl ?? null, visibility]
  );
  return result;
};

const commentOnPost = async (commentData) => {
  const invalidFields = [];
  if (!commentData.userId) invalidFields.push("userId");
  if (!commentData.postId) invalidFields.push("postId");
  if (!commentData.commentText) invalidFields.push("commentText");
  if (invalidFields.length) {
    return `Invalid fields -${invalidFields.join(",")}`;
  }

  const commentID = uuidv4();
  const result = await pool.query(
    "INSERT INTO comments (comment_id, user_id, post_id, comment_text) VALUES ($1, $2, $3, $4)",
    [commentID, commentData.userId, commentData.postId, commentData.commentText]
  );
  return result;
};

const likeThePost = async (likeData) => {
  const invalidFields = [];
  if (!likeData.userId) invalidFields.push("userId");
  if (!likeData.postId) invalidFields.push("postId");
  if (invalidFields.length) {
    return `Invalid fields -${invalidFields.join(",")}`;
  }

  const likeID = uuidv4();
  const result = await pool.query(
    "INSERT INTO likes (like_id, user_id, post_id) VALUES ($1, $2, $3)",
    [likeID, likeData.userId, likeData.postId]
  );
  return result;
};

const nutritionDeteils = async (nutrirtionData) => {
  const invalidFields = [];
  if (!nutrirtionData.contentId) invalidFields.push("contentId");
  if (!nutrirtionData.calories) invalidFields.push("calories");
  if (!nutrirtionData.protein) invalidFields.push("protein");
  if (!nutrirtionData.carbs) invalidFields.push("carbs");
  if (!nutrirtionData.fats) invalidFields.push("fats");
  if (!nutrirtionData.fiber) invalidFields.push("fiber");
  if (invalidFields.length) {
    return `Invalid fields -${invalidFields.join(",")}`;
  }

  const nutritionID = uuidv4();
  const result = await pool.query(
    "INSERT INTO nutrition (nutrition_id, content_id, calories, protein, carbohydrates, fats, fiber) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [nutritionID, nutrirtionData.contentId, nutrirtionData.calories, nutrirtionData.protein, nutrirtionData.carbs, nutrirtionData.fats, nutrirtionData.fiber]
  );
  return result;
};

const mealType = async (mealTypeData) => {
  const invalidFields = [];
  if (!mealTypeData.mealCategory) invalidFields.push("mealCategory");
  if (!mealTypeData.contentId) invalidFields.push("contentId");
  if (invalidFields.length) {
    return { error: `Invalid fields - ${invalidFields.join(", ")}` };
  }

  const allowedMealTypes = ["Smoothie", "breakfast", "lunch", "dinner"];
  if (!allowedMealTypes.includes(mealTypeData.mealCategory)) {
    return { error: `Invalid meal type - ${mealTypeData.mealCategory}` };
  }

  const mealTypeID = uuidv4();
  await pool.query(
    "INSERT INTO mealtype (mealtype_id, content_id, mealcategory) VALUES ($1, $2, $3)",
    [mealTypeID, mealTypeData.contentId, mealTypeData.mealCategory]
  );
  return { mealTypeId: mealTypeID, mealCategory: mealTypeData.mealCategory };
};

const mealContentJunction = async (mealContentData) => {
  const invalidFields = [];
  if (!mealContentData.contentId) invalidFields.push("contentId");
  if (!mealContentData.mealTypeId) invalidFields.push("mealTypeId");
  if (invalidFields.length) {
    return `Invalid fields -${invalidFields.join(",")}`;
  }

  await pool.query(
    "INSERT INTO mealcontentjunction (content_id, mealtype_id) VALUES ($1, $2)",
    [mealContentData.contentId, mealContentData.mealTypeId]
  );
  return { message: "Meal content junction created successfully" };
};

const ingredientsList = async (ingredientsData) => {
  const invalidFields = [];
  if (!ingredientsData.contentId) invalidFields.push("contentId");
  if (!ingredientsData.ingredientName) invalidFields.push("ingredientName");
  if (!ingredientsData.quantity) invalidFields.push("quantity");
  if (!ingredientsData.unit) invalidFields.push("unit");

  const allowedUnits = [
    "g", "kg", "oz", "lb",
    "ml", "l", "cup", "tbsp", "tsp", "teaspoons",
    "pcs", "piece", "slice", "scoop", "cubes",
    "pinch", "handful", "bunch", "can", "bottle",
  ];
  if (ingredientsData.unit && !allowedUnits.includes(ingredientsData.unit)) {
    invalidFields.push("unit (invalid)");
  }

  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const ingredientsID = uuidv4();
  const result = await pool.query(
    "INSERT INTO ingredients (ingredients_id, content_id, name, quantity, units) VALUES ($1, $2, $3, $4, $5)",
    [ingredientsID, ingredientsData.contentId, ingredientsData.ingredientName, ingredientsData.quantity, ingredientsData.unit]
  );
  return result;
};

const instructions = async (instructionsSteps) => {
  const invalidFields = [];
  if (!instructionsSteps.contentId) invalidFields.push("contentId");
  if (!instructionsSteps.step) invalidFields.push("step");
  if (!instructionsSteps.description) invalidFields.push("description");

  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const instructionsId = uuidv4();
  const result = await pool.query(
    "INSERT INTO instructions (instructions_id, content_id, steps, description) VALUES ($1, $2, $3, $4)",
    [instructionsId, instructionsSteps.contentId, instructionsSteps.step, instructionsSteps.description]
  );
  return result;
};

export {
  createPost,
  commentOnPost,
  likeThePost,
  mealName,
  nutritionDeteils,
  mealType,
  mealContentJunction,
  ingredientsList,
  instructions,
};
