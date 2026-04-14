type PriceSnapshot = {
  yesPrice: number;
  noPrice: number;
};

export function getPrices(yesShares: number, noShares: number): PriceSnapshot {
  const totalShares = yesShares + noShares;
  if (totalShares <= 0) {
    return { yesPrice: 0.5, noPrice: 0.5 };
  }

  return {
    yesPrice: yesShares / totalShares,
    noPrice: noShares / totalShares,
  };
}

export function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}
