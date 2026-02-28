const mongoose = require("mongoose");

function isSameAccount(accountIdA, accountIdB) {
  return String(accountIdA) === String(accountIdB);
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = {
  isSameAccount,
  isValidObjectId,
};
