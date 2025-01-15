import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { commaizeNumber, objectEntries } from '@toss/utils';
import { getDateDistance } from '@toss/date';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import dayjs from 'dayjs';
import { UserStore } from '../../../../../../store';
import { Query } from '../../../../../../hook';
import Box from '../../../../../../component-presentation/Box';
import prependZero from '../../../../../../service/prependZero';
import { colorDown, colorUp } from '../../../../../../config/color';

// constants
const DEFAULT_FLUCTUATION_INTERVAL = 5;
const REMAINING_STOCK_THRESHOLD = 0.9;
const STOCK_PER_USER = 3;
const TOTAL_ROUND_COUNT = 10;

// utils
const getCurrentRoundIndex = (startTime?: string, interval: number = DEFAULT_FLUCTUATION_INTERVAL) => {
  if (startTime === undefined) return -1;

  const distance = getDateDistance(dayjs(startTime).toDate(), new Date());
  return Math.floor(distance.minutes / interval);
};

const getLowSalesCompanies = (
  remainingStocks: Record<string, number>,
  userCount: number,
  stockPerUser = STOCK_PER_USER,
) => {
  const maxQuantity = (userCount ?? 1) * stockPerUser;
  return objectEntries(remainingStocks)
    .filter(([, remaining]) => remaining > maxQuantity * REMAINING_STOCK_THRESHOLD)
    .map(([company]) => company);
};

interface Props {
  stockId: string;
}

const Home = ({ stockId }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: users } = Query.Stock.useUserList(stockId);
  const { data: profiles } = Query.Supabase.useQueryProfileById(users.map((v) => v.userId));
  const { user } = Query.Stock.useUser({ stockId, userId });
  const { allSellPrice, allUserSellPriceDesc } = Query.Stock.useAllSellPrice({ stockId, userId });

  const roundIndex = getCurrentRoundIndex(stock?.startedTime, stock?.fluctuationsInterval);

  // 0-9 랜덤 수를 어떻게 사용하는 게 좋을까? -> 새로고침 했을 때, 변하지 않아야 해
  const randomNumber = useMemo(
    () => (roundIndex >= 0 && roundIndex < TOTAL_ROUND_COUNT - 1 ? Math.floor(Math.random() * 10) : -1),
    [roundIndex],
  );

  if (!user || !stock) {
    return <div>불러오는 중.</div>;
  }

  console.log({ randomNumber });

  const getProfitRatio = (v: number) => ((v / 1000000) * 100 - 100).toFixed(2);

  const allProfitDesc = allUserSellPriceDesc()
    .map(({ userId, allSellPrice }) => {
      const user = users.find((v) => v.userId === userId);
      if (!user) {
        return {
          profit: 0,
          userId,
        };
      }

      return {
        profit: allSellPrice + user.money,
        userId,
      };
    })
    .sort((a, b) => b.profit - a.profit);

  console.log({ stock });
  console.log({ profiles });

  const [partnerIds, myInfos] = objectEntries(stock.companies).reduce(
    (reducer, [company, companyInfos]) => {
      const [partnerIds, myInfos] = reducer;

      companyInfos.forEach((companyInfo, idx) => {
        if (companyInfos[idx].정보.some((name) => name === userId)) {
          const partner = companyInfos[idx].정보.find((name) => name !== userId);
          if (partner && !partnerIds.some((v) => v === partner)) {
            partnerIds.push(partner);
          }
          myInfos.push({
            company,
            price: companyInfo.가격 - companyInfos[idx - 1].가격,
            timeIdx: idx,
          });
        }
      });

      return reducer;
    },
    [[], []] as [Array<string>, Array<{ company: string; timeIdx: number; price: number }>],
  );

  const partnerNicknames = profiles?.data
    ?.map((v) => {
      if (partnerIds.some((partnerId) => partnerId === v.id)) {
        return v.username;
      }

      return undefined;
    })
    .filter((v) => !!v);

  // const companyCount = objectEntries(stock.companies).length ?? 10;

  const lowSalesCompanies = getLowSalesCompanies(stock.remainingStocks, profiles?.data?.length ?? 1);

  const randomCompanyIndex = randomNumber % lowSalesCompanies.length;
  const randomLowSalesCompany = lowSalesCompanies[randomCompanyIndex];

  const priceVariation = Math.abs(
    (stock.companies?.[randomLowSalesCompany]?.[roundIndex + 1]?.가격 ?? 0) -
      (stock.companies?.[randomLowSalesCompany]?.[roundIndex]?.가격 ?? 0),
  );

  console.log({ lowSalesCompanies });
  console.log({ priceVariation });

  return (
    <>
      <H3>홈</H3>
      <Box
        title="진행 시간"
        value={`${prependZero(getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).minutes, 2)}:${prependZero(
          getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).seconds,
          2,
        )}`}
      />
      <Box
        title="잔액"
        value={`${commaizeNumber(user.money)}원`}
        rightComponent={
          stock.isVisibleRank ? (
            <>{users.sort((a, b) => b.money - a.money).findIndex((v) => v.userId === userId) + 1}위</>
          ) : (
            <></>
          )
        }
      />
      <Box
        title="주식 가치"
        value={`${commaizeNumber(allSellPrice)}원`}
        rightComponent={
          stock.isVisibleRank ? <>{allUserSellPriceDesc().findIndex((v) => v.userId === userId) + 1}위</> : <></>
        }
      />
      <Box
        title="모두 팔고 난 뒤의 금액"
        value={`${commaizeNumber(user.money + allSellPrice)}원`}
        rightComponent={stock.isVisibleRank ? <>{allProfitDesc.findIndex((v) => v.userId === userId) + 1}위</> : <></>}
      />
      <Box
        title="모두 팔고 난 뒤의 순이익"
        value={`${getProfitRatio(user.money + allSellPrice)}%`}
        rightComponent={stock.isVisibleRank ? <>{allProfitDesc.findIndex((v) => v.userId === userId) + 1}위</> : <></>}
      />
      <br />
      <H3>내가 가진 정보</H3>
      {myInfos.map(({ company, price, timeIdx }) => {
        return (
          <Box
            key={`${company}_${timeIdx}`}
            title={`${company}`}
            value={`${price >= 0 ? '▲' : '▼'}${commaizeNumber(Math.abs(price))}`}
            valueColor={price >= 0 ? colorUp : colorDown}
            rightComponent={
              <div
                css={css`
                  font-size: 18px;
                `}
              >
                {prependZero(timeIdx * stock.fluctuationsInterval, 2)}:00
              </div>
            }
          />
        );
      })}
      <br />
      <H3>추천 대화상대</H3>
      <ul>
        {partnerNicknames?.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
      <br />
      {randomLowSalesCompany && (
        <>
          <H3>변동 예정 정보</H3>
          <Box
            key={`${randomLowSalesCompany}_${roundIndex + 1}`}
            title={`${randomLowSalesCompany}`}
            value={`?? ${commaizeNumber(Math.abs(priceVariation))}`}
            rightComponent={
              <div
                css={css`
                  font-size: 18px;
                `}
              >
                {prependZero((roundIndex + 1) * stock.fluctuationsInterval, 2)}:00
              </div>
            }
          />
        </>
      )}
      <br />
      <br />
    </>
  );
};

const H3 = styled.h3`
  text-shadow: 2px 2px #8461f8;
`;

export default Home;
