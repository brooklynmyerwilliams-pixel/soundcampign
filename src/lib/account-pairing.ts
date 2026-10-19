export type ReferralAccount = {
  id: string;
  is_training: boolean;
  referred_by: string | null;
  username: string;
  display_name: string | null;
  invite_code: string;
  phone: string | null;
};

export function pairAccounts<T extends ReferralAccount>(accounts: T[], adminIds: ReadonlySet<string> = new Set()) {
  const training = accounts.filter((account) => account.is_training);
  const referrerIds = new Set(training.map((account) => account.referred_by));
  const real = accounts.filter((account) => !account.is_training && (!adminIds.has(account.id) || referrerIds.has(account.id)));
  const realIds = new Set(real.map((account) => account.id));
  return [
    ...real.map((referrer) => ({
      key: referrer.id,
      referrer,
      training: training.filter((account) => account.referred_by === referrer.id),
    })),
    ...training.filter((account) => !account.referred_by || !realIds.has(account.referred_by)).map((account) => ({
      key: account.id,
      referrer: accounts.find((candidate) => candidate.id === account.referred_by) ?? null,
      training: [account],
    })),
  ];
}

export function matchesAccount(account: ReferralAccount, query: string) {
  const search = query.trim().toLowerCase();
  return [account.username, account.display_name, account.invite_code, account.phone]
    .some((value) => value?.toLowerCase().includes(search));
}