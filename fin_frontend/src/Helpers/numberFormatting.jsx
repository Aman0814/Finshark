
export const formatLargeMonetaryNumber = (number) => {
  if (number == null || !Number.isFinite(Number(number))) {
    return "N/A";
  }

  if (number < 0) {
    return "-" + formatLargeMonetaryNumber(-1 * number);
  }

  if (number < 1000) {
    return "$" + number;
  } else if (number < 1000000) {
    return "$" + (number / 1000).toFixed(1) + "K";
  } else if (number < 1000000000) {
    return "$" + (number / 1000000).toFixed(1) + "M";
  } else if (number < 1000000000000) {
    return "$" + (number / 1000000000).toFixed(1) + "B";
  } else if (number < 1000000000000000) {
    return "$" + (number / 1000000000000).toFixed(1) + "T";
  }

  return "$" + number;
};

export const formatLargeNonMonetaryNumber = (number) => {
  if (number == null || !Number.isFinite(Number(number))) {
    return "N/A";
  }

  if (number < 0) {
    return "-" + formatLargeNonMonetaryNumber(-1 * number);
  }

  if (number < 1000) {
    return number;
  } else if (number < 1000000) {
    return (number / 1000).toFixed(1) + "K";
  } else if (number < 1000000000) {
    return (number / 1000000).toFixed(1) + "M";
  } else if (number < 1000000000000) {
    return (number / 1000000000).toFixed(1) + "B";
  } else if (number < 1000000000000000) {
    return (number / 1000000000000).toFixed(1) + "T";
  }

  return number;
};

export const formatRatio = (ratio) => {
  if (ratio == null || !Number.isFinite(Number(ratio))) {
    return "N/A";
  }

  return (Math.round(ratio * 100) / 100).toFixed(2);
};
