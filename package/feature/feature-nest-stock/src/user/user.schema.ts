import dayjs from 'dayjs';
import {
  StockStorageSchema,
  StockUserForm,
  StockUserInfoSchema,
  StockUserRequired,
  StockUserSchema,
} from 'shared~type-stock';

const INIT_USER_MONEY = 1_000_000;

export class StockUserStorage implements StockStorageSchema {
  companyName: string;

  stockAveragePrice: number;

  stockCountCurrent: number;

  stockCountHistory: Record<string, number>;
}

export class StockUserInfo implements StockUserInfoSchema {
  gender: string;

  nickname: string;

  introduction?: string;
}

export class StockUser implements StockUserSchema {
  stockId: string;

  userId: string;

  userInfo: StockUserInfoSchema;

  index: number;

  money: number;

  lastActivityTime: string;

  loanCount: number;

  stockStorages: StockStorageSchema[];

  resultByRound: number[];

  constructor(required: Pick<StockUserSchema, StockUserRequired>, partial: StockUserForm, companyNames: string[]) {
    this.userId = required.userId;
    this.stockId = required.stockId;
    this.userInfo = required.userInfo;

    this.index = partial.index ?? 0;
    this.money = partial.money ?? INIT_USER_MONEY;
    this.lastActivityTime = dayjs().toISOString();
    this.loanCount = partial.loanCount ?? 0;

    const stockStorages = companyNames.map((company) => {
      return {
        companyName: company,
        stockAveragePrice: 0,
        stockCountCurrent: 0,
        stockCountHistory: { '0': 0, '1': 0, '10': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
      } as StockStorageSchema;
    });

    this.stockStorages = partial.stockStorages ?? stockStorages;
    this.resultByRound = [];
  }
}
