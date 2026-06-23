import pool from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

async function requesteStatus(userStaus) {
  const invalidFields = [];
  if (!userStaus.requestedUser) invalidFields.push("requestedUser");
  if (!userStaus.connectedUser) invalidFields.push("connectedUser");
  if (!userStaus.connectedUserfirst_name) invalidFields.push("connectedUserfirst_name");
  if (!userStaus.status) invalidFields.push("status");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const requestId = uuidv4();
  const result = await pool.query(
    "INSERT INTO friend_request (request_id, sender_id, receiver_id, status) VALUES ($1, $2, $3, $4)",
    [requestId, userStaus.requestedUser, userStaus.connectedUser, userStaus.status]
  );
  return { result };
}

async function authorizeStatus(statusDetail, currentUserId) {
  const invalidFields = [];
  if (!statusDetail.status) invalidFields.push("status");
  if (!statusDetail.requestId) invalidFields.push("requestId");

  if (invalidFields.length) {
    return { error: `Invalid fields - ${invalidFields.join(", ")}` };
  }

  const allowedStatus = [2, 3];
  if (!allowedStatus.includes(statusDetail.status)) {
    return { error: "Invalid status value. Only 2 (accept) or 3 (decline) allowed." };
  }

  const { rows } = await pool.query(
    "SELECT * FROM friend_request WHERE request_id = $1 AND receiver_id = $2",
    [statusDetail.requestId, currentUserId]
  );

  if (!rows.length) {
    return { error: "You are not authorized to update this request" };
  }

  await pool.query("UPDATE friend_request SET status = $1 WHERE request_id = $2", [
    statusDetail.status,
    statusDetail.requestId,
  ]);

  return { message: statusDetail.status === 2 ? "Request accepted" : "Request declined" };
}

async function getFriends(userId) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.first_name, u.last_name, fr.status
     FROM friend_request fr
     JOIN users u ON u.user_id IN (fr.sender_id, fr.receiver_id)
     WHERE fr.status = 2
       AND $1 IN (fr.sender_id, fr.receiver_id)
       AND u.user_id != $2`,
    [userId, userId]
  );
  return rows;
}

async function getFriendRequests(userId) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.first_name, u.last_name, fr.status
     FROM friend_request fr
     JOIN users u ON u.user_id = fr.sender_id
     WHERE fr.receiver_id = $1 AND fr.status = 1`,
    [userId]
  );
  return rows;
}

export { requesteStatus, authorizeStatus, getFriends, getFriendRequests };
