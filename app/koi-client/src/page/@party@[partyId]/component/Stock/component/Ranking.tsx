import styled from '@emotion/styled';
import { useAtomValue } from 'jotai';
import { Bookmark, AlignLeft, Share, LogOut } from 'lucide-react';
import { Avatar } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import saveAs from 'file-saver';
// import { GetStockUser } from 'shared~type-stock/Response';
import { commaizeNumber } from '@toss/utils';
import { css } from '@linaria/core';
import { UserStore } from '../../../../../store';
import { Query } from '../../../../../hook';
import { LOCAL_STORAGE_KEY } from '../../../../../config/localStorage';
import { calculateAllPortfolios } from '../../../../../utils/stock';
import DoughnutChart from '../../../../../component-presentation/DoughnutChart';

interface RankingProps {
  stockId: string;
}

function Ranking({ stockId }: RankingProps) {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const { getRound0Avg, getRound12Avg } = Query.Stock.useQueryResult(stockId);

  const { partyId } = useParams();

  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: users } = Query.Stock.useUserList(stockId);
  const { data: party } = Query.Party.useQueryParty(partyId);

  const { mutateAsync: removeStock } = Query.Stock.useRemoveStockSession(stock?._id ?? ''); // 주식게임 방 세션 삭제
  // const { mutateAsync: removeStockUser } = Query.Stock.useRemoveUser(); // 주식게임 방 세션 유저 삭제
  const { mutateAsync: deleteParty } = Query.Party.useDeleteParty(partyId ?? ''); // 방 삭제
  const isHost = party?.authorId === supabaseSession?.user.id;

  const navigate = useNavigate();

  // 방 나가기 핸들러
  async function handleExit() {
    // 방장이면 방 삭제
    // @fixme: window.confirm을 컴포넌트로 대체
    if (isHost && window.confirm('정말 나가시겠습니까? 방이 삭제됩니다.')) {
      await removeStock({ stockId: stock?._id ?? '' });
      await deleteParty({ partyId: partyId ?? '' });
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/');
    } else if (!isHost) {
      // // 방장이 아니면 유저만 삭제
      // await removeStockUser({
      //   stockId: stock?._id ?? '',
      //   userId: supabaseSession?.user.id ?? '',
      // });
      // localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/');
    }
  }

  const captureAreaRef = useRef<HTMLDivElement>(null);

  if (!stock || !supabaseSession) {
    return <></>;
  }

  const userId = supabaseSession.user.id;
  const getRoundAvg = stock.round === 0 ? getRound0Avg : getRound12Avg;
  const roundAvg = getRoundAvg(userId);
  const fluctuation = roundAvg - stock.initialMoney;
  const percentage = Math.round((fluctuation / stock.initialMoney) * 100 * 10) / 10;

  if (!users) {
    return <></>;
  }

  const sortedUser = users ? [...users].sort((a, b) => getRoundAvg(b.userId) - getRoundAvg(a.userId)) : [];
  const rank = sortedUser.findIndex((v) => v.userId === userId) + 1;
  const user = sortedUser.find((v) => v.userId === userId);
  const rankPercentage = Math.floor(Math.max(((rank - 1) / sortedUser.length) * 100, 1));

  const animal =
    percentage < 0
      ? 'hamster'
      : percentage < 100
      ? 'rabbit'
      : percentage < 150
      ? 'cat'
      : percentage < 200
      ? 'dog'
      : percentage < 250
      ? 'wolf'
      : percentage < 300
      ? 'tiger'
      : 'dragon';

  const animalResult =
    animal === 'hamster'
      ? '당돌한 햄스터'
      : animal === 'rabbit'
      ? '순수한 토끼'
      : animal === 'cat'
      ? '세련된 고양이'
      : animal === 'dog'
      ? '활발한 강아지'
      : animal === 'wolf'
      ? '카리스마 늑대'
      : animal === 'tiger'
      ? '타고난 호랑이'
      : '전설적인 드래곤';

  const animalDescription =
    animal === 'hamster'
      ? '겉보기와 달리 대담하고 당돌한 매력을 가진 햄스터예요. 때로는 장난스럽게 속이고 때로는 예측불가한 행동으로 게임의 재미를 한층 더해주는 빌런이에요.'
      : animal === 'rabbit'
      ? '순수하고 친근한 매력으로 주변 사람들과 쉽게 어울리는 토끼예요. 밝은 에너지가 매력적이에요.'
      : animal === 'cat'
      ? '세련된 매력과 독특한 개성으로 사람들의 시선을 사로잡는 고양이예요. 묘한 매력을 풍기며 관심을 끌어요.'
      : animal === 'dog'
      ? '누구와도 잘 어울리고 밝은 에너지로 분위기를 이끄는 강아지예요. 많은 사람들이 함께하고 싶어해요.'
      : animal === 'wolf'
      ? '강한 카리스마와 직관력으로 상대방의 진심을 꿰뚫어보는 늑대예요. 신뢰할 수 있는 파트너가 되어줘요.'
      : animal === 'tiger'
      ? '타고난 리더십으로 팀을 이끌고 신뢰를 쌓아가는 호랑이예요. 함께하면 더 큰 시너지를 만들어낼 수 있어요.'
      : '전설적인 케미의 드래곤이예요. 뛰어난 통찰력과 매력으로 모든 이의 마음을 사로잡고 최고의 팀워크를 만들어요.';

  const portfolios = calculateAllPortfolios({
    companies: stock.companies,
    stockStorages: user?.stockStorages ?? [],
  });
  const portfolioList = Object.entries(portfolios).map(([timeIdx, companyPortfolio]) => {
    const totalStockAmount = Object.values(companyPortfolio).reduce((acc, curr) => acc + curr.stockPrice, 0);
    const portfolioData = Object.entries(companyPortfolio).map(([company, { stockPrice }]) => {
      const stockPriceRatio = Math.round((stockPrice / totalStockAmount) * 100 * 10) / 10;
      return {
        label: `${company} (${stockPriceRatio}%)`,
        value: stockPrice,
      };
    });
    return { portfolioData, timeIdx, totalStockAmount };
  });

  const handleDownload = async () => {
    if (!captureAreaRef.current) return;

    try {
      const div = captureAreaRef.current;
      div.style.backgroundImage = 'url(/background.jpg)';
      const canvas = await html2canvas(div);
      canvas.toBlob((blob) => {
        if (blob !== null) {
          saveAs(blob, 'result.png');
        }
      });
    } catch (error) {
      console.error('Error converting div to image:', error);
    } finally {
      if (captureAreaRef.current) {
        captureAreaRef.current.style.backgroundImage = '';
      }
    }
  };

  const shareData = {
    text: `${user?.userInfo.nickname}님의 순위는 ${rank}위! ${animalResult}입니다! `,
    title: '주식게임결과',
    url: 'https://play.socialdev.club?share=stock',
  };

  const handleShare = async () => {
    try {
      await navigator.share(shareData);
      console.log('Share was successful.');
    } catch (error) {
      console.log('Sharing failed', error);
    }
  };

  return (
    <Container>
      {stock.gameMode !== 'realism' && (
        <>
          <CaptureArea ref={captureAreaRef}>
            <Title>주식게임 결과</Title>
            <Wrapper>
              <Box>
                <BoxContainer>
                  <TitleContainer>
                    <Name>{animalResult}</Name>
                  </TitleContainer>
                  <AnimalImg src={`/animal/${animal}.jpg`} />
                  <Text>{animalDescription}</Text>
                  <Text>
                    순수익 : {commaizeNumber(fluctuation)}원 ({percentage.toFixed(2)}%)
                  </Text>
                  <Text>
                    랭킹 : {rank}위 (상위 {rankPercentage}%)
                  </Text>
                </BoxContainer>
              </Box>
            </Wrapper>
          </CaptureArea>
          <Button
            className={css`
              margin-bottom: 35px;
            `}
            color="#9333EA"
            onClick={() => handleDownload()}
          >
            <Label>이미지 저장</Label>
          </Button>

          <SubTitle>
            <Bookmark size={24} />
            <span>내 순위</span>
          </SubTitle>

          <RankCard color={getRankColor(rank)}>
            <Rank>{rank}</Rank>
            <Avatar size={50} style={{ flexShrink: 0 }}>
              {user?.userInfo.nickname[0]}
            </Avatar>
            <Column align="flex-start">
              <Nickname>{getRankNickname(rank, user?.userInfo.nickname)}</Nickname>
              <AnimalName>{animalResult}</AnimalName>
            </Column>
            <Column align="flex-end">
              <Percentage percent={percentage}>
                {percentage >= 0 ? '+' : ''}
                {percentage}%
              </Percentage>
              <Avg>{roundAvg.toLocaleString()}원</Avg>
            </Column>
          </RankCard>

          <SubTitle>
            <AlignLeft size={24} />
            <span>전체 순위</span>
          </SubTitle>
          {sortedUser.map((user, index) => {
            const userAvg = getRoundAvg(user.userId);
            const userFluctuation = userAvg - stock.initialMoney;
            const userPercentage = Math.round((userFluctuation / stock.initialMoney) * 100 * 10) / 10;
            const animalResult = getAnimalByPercentage(userPercentage);

            return (
              <RankCard key={user.userId} color={getRankColor(index + 1)}>
                <Rank>{index + 1}</Rank>
                <Avatar size={50} style={{ flexShrink: 0 }}>
                  {user.userInfo.nickname[0]}
                </Avatar>
                <Column align="flex-start">
                  <Nickname>{getRankNickname(index + 1, user.userInfo.nickname)}</Nickname>
                  <AnimalName>{animalResult}</AnimalName>
                </Column>
                <Column align="flex-end">
                  <Percentage percent={userPercentage}>
                    {userPercentage >= 0 ? '+' : ''}
                    {userPercentage}%
                  </Percentage>
                  <Avg>{userAvg.toLocaleString()}원</Avg>
                </Column>
              </RankCard>
            );
          })}
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', width: '100%' }}>
        {stock.gameMode === 'realism' &&
          portfolioList.map(({ portfolioData, timeIdx }) => {
            return (
              <div key={timeIdx}>
                <h2 style={{ paddingLeft: '16px' }}>{Number(timeIdx) + 1}년차 포트폴리오</h2>
                <div style={{ width: '100%' }}>
                  <DoughnutChart height="700px" data={portfolioData} containerHeight="500px" />
                </div>
              </div>
            );
          })}
      </div>

      <BottomSection>
        <Button color="#374151" onClick={handleShare}>
          <Share size={24} />
          <Label>공유하기</Label>
        </Button>
        <Button color="#F63C6B" onClick={() => handleExit()}>
          <LogOut size={24} />
          <Label>나가기</Label>
        </Button>
      </BottomSection>
    </Container>
  );
}

export default Ranking;

const RankColorCode = {
  bronze: '205, 127, 50',
  default: '37, 40, 54',
  gold: '213, 161, 30',
  silver: '163, 163, 163',
};

function getRankColor(rank: number) {
  switch (rank) {
    case 1:
      return RankColorCode.gold;
    case 2:
      return RankColorCode.silver;
    case 3:
      return RankColorCode.bronze;
    default:
      return RankColorCode.default;
  }
}

function getRankNickname(rank: number, nickname: string | undefined) {
  switch (rank) {
    case 1:
      return `🥇${nickname}`;
    case 2:
      return `🥈${nickname}`;
    case 3:
      return `🥉${nickname}`;
    default:
      return nickname;
  }
}

function getAnimalByPercentage(percentage: number) {
  if (percentage < 0) return '당돌한 햄스터';
  if (percentage < 100) return '순수한 토끼';
  if (percentage < 150) return '세련된 고양이';
  if (percentage < 200) return '활발한 강아지';
  if (percentage < 250) return '카리스마 늑대';
  if (percentage < 300) return '타고난 호랑이';
  return '전설적인 드래곤';
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100% !important;
  height: 100%;
  gap: 20px;
  padding: 0 16px;
  box-sizing: border-box;
  margin-bottom: 100px;

  @media (max-width: 405px) {
    max-width: 375px;
  }
`;

const SubTitle = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
  gap: 10px;
  font-size: 23px;
  line-height: 135%;
`;

const RankCard = styled.div<{ color: string }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 82px;
  background: ${({ color }) => `rgba(${color}, 0.2)`};
  border-radius: 8px;
  padding: 16px;
  border: 2px solid ${({ color }) => `rgb(${color})`};
  box-sizing: border-box;
  gap: 12px;
`;

const Column = styled.div<{ align: string }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ align }) => align};
  justify-content: center;
  width: 120px;
  gap: 6px;
`;

const Rank = styled.span`
  font-size: 24px;
`;

const Nickname = styled.span`
  font-size: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AnimalName = styled.span`
  font-size: 12px;
`;

const Percentage = styled.span<{ percent: number }>`
  font-size: 25px;
  color: ${({ percent }) => (percent >= 0 ? '#F87171' : '#60A5FA')};
`;

const Avg = styled.span`
  font-size: 12px;
`;

const BottomSection = styled.div`
  display: flex;
  position: absolute;
  bottom: 0;
  left: 0;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  border-top: 1px solid #1d283a;
  background-color: #1d283a;
  border-radius: 8px 8px 0 0;
  gap: 16px;
`;

const Button = styled.button<{ color: string }>`
  background-color: ${({ color }) => color};
  height: 60px;
  font-size: 23px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  width: 100%;
  gap: 10px;
  color: white;
  border: none;
  cursor: pointer;
  padding: 14px;
`;

const Label = styled.span`
  font-size: 23px;
  color: white;
  font-family: 'DungGeunMo';
  white-space: nowrap;
`;

const CaptureArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  width: 100%;
  box-sizing: border-box;
  padding: 35px;
`;

const Box = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;

  box-shadow: 5px 5px #000000;
  background-color: #000084;
`;

const BoxContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 50px 0;
  gap: 16px;
`;

const AnimalImg = styled.img`
  width: 250px;
  height: 250px;
  margin: 16px;
`;

const Text = styled.div`
  width: 250px;
  text-align: center;
  word-break: keep-all;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const Title = styled.div`
  margin-top: 35px;

  font-size: larger;
  text-shadow: 2px 2px #8461f8;
`;

const Name = styled.div`
  font-size: xx-large;
`;
