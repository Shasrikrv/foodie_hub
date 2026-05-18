import pool from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

async function requesteStatus(userStaus) {
  const invalidFields = [];
  if (!userStaus.requestedUser) invalidFields.push("requestedUser");
  if (!userStaus.connectedUser) invalidFields.push("connectedUser");
  if (!userStaus.connectedUserfirst_name)
    invalidFields.push("connectedUserfirst_name");
  if (!userStaus.status) invalidFields.push("status");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const requestId = uuidv4();
  const command = `INSERT INTO friend_request(request_id,sender_id, receiver_id,first_name, status) VALUES (?,?, ?, ?,?)`;
  const values = [
    requestId,
    userStaus.requestedUser,
    userStaus.connectedUser,
    userStaus.connectedUserfirst_name,
    userStaus.status,
  ];
  const [result] = await pool.query(command, values);
  return { result };
}

async function authorizeStatus(statusDetail, currentUserId) {
  const invalidFields = [];
  if (!statusDetail.status) invalidFields.push("status");
  if (!statusDetail.requestId) invalidFields.push("requestId");

  if (invalidFields.length) {
    return { error: `Invalid fields - ${invalidFields.join(", ")}` };
  }

  const allowedStatus = [2, 3]; // 2 = accept, 3 = decline
  if (!allowedStatus.includes(statusDetail.status)) {
    return {
      error: "Invalid status value. Only 2 (accept) or 3 (decline) allowed.",
    };
  }

  // Make sure current user is receiver of the request
  const [rows] = await pool.query(
    "SELECT * FROM friend_request WHERE request_id = ? AND receiver_id = ?",
    [statusDetail.requestId, currentUserId]
  );

  if (!rows.length) {
    return { error: "You are not authorized to update this request" };
  }

  await pool.query("UPDATE friend_request SET status=? WHERE request_id=?", [
    statusDetail.status,
    statusDetail.requestId,
  ]);

  return {
    message:
      statusDetail.status === 2 ? "Request accepted" : "Request declined",
  };
}
// async function authorizeStatus(statusDetail) {
//   const invalidFields = [];
//   if (!statusDetail.status) invalidFields.push("status");
//   if (!statusDetail.requestId) invalidFields.push("requestId");
//   if (invalidFields.length) {
//     return `Invalid fields - ${invalidFields.join(", ")}`;
//   }
//   const allowedStatus = [2, 3];
//   if (!allowedStatus.includes(statusDetail.status)) {
//     return "Invalid status value. Only 2 (accept) or 3 (decline) allowed.";
//   }
//   const command = `UPDATE friend_request SET status=? WHERE request_id=?`;
//   const values = [statusDetail.status, statusDetail.requestId];
//   await pool.query(command, values);
//   if (statusDetail.status === 2) {
//     return "Request accepted";
//   }
//   if (statusDetail.status === 3) {
//     return "Request declined";
//   }
// }

async function getFriends(userId) {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.first_name, u.last_name, fr.status
     FROM friend_request fr
     JOIN users u ON u.user_id IN (fr.sender_id, fr.receiver_id)
     WHERE fr.status = 2
       AND ? IN (fr.sender_id, fr.receiver_id)
       AND u.user_id != ?`,
    [userId, userId]
  );
  return rows;
}

async function getFriendRequests(userId) {
  // const userId = userData.userId;
  // console.log("userId::", userId);

  const command = `
    SELECT u.user_id, u.first_name, u.last_name, fr.status
    FROM friend_request fr
    JOIN users u ON u.user_id = fr.sender_id
    WHERE fr.receiver_id = ? AND fr.status = 1
  `;

  const [pendingRequests] = await pool.query(command, [userId, userId]);

  console.log("pendingRequests", pendingRequests);

  return pendingRequests;
}

export { requesteStatus, authorizeStatus, getFriends, getFriendRequests };
