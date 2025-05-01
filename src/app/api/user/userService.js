import pool from "@/app/lib/db";

const insertUser = async (userData) => {
  const invalidFields = [];
  if (!userData.firstName) invalidFields.push("First Name");
  if (!userData.lastName) invalidFields.push("Last Name");
  if (!userData.email) invalidFields.push("Email ID");
  if (!userData.password) invalidFields.push("Password");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }
  const command = `INSERT INTO user (first_name, last_name,email,password) VALUES ('${userData.firstName}', '${userData.lastName}', '${userData.email}', '${userData.password}')`;
  const result = await pool.query(command);
  return result;
};

const userLogin = async (validateData) => {
  const invalidFields = [];
  if (!validateData.email) invalidFields.push("Email ID");
  if (!validateData.password) invalidFields.push("Password");
  if (invalidFields.length) {
    return `Invalid fields - ${invalidFields.join(", ")}`;
  }

  const query = `SELECT * FROM user WHERE email = ?`;
  const [rows] = await pool.query(query, [validateData.email]);

  if (rows.length === 0) {
    return "Email is not registered";
  }

  const user = rows[0];

  if (validateData.password === user.password) {
    return "Login successful";
  } else {
    return "Incorrect password";
  }
};

export { insertUser, userLogin };
