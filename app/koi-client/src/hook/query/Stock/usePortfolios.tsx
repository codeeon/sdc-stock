import { Query } from '../..';

interface Props {
  stockId: string;
  userId: string;
  currentTimeIndex?: number;
}

// 명시적 타입 선언 (구분용)
type StockCompany = string;
type IndexNumberString = string;

interface StockCountHistory {
  [companyName: StockCompany]: Record<IndexNumberString, number>;
}

interface StockCount {
  stockCount: number;
  totalPrice: number;
}

interface StockPortfolio {
  [companyName: StockCompany]: StockCount;
}

interface StockPortfolios {
  [timeIndex: number]: StockPortfolio;
}

// Clear
// 1. API에서 stockCountHistory 로직을 변경하기 (어차피 portfolio 로직으로 씀 - 계산 수 두 번 줄어듦)
//    -> [timeIdx]마다 계산된 것을 넣는 게 아닌, 계산된 당시 총 보유량을 넣는 것으로 변경하기 (누적 계산)

// TODO:
// 2. 현재 포트폴리오의 계산 로직만 빼서, 컴포넌트에서 사용하거나 커스텀 훅으로 만들기
// 3. 결과 창에서만 전체 포트폴리오 계산하여 구현하기 (계산 로직 1회)

const usePortfolios = ({ stockId, userId, currentTimeIndex }: Props) => {
  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: user } = Query.Stock.useUserFindOne(stockId, userId);

  if (!user || !stock) return { currentPortfolio: {}, portfolios: {} };

  console.log({ stock, user });

  const { companies } = stock;
  const companyNames = Object.keys(companies) as StockCompany[];

  const stockCountHistory = user.stockStorages.reduce((acc, stockStorage) => {
    acc[stockStorage.companyName] = stockStorage.stockCountHistory;
    return acc;
  }, {} as StockCountHistory);

  const portfolios = Object.values(stockCountHistory).reduce((acc, countHistory, index) => {
    if (acc[index] === undefined) {
      acc[index] = {};
    }

    Object.entries(countHistory).forEach(([countIndex, stockCount]) => {
      companyNames.forEach((companyName) => {
        const companyPrice = companies[companyName][Number(countIndex)].가격;
        const totalPrice = stockCount * companyPrice;

        console.log({ companyName, companyPrice, countIndex, stockCount, totalPrice });

        acc[index][companyName] = {
          stockCount,
          totalPrice,
        };
      });
    });

    return acc;
  }, {} as StockPortfolios);

  console.log({ portfolios });

  const currentPortfolio = portfolios[currentTimeIndex ?? 0];

  //  FIXME: 콘솔 제거
  // console.log({ stock, user });
  console.log({ currentPortfolio, portfolios });

  return { currentPortfolio, portfolios };
};

export default usePortfolios;
