import { query } from "../utils/db";
import { getAccount } from "./accountHandler";

export const withdrawal = async (accountID: string, amount: number) => {
  const account = await getAccount(accountID);
  account.amount -= amount;
  const res = await query(`
    UPDATE accounts
    SET amount = $1 
    WHERE account_number = $2`,
    [account.amount, accountID]
  );

  if (res.rowCount === 0) {
    throw new Error("Transaction failed");
  }

  return account;
}

export const deposit = async (accountID: string, amount: number) => {
  const account = await getAccount(accountID);
  // Max deposit is 1000
  if (amount > 1000) {
    throw new Error("Deposit amount exceeds the limit of 1000");
  }
  // Max credit deposit cannot take balance above 0
  if (account.type === "credit") {
    if (account.amount + amount > 0) {
      throw new Error("Cannot deposit more than needed to 0 balance for credit account");
    }
  }
  account.amount += amount;
  const res = await query(`
    UPDATE accounts
    SET amount = $1 
    WHERE account_number = $2`,
    [account.amount, accountID]
  );

  if (res.rowCount === 0) {
    throw new Error("Transaction failed");
  }

  return account;
}