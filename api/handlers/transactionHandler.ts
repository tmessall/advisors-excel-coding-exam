import { query } from "../utils/db";
import { getAccount } from "./accountHandler";

export const withdrawal = async (accountID: string, amount: number) => {
  const account = await getAccount(accountID);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }
  if (amount > 200) {
    throw new Error("Withdrawal amount exceeds the limit of 200");
  }
  if (amount % 5 !== 0) {
    throw new Error("Withdrawal amount must be in increments of 5");
  }

  const dailyTotalResult = await query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM withdrawals
    WHERE account_number = $1
      AND created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day'`,
    [accountID]
  );

  const dailyTotal = Number(dailyTotalResult.rows[0].total);
  if (dailyTotal + amount > 400) {
    throw new Error("Withdrawal amount exceeds the daily limit of 400");
  }

  if (account.type === "credit") {
    if (account.amount - amount < -account.credit_limit) {
      throw new Error("Cannot withdraw more than the credit limit");
    }
  } else if (amount > account.amount) {
    throw new Error("Cannot withdraw more than the account balance");
  }

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

  await query(`
    INSERT INTO withdrawals (account_number, amount)
    VALUES ($1, $2)`,
    [accountID, amount]
  );

  return account;
}

export const deposit = async (accountID: string, amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Deposit amount must be greater than 0");
  }
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