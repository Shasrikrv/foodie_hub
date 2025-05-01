import pool from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

async function requesteStatus(userStaus) {
  const invalidFields = [];
  if (!userStaus.requestedUser) invalidFields.push("requestedUser");
  if (!userStaus.connectedUser) invalidFields.push("connectedUser");
  if (!userStaus.status) invalidFields.push("status");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const requestId = uuidv4();
  const command = `INSERT INTO friend_request(request_id,sender_id, receiver_id, status) VALUES (?,?, ?, ?)`;
  const values = [
    requestId,
    userStaus.requestedUser,
    userStaus.connectedUser,
    userStaus.status,
  ];
  const [result] = await pool.query(command, values);
  return result;
}

async function authorizeStaus(statusDetail) {
  const invalidFields = [];
  if (!statusDetail.status) invalidFields.push("status");
  if (!statusDetail.requestId) invalidFields.push("requestId");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }
  const allowedStatus = [2, 3];
  if (!allowedStatus.includes(statusDetail.status)) {
    return "Invalid status value. Only 2 (accept) or 3 (decline) allowed.";
  }
  const command = `UPDATE friend_request SET status=? WHERE request_id=?`;
  const values = [statusDetail.status, statusDetail.requestId];
  await pool.query(command, values);
  if (statusDetail.status === 2) {
    return "Request accepted";
  }
  if (statusDetail.status === 3) {
    return "Request declined";
  }
}

async function getFriends(userData) {
  const userId = userData.userId;

  const command1 = `
    SELECT u.user_id, u.first_name, u.last_name, fr.status
    FROM friend_request fr
    JOIN users u 
      ON (u.user_id = fr.sender_id AND fr.receiver_id = ?)
      OR (u.user_id = fr.receiver_id AND fr.sender_id = ?)
    WHERE fr.status = 2
  `;

  const command2 = `
    SELECT u.user_id, u.first_name, u.last_name, fr.status
    FROM friend_request fr
    JOIN users u ON u.user_id = fr.sender_id
    WHERE fr.receiver_id = ? AND fr.status = 1
  `;

  const [acceptedFriends] = await pool.query(command1, [userId, userId]);
  const [pendingRequests] = await pool.query(command2, [userId]);

  return {
    acceptedFriends,
    pendingRequests,
  };
}

export { requesteStatus, authorizeStaus, getFriends };
