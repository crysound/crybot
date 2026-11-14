declare module "*.json?locale" {
  const pack: Record<string, string>;
  export default pack;
  export const missingKeys: string[];
}

declare module "virtual:english-contracts" {
  export const localeKeyCount: number;
  export const englishContracts: Partial<Record<import("./index").LocaleKey, string>>;
}
