import pool from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

const createPost = async (postData) => {
  const invalidFields = [];
  if (!postData.title) invalidFields.push("title");
  if (!postData.userId) invalidFields.push("userId");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const postId = uuidv4();
  const command = `INSERT INTO posts (post_id, title, user_id ) values (?,?,?) `;
  const VALUES = [postId, postData.title, postData.userId];
  const [result] = await pool.query(command, VALUES);
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
  const command = `INSERT INTO comments (comment_id, user_id, post_id, comment_text) values (?,?,?,?)`;
  const values = [
    commentID,
    commentData.userId,
    commentData.postId,
    commentData.commentText,
  ];
  const [result] = await pool.query(command, values);
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
  const command = `INSERT INTO likes (like_id, user_id, post_id) values (?,?,?)`;
  const values = [likeID, likeData.userId, likeData.postId];
  const [result] = await pool.query(command, values);
  return result;
};

export { createPost, commentOnPost, likeThePost };
