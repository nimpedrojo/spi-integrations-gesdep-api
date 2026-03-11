import { load } from 'cheerio';

export interface AccountSummary {
  accountId: string;
  balance: number;
  currency: string;
}

/**
 * Example parser that normalizes a simple account summary table to JSON.
 */
export const parseAccountSummary = (html: string): AccountSummary[] => {
  const $ = load(html);
  const rows = $('table#account-summary tbody tr');
  const data: AccountSummary[] = [];

  rows.each((_i, row) => {
    const cells = $(row).find('td');
    data.push({
      accountId: $(cells[0]).text().trim(),
      balance: Number($(cells[1]).text().trim().replace(',', '')),
      currency: $(cells[2]).text().trim()
    });
  });

  return data;
};
